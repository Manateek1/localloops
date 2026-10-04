-- This project shares Supabase Auth with LARP Chat AI. Keep LARP's existing
-- public.profiles onboarding behavior, but do not create a LARP profile for a
-- user who signs up through LocalLoops.
do $$
begin
  if to_regprocedure('public.handle_new_user()') is not null
    and exists (
      select 1
      from pg_catalog.pg_trigger t
      join pg_catalog.pg_class c on c.oid = t.tgrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'auth'
        and c.relname = 'users'
        and t.tgname = 'on_auth_user_created'
        and t.tgfoid = to_regprocedure('public.handle_new_user()')
        and not t.tgisinternal
    )
    and exists (
      select 1 from pg_catalog.pg_proc p
      where p.oid = to_regprocedure('public.handle_new_user()')
        and position('insert into public.profiles' in lower(p.prosrc)) > 0
    )
  then
    execute $ddl$
      create or replace function public.handle_new_user()
      returns trigger
      language plpgsql
      security definer
      set search_path = ''
      as $body$
      begin
        if new.raw_user_meta_data ->> 'localloops_app' = 'true' then
          return new;
        end if;

        insert into public.profiles (id, email, display_name, plan)
        values (
          new.id,
          new.email,
          coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)),
          'free'
        )
        on conflict (id) do update
        set email = excluded.email,
            display_name = coalesce(excluded.display_name, public.profiles.display_name);

        return new;
      end;
      $body$;
    $ddl$;
  end if;
end;
$$;
