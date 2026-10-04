-- Public compatibility views must not inherit broader public-schema defaults.
-- A standalone LocalLoops database may not have the optional LARP view yet.
-- Their underlying app tables still enforce the same RLS policies.
do $grants$
begin
  if to_regclass('public.profiles') is not null then
    execute 'revoke all on table public.profiles from public, anon, authenticated, service_role';
    execute 'grant select on table public.profiles to authenticated';
    execute 'grant all on table public.profiles to service_role';
  end if;

  if to_regclass('public.localloops_profiles') is not null then
    execute 'revoke all on table public.localloops_profiles from public, anon, authenticated, service_role';
    execute 'grant select on table public.localloops_profiles to authenticated';
    execute 'grant insert (id, display_name, avatar_url, bio, home_region, state_code, interests, discoverable)
      on table public.localloops_profiles to authenticated';
    execute 'grant update (display_name, avatar_url, bio, home_region, state_code, interests, discoverable)
      on table public.localloops_profiles to authenticated';
  end if;
end;
$grants$;
