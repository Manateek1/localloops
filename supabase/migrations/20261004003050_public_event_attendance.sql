-- An explicit "going" signal is shared with signed-in members, while profile visibility
-- continues to control whether a member's display name is shown to each other attendee.
create index event_rsvps_going_event_idx
  on public.event_rsvps (event_id)
  where status = 'going';

create policy "Members can see who's going to public community events"
  on public.event_rsvps for select to authenticated
  using (
    status = 'going'
    and exists (
      select 1
      from public.events e
      where e.id = event_id
        and e.visibility = 'public'
    )
  );

create policy "Members can see who's going to public external events"
  on public.external_event_rsvps for select to authenticated
  using (status = 'going');
