-- An explicit "going" signal is shared with signed-in members, while profile visibility
-- continues to control whether a member's display name is shown to each other attendee.
create index localloops_event_rsvps_going_event_idx
  on public.localloops_event_rsvps (event_id)
  where status = 'going';

create policy "Members can see who's going to public community events"
  on public.localloops_event_rsvps for select to authenticated
  using (
    status = 'going'
    and exists (
      select 1
      from public.localloops_events e
      where e.id = localloops_event_rsvps.event_id
        and e.visibility = 'public'
    )
  );

create policy "Members can see who's going to public external events"
  on public.localloops_external_event_rsvps for select to authenticated
  using (status = 'going');
