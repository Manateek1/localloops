-- Repair profile schemas created before LocalLoops added the bio field.
alter table public.localloops_profiles
  add column if not exists bio text
  check (bio is null or char_length(bio) <= 280);

-- Preserve the existing self-service profile write model for this column.
grant insert (bio) on table public.localloops_profiles to authenticated;
grant update (bio) on table public.localloops_profiles to authenticated;

-- Make the new column visible through the Supabase Data API immediately.
notify pgrst, 'reload schema';
