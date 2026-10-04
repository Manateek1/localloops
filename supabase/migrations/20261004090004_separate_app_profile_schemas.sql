-- Keep the shared Supabase Auth identities in auth.users while each app owns
-- its own profile table. Moving the tables preserves their rows and RLS.
create schema if not exists localloops;
create schema if not exists larpchatai;

grant usage on schema localloops to anon, authenticated, service_role;
grant usage on schema larpchatai to anon, authenticated, service_role;

do $migration$
declare
  public_kind "char";
begin
  if to_regclass('localloops.profiles') is null then
    if to_regclass('public.localloops_profiles') is null then
      raise exception 'Expected the existing LocalLoops profile table before moving it';
    end if;
    alter table public.localloops_profiles set schema localloops;
    alter table localloops.localloops_profiles rename to profiles;
  elsif to_regclass('public.localloops_profiles') is not null then
    select c.relkind into public_kind
    from pg_class c where c.oid = to_regclass('public.localloops_profiles');
    if public_kind <> 'v' then
      raise exception 'Both public.localloops_profiles and localloops.profiles exist; refusing to choose between them';
    end if;
  end if;

  if to_regclass('larpchatai.profiles') is null
    and to_regclass('public.profiles') is not null then
    select c.relkind into public_kind
    from pg_class c where c.oid = to_regclass('public.profiles');
    if public_kind not in ('r', 'p') then
      raise exception 'public.profiles exists but is not a table; inspect it before moving LARP profiles';
    end if;
    alter table public.profiles set schema larpchatai;
  elsif to_regclass('larpchatai.profiles') is not null
    and to_regclass('public.profiles') is not null then
    select c.relkind into public_kind
    from pg_class c where c.oid = to_regclass('public.profiles');
    if public_kind <> 'v' then
      raise exception 'Both public.profiles and larpchatai.profiles exist; refusing to choose between them';
    end if;
  end if;
end;
$migration$;

-- Keep each app's data in its own table and preserve RLS on the moved tables.
alter table localloops.profiles enable row level security;

drop policy if exists "Discoverable localloops_profiles are visible to signed-in members"
  on localloops.profiles;
drop policy if exists "Accepted connections can see one another's localloops_profiles"
  on localloops.profiles;
drop policy if exists "Members can read profiles they are allowed to see"
  on localloops.profiles;
create policy "Members can read profiles they are allowed to see"
  on localloops.profiles for select to authenticated
  using (
    discoverable
    or (select auth.uid()) = profiles.id
    or exists (
      select 1
      from public.localloops_friendships as friendship
      where friendship.status = 'accepted'
        and (
          (friendship.requester_id = (select auth.uid())
            and friendship.addressee_id = profiles.id)
          or (friendship.addressee_id = (select auth.uid())
            and friendship.requester_id = profiles.id)
        )
    )
  );

revoke all on table localloops.profiles from public, anon, authenticated, service_role;
grant select on table localloops.profiles to authenticated;
grant insert (id, display_name, avatar_url, bio, home_region, state_code, interests, discoverable)
  on table localloops.profiles to authenticated;
grant update (display_name, avatar_url, bio, home_region, state_code, interests, discoverable)
  on table localloops.profiles to authenticated;

-- These security-invoker views keep already-deployed app builds working while
-- the new builds switch to their dedicated schemas.
do $views$
begin
  if to_regclass('larpchatai.profiles') is not null then
    execute $ddl$
      create or replace view public.profiles
      with (security_invoker = true)
      as select * from larpchatai.profiles
    $ddl$;
    grant select on public.profiles to authenticated;
    grant all on public.profiles to service_role;
  end if;
end;
$views$;

create or replace view public.localloops_profiles
with (security_invoker = true)
as select * from localloops.profiles;

grant select on public.localloops_profiles to authenticated;
grant insert (id, display_name, avatar_url, bio, home_region, state_code, interests, discoverable)
  on public.localloops_profiles to authenticated;
grant update (display_name, avatar_url, bio, home_region, state_code, interests, discoverable)
  on public.localloops_profiles to authenticated;

create or replace function public.localloops_ensure_profile(p_display_name text default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_display_name text := left(btrim(coalesce(p_display_name, '')), 60);
begin
  if v_user_id is null then
    raise exception 'Sign in to set up your LocalLoops profile.' using errcode = '42501';
  end if;
  if v_display_name = '' then
    v_display_name := left(coalesce(nullif(split_part(coalesce(auth.jwt() ->> 'email', 'Neighbor'), '@', 1), ''), 'Neighbor'), 60);
  end if;

  insert into localloops.profiles (id, display_name)
  values (v_user_id, v_display_name)
  on conflict (id) do nothing;
end;
$function$;

do $user_trigger$
begin
  if to_regprocedure('public.handle_new_user()') is not null
    and to_regclass('larpchatai.profiles') is not null then
    execute $ddl$
      create or replace function public.handle_new_user()
      returns trigger
      language plpgsql
      security definer
      set search_path = ''
      as $function$
      begin
        if new.raw_user_meta_data ->> 'localloops_app' = 'true' then
          return new;
        end if;

        insert into larpchatai.profiles (id, email, display_name, plan)
        values (
          new.id,
          new.email,
          coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)),
          'free'
        )
        on conflict (id) do update
        set email = excluded.email,
            display_name = coalesce(excluded.display_name, larpchatai.profiles.display_name);

        return new;
      end;
      $function$
    $ddl$;
    execute 'revoke all on function public.handle_new_user() from public, anon, authenticated, service_role';
  end if;
end;
$user_trigger$;

do $profile_grants$
begin
  if to_regclass('larpchatai.profiles') is not null then
    revoke all on table larpchatai.profiles from public, anon, authenticated, service_role;
    grant select on table larpchatai.profiles to authenticated;
    grant all on table larpchatai.profiles to service_role;
  end if;
end;
$profile_grants$;

-- The authenticator setting is the supported database-level override for the
-- schemas PostgREST accepts in Accept-Profile and Content-Profile headers.
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, localloops, larpchatai';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
