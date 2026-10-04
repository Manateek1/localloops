-- Public interest groups are separate from one-to-one friendships and messages.
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 500),
  region_label text check (region_label is null or char_length(region_label) <= 100),
  created_by uuid not null references auth.users (id) on delete cascade,
  member_count smallint not null default 0 check (member_count between 0 and 50),
  created_at timestamptz not null default now()
);

comment on table public.communities is
  'Discoverable LocalLoops interest groups; distinct from direct friend messages.';
comment on column public.communities.region_label is
  'Broad town or region label only. Never store a home address or precise member location.';

create table public.community_members (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create index community_members_user_id_idx on public.community_members (user_id, joined_at desc);
create index communities_created_at_idx on public.communities (created_at desc);

alter table public.events
  add column community_id uuid references public.communities (id) on delete set null;
create index events_community_starts_at_idx on public.events (community_id, starts_at);

alter table public.communities enable row level security;
alter table public.community_members enable row level security;

revoke all on table public.communities, public.community_members
  from public, anon, authenticated, service_role;

-- Community discovery exposes only group details and a member count, not creator IDs.
grant select (id, name, description, region_label, member_count, created_at)
  on public.communities to anon, authenticated;
grant select on public.community_members to authenticated;
grant insert (community_id) on public.events to authenticated;
grant update (community_id) on public.events to authenticated;

create policy "Anyone can discover public communities"
  on public.communities for select to anon, authenticated
  using (true);

create policy "Members can read their own community memberships"
  on public.community_members for select to authenticated
  using ((select auth.uid()) = user_id);

-- Keep the public count accurate for creates, joins, leaves, and account deletion.
create function public.maintain_community_member_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.communities
      set member_count = member_count + 1
      where id = new.community_id and member_count < 50;
    if not found then
      raise exception 'This community has reached its 50 member limit.' using errcode = '23514';
    end if;
    return new;
  end if;

  update public.communities
    set member_count = greatest(member_count - 1, 0)
    where id = old.community_id;
  return old;
end;
$$;

revoke all on function public.maintain_community_member_count() from public, anon, authenticated, service_role;

create trigger maintain_community_member_count_after_insert
  after insert on public.community_members
  for each row execute function public.maintain_community_member_count();
create trigger maintain_community_member_count_after_delete
  after delete on public.community_members
  for each row execute function public.maintain_community_member_count();

-- Creation and membership changes are atomic; a row lock prevents concurrent joins
-- from taking a community past its 50 person limit.
create function public.create_community(
  p_name text,
  p_description text,
  p_region_label text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_description text := btrim(coalesce(p_description, ''));
  v_region text := nullif(btrim(coalesce(p_region_label, '')), '');
  v_community_id uuid;
begin
  if v_user_id is null then
    raise exception 'Sign in to create a community.' using errcode = '42501';
  end if;
  if char_length(v_name) not between 2 and 80 then
    raise exception 'Community names must be between 2 and 80 characters.' using errcode = '22023';
  end if;
  if char_length(v_description) > 500 then
    raise exception 'Community descriptions must be 500 characters or less.' using errcode = '22023';
  end if;
  if v_region is not null and char_length(v_region) > 100 then
    raise exception 'The broad area must be 100 characters or less.' using errcode = '22023';
  end if;

  insert into public.communities (name, description, region_label, created_by)
    values (v_name, v_description, v_region, v_user_id)
    returning id into v_community_id;
  insert into public.community_members (community_id, user_id, role)
    values (v_community_id, v_user_id, 'owner');
  return v_community_id;
end;
$$;

create function public.join_community(p_community_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_member_count integer;
begin
  if v_user_id is null then
    raise exception 'Sign in to join a community.' using errcode = '42501';
  end if;

  select member_count into v_member_count
    from public.communities where id = p_community_id for update;
  if not found then
    raise exception 'This community no longer exists.' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.community_members
      where community_id = p_community_id and user_id = v_user_id
  ) then
    return v_member_count;
  end if;
  if v_member_count >= 50 then
    raise exception 'This community has reached its 50 member limit.' using errcode = '23514';
  end if;

  insert into public.community_members (community_id, user_id, role)
    values (p_community_id, v_user_id, 'member');
  select member_count into v_member_count from public.communities where id = p_community_id;
  return v_member_count;
end;
$$;

create function public.leave_community(p_community_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_member_count integer;
begin
  if v_user_id is null then
    raise exception 'Sign in to leave a community.' using errcode = '42501';
  end if;

  select created_by, member_count into v_owner_id, v_member_count
    from public.communities where id = p_community_id for update;
  if not found then
    raise exception 'This community no longer exists.' using errcode = 'P0002';
  end if;
  if v_owner_id = v_user_id then
    raise exception 'Community organizers cannot leave their own community.' using errcode = '42501';
  end if;

  delete from public.community_members
    where community_id = p_community_id and user_id = v_user_id;
  select member_count into v_member_count from public.communities where id = p_community_id;
  return v_member_count;
end;
$$;

revoke all on function public.create_community(text, text, text) from public, anon, service_role;
revoke all on function public.join_community(uuid) from public, anon, service_role;
revoke all on function public.leave_community(uuid) from public, anon, service_role;
grant execute on function public.create_community(text, text, text) to authenticated;
grant execute on function public.join_community(uuid) to authenticated;
grant execute on function public.leave_community(uuid) to authenticated;

-- Events attached to a community may only be hosted by a member, after the group
-- has its second member. Existing non-community public events keep their behavior.
drop policy if exists "Members host public events as themselves" on public.events;
create policy "Members host public events as themselves"
  on public.events for insert to authenticated
  with check (
    (select auth.uid()) = host_id
    and visibility = 'public'
    and (
      community_id is null
      or exists (
        select 1 from public.communities c
        where c.id = events.community_id and c.member_count >= 2
          and exists (
            select 1 from public.community_members m
            where m.community_id = c.id and m.user_id = (select auth.uid())
          )
      )
    )
  );

drop policy if exists "Hosts update their own public events" on public.events;
create policy "Hosts update their own public events"
  on public.events for update to authenticated
  using ((select auth.uid()) = host_id)
  with check (
    (select auth.uid()) = host_id
    and visibility = 'public'
    and (
      community_id is null
      or exists (
        select 1 from public.communities c
        where c.id = events.community_id and c.member_count >= 2
          and exists (
            select 1 from public.community_members m
            where m.community_id = c.id and m.user_id = (select auth.uid())
          )
      )
    )
  );
