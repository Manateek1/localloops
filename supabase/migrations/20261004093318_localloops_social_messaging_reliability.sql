-- Merge duplicate requests for the same pair without dropping conversation history.
with ranked_friendships as (
  select
    friendship.id,
    first_value(friendship.id) over (
      partition by least(friendship.requester_id, friendship.addressee_id),
        greatest(friendship.requester_id, friendship.addressee_id)
      order by friendship.created_at, friendship.id
    ) as keeper_id,
    bool_or(friendship.status = 'accepted') over (
      partition by least(friendship.requester_id, friendship.addressee_id),
        greatest(friendship.requester_id, friendship.addressee_id)
    ) as has_accepted,
    min(friendship.accepted_at) filter (where friendship.status = 'accepted') over (
      partition by least(friendship.requester_id, friendship.addressee_id),
        greatest(friendship.requester_id, friendship.addressee_id)
    ) as accepted_at
  from public.localloops_friendships as friendship
)
update public.localloops_friendships as keeper
set status = 'accepted',
    accepted_at = coalesce(ranked.accepted_at, now())
from ranked_friendships as ranked
where keeper.id = ranked.keeper_id
  and ranked.has_accepted
  and keeper.status <> 'accepted';

with ranked_friendships as (
  select
    friendship.id,
    first_value(friendship.id) over (
      partition by least(friendship.requester_id, friendship.addressee_id),
        greatest(friendship.requester_id, friendship.addressee_id)
      order by friendship.created_at, friendship.id
    ) as keeper_id
  from public.localloops_friendships as friendship
)
update public.localloops_messages as message
set friendship_id = ranked.keeper_id
from ranked_friendships as ranked
where message.friendship_id = ranked.id
  and ranked.id <> ranked.keeper_id;

with ranked_friendships as (
  select
    friendship.id,
    first_value(friendship.id) over (
      partition by least(friendship.requester_id, friendship.addressee_id),
        greatest(friendship.requester_id, friendship.addressee_id)
      order by friendship.created_at, friendship.id
    ) as keeper_id
  from public.localloops_friendships as friendship
)
delete from public.localloops_friendships as duplicate
using ranked_friendships as ranked
where duplicate.id = ranked.id
  and ranked.id <> ranked.keeper_id;

-- Keep one connection row per unordered pair, even if older clients send in both directions.
create unique index localloops_friendships_unique_pair_idx
  on public.localloops_friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

drop policy if exists "Members send a friend request as themselves"
  on public.localloops_friendships;
create policy "Members send a friend request to a discoverable member"
  on public.localloops_friendships for insert to authenticated
  with check (
    (select auth.uid()) = requester_id
    and requester_id <> addressee_id
    and status = 'pending'
    and exists (
      select 1 from localloops.profiles as recipient
      where recipient.id = addressee_id and recipient.discoverable
    )
  );

create or replace function public.localloops_send_connection_request(p_addressee_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_requester_id uuid := auth.uid();
  v_friendship_id uuid;
  v_existing_requester_id uuid;
  v_existing_addressee_id uuid;
  v_status text;
begin
  if v_requester_id is null then
    raise exception 'Sign in to connect with a neighbor.' using errcode = '42501';
  end if;
  if p_addressee_id is null or p_addressee_id = v_requester_id then
    raise exception 'Choose another member to connect with.' using errcode = '22023';
  end if;

  -- Serialize requests for this pair so simultaneous, reversed requests become one connection.
  perform pg_advisory_xact_lock(hashtextextended(
    least(v_requester_id::text, p_addressee_id::text) || ':' ||
      greatest(v_requester_id::text, p_addressee_id::text),
    0
  ));

  select friendship.id, friendship.requester_id, friendship.addressee_id, friendship.status
    into v_friendship_id, v_existing_requester_id, v_existing_addressee_id, v_status
    from public.localloops_friendships as friendship
    where (friendship.requester_id = v_requester_id and friendship.addressee_id = p_addressee_id)
      or (friendship.requester_id = p_addressee_id and friendship.addressee_id = v_requester_id)
    limit 1;

  if found then
    if v_status = 'pending' and v_existing_addressee_id = v_requester_id then
      update public.localloops_friendships
        set status = 'accepted', accepted_at = now()
        where id = v_friendship_id
          and addressee_id = v_requester_id
          and status = 'pending';
    end if;
    return v_friendship_id;
  end if;

  insert into public.localloops_friendships (requester_id, addressee_id)
    values (v_requester_id, p_addressee_id)
    returning id into v_friendship_id;
  return v_friendship_id;
end;
$$;

revoke all on function public.localloops_send_connection_request(uuid) from public, anon, service_role;
grant execute on function public.localloops_send_connection_request(uuid) to authenticated;

-- Realtime delivers friend-request changes and direct messages to connected clients.
-- The underlying table RLS policies still limit changes to the participants.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'localloops_friendships'
    ) then
      execute 'alter publication supabase_realtime add table public.localloops_friendships';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'localloops_messages'
    ) then
      execute 'alter publication supabase_realtime add table public.localloops_messages';
    end if;
  end if;
end;
$$;
