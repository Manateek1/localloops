-- Qualify the outer profile ID so the friendship subquery compares user IDs,
-- rather than accidentally comparing against localloops_friendships.id.
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
