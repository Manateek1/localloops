-- Ride coordination has been removed from LocalLoops. Dropping these tables
-- permanently removes previously shared ride requests, seat offers, and pickup areas.
drop table if exists public.localloops_ride_posts;
drop table if exists public.localloops_external_ride_posts;

-- Reapply the narrow authenticated privileges required for the event attendance
-- queries and RSVP upserts. RLS policies continue to control which rows members
-- can see and modify.
grant select, delete on table public.localloops_event_rsvps to authenticated;
grant insert (event_id, user_id, status) on table public.localloops_event_rsvps to authenticated;
grant update (status) on table public.localloops_event_rsvps to authenticated;

revoke insert on table public.localloops_external_event_rsvps from authenticated;
grant select, delete on table public.localloops_external_event_rsvps to authenticated;
grant insert (event_source, source_event_id, user_id, status)
  on table public.localloops_external_event_rsvps to authenticated;
grant update (status) on table public.localloops_external_event_rsvps to authenticated;

notify pgrst, 'reload schema';
