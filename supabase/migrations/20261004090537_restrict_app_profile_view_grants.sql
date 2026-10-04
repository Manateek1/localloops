-- Public compatibility views must not inherit broader public-schema defaults.
-- Their underlying app tables still enforce the same RLS policies.
revoke all on table public.profiles from public, anon, authenticated, service_role;
grant select on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

revoke all on table public.localloops_profiles from public, anon, authenticated, service_role;
grant select on table public.localloops_profiles to authenticated;
grant insert (id, display_name, avatar_url, bio, home_region, state_code, interests, discoverable)
  on table public.localloops_profiles to authenticated;
grant update (display_name, avatar_url, bio, home_region, state_code, interests, discoverable)
  on table public.localloops_profiles to authenticated;
