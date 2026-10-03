-- Allow RSVP and ride records to reference Ticket Fairy event listings.
alter table public.external_event_rsvps
  drop constraint if exists external_event_rsvps_event_source_check;
alter table public.external_event_rsvps
  add constraint external_event_rsvps_event_source_check
  check (event_source in ('ticketmaster', 'nps', 'ticketfairy'));

alter table public.external_ride_posts
  drop constraint if exists external_ride_posts_event_source_check;
alter table public.external_ride_posts
  add constraint external_ride_posts_event_source_check
  check (event_source in ('ticketmaster', 'nps', 'ticketfairy'));
