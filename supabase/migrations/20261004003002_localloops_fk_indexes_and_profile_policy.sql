-- Index LocalLoops foreign keys for user/event cleanup and common lookups.
create index if not exists localloops_communities_created_by_idx
  on public.localloops_communities (created_by);
create index if not exists localloops_events_host_id_idx
  on public.localloops_events (host_id);
create index if not exists localloops_external_event_rsvps_user_id_idx
  on public.localloops_external_event_rsvps (user_id);
create index if not exists localloops_external_ride_posts_user_id_idx
  on public.localloops_external_ride_posts (user_id);
create index if not exists localloops_friendships_addressee_id_idx
  on public.localloops_friendships (addressee_id);
create index if not exists localloops_messages_sender_id_idx
  on public.localloops_messages (sender_id);
create index if not exists localloops_notifications_actor_id_idx
  on public.localloops_notifications (actor_id);
create index if not exists localloops_notifications_event_id_idx
  on public.localloops_notifications (event_id);
create index if not exists localloops_ride_posts_user_id_idx
  on public.localloops_ride_posts (user_id);

-- Combine the two authorized-read rules into one policy to avoid overlapping permissive policies.
drop policy if exists "Discoverable localloops_profiles are visible to signed-in members"
  on localloops.profiles;
drop policy if exists "Accepted connections can see one another's localloops_profiles"
  on localloops.profiles;
create policy "Members can read profiles they are allowed to see"
  on localloops.profiles for select to authenticated
  using (
    discoverable
    or (select auth.uid()) = id
    or exists (
      select 1 from public.localloops_friendships f
      where f.status = 'accepted'
        and ((f.requester_id = (select auth.uid()) and f.addressee_id = id)
          or (f.addressee_id = (select auth.uid()) and f.requester_id = id))
    )
  );
