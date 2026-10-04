-- Initial LocalLoops product data model. External listings are fetched from their named sources.
-- Every table is protected by RLS; authenticated grants are paired with narrow policies.

create table public.localloops_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  avatar_url text,
  bio text check (bio is null or char_length(bio) <= 280),
  home_region text,
  state_code text check (state_code is null or state_code ~ '^[A-Z]{2}$'),
  interests text[] not null default '{}',
  discoverable boolean not null default false,
  created_at timestamptz not null default now()
);

comment on column public.localloops_profiles.home_region is
  'Broad town or region label only. Never store a home address or precise member location.';
comment on column public.localloops_profiles.state_code is
  'Optional U.S. state filter for local discovery. No member coordinates or exact address are stored.';

create table public.localloops_events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  mode text not null check (mode in ('city', 'rural')),
  visibility text not null default 'public' check (visibility = 'public'),
  category text not null default 'Community' check (char_length(category) between 1 and 40),
  region_label text not null,
  venue_label text not null,
  state_code text not null check (state_code ~ '^[A-Z]{2}$'),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  source_name text,
  source_url text,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

comment on table public.localloops_events is
  'User-created public community gatherings. Third-party event listings stay in their source APIs.';

create table public.localloops_event_rsvps (
  event_id uuid not null references public.localloops_events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('going', 'interested')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table public.localloops_external_event_rsvps (
  event_source text not null check (event_source in ('ticketmaster', 'nps')),
  source_event_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('going', 'interested')),
  created_at timestamptz not null default now(),
  primary key (event_source, source_event_id, user_id)
);

create table public.localloops_friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create table public.localloops_messages (
  id uuid primary key default gen_random_uuid(),
  friendship_id uuid not null references public.localloops_friendships (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

comment on table public.localloops_messages is
  'Direct localloops_messages are readable and writable by accepted friendship participants only.';

create table public.localloops_ride_posts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.localloops_events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('request', 'offer')),
  pickup_area text not null,
  seats_available smallint,
  created_at timestamptz not null default now(),
  check (
    (kind = 'offer' and seats_available is not null and seats_available between 1 and 5)
    or (kind = 'request' and seats_available is null)
  ),
  unique (event_id, user_id)
);

create table public.localloops_external_ride_posts (
  id uuid primary key default gen_random_uuid(),
  event_source text not null check (event_source in ('ticketmaster', 'nps')),
  source_event_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('request', 'offer')),
  pickup_area text not null check (char_length(pickup_area) between 2 and 100),
  seats_available smallint,
  created_at timestamptz not null default now(),
  check (
    (kind = 'offer' and seats_available is not null and seats_available between 1 and 5)
    or (kind = 'request' and seats_available is null)
  ),
  unique (event_source, source_event_id, user_id)
);

comment on column public.localloops_ride_posts.pickup_area is
  'Broad public pickup area such as a town center. Never store a street address.';

create table public.localloops_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  event_id uuid references public.localloops_events (id) on delete cascade,
  kind text not null check (kind in ('event_alert', 'friend_request', 'message')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index localloops_event_rsvps_user_id_idx on public.localloops_event_rsvps (user_id);
create index localloops_events_starts_at_idx on public.localloops_events (starts_at);
create index localloops_messages_friendship_created_idx on public.localloops_messages (friendship_id, created_at desc);
create index localloops_ride_posts_event_created_idx on public.localloops_ride_posts (event_id, created_at desc);
create index localloops_notifications_recipient_created_idx on public.localloops_notifications (recipient_id, created_at desc);

alter table public.localloops_profiles enable row level security;
alter table public.localloops_events enable row level security;
alter table public.localloops_event_rsvps enable row level security;
alter table public.localloops_external_event_rsvps enable row level security;
alter table public.localloops_friendships enable row level security;
alter table public.localloops_messages enable row level security;
alter table public.localloops_ride_posts enable row level security;
alter table public.localloops_external_ride_posts enable row level security;
alter table public.localloops_notifications enable row level security;

-- Start with no role access, then grant only authenticated operations backed by policies below.
revoke all on table
  public.localloops_profiles,
  public.localloops_events,
  public.localloops_event_rsvps,
  public.localloops_external_event_rsvps,
  public.localloops_friendships,
  public.localloops_messages,
  public.localloops_ride_posts,
  public.localloops_external_ride_posts,
  public.localloops_notifications
from public, anon, authenticated, service_role;

grant select on public.localloops_profiles to authenticated;
grant insert (id, display_name, avatar_url, bio, home_region, state_code, interests, discoverable)
  on public.localloops_profiles to authenticated;
grant select on public.localloops_events to authenticated;
grant insert (host_id, title, description, starts_at, ends_at, mode, visibility, category, region_label, venue_label, state_code, latitude, longitude, source_name, source_url)
  on public.localloops_events to authenticated;
grant select on public.localloops_events to anon;
grant select, delete on public.localloops_event_rsvps to authenticated;
grant select, insert, delete on public.localloops_external_event_rsvps to authenticated;
grant update (status) on public.localloops_external_event_rsvps to authenticated;
grant select, delete on public.localloops_friendships to authenticated;
grant select on public.localloops_messages to authenticated;
grant select, delete on public.localloops_ride_posts to authenticated;
grant select, insert, delete on public.localloops_external_ride_posts to authenticated;
grant select on public.localloops_notifications to authenticated;

grant update (display_name, avatar_url, bio, home_region, state_code, interests, discoverable)
  on public.localloops_profiles to authenticated;
grant update (title, description, starts_at, ends_at, mode, visibility, category, region_label, venue_label, state_code, latitude, longitude, source_name, source_url)
  on public.localloops_events to authenticated;
grant update (status) on public.localloops_event_rsvps to authenticated;
grant insert (event_id, user_id, status) on public.localloops_event_rsvps to authenticated;
grant insert (requester_id, addressee_id) on public.localloops_friendships to authenticated;
grant update (status, accepted_at) on public.localloops_friendships to authenticated;
grant insert (friendship_id, sender_id, body) on public.localloops_messages to authenticated;
grant insert (event_id, user_id, kind, pickup_area, seats_available)
  on public.localloops_ride_posts to authenticated;
grant update (kind, pickup_area, seats_available) on public.localloops_ride_posts to authenticated;
grant update (kind, pickup_area, seats_available) on public.localloops_external_ride_posts to authenticated;
grant insert (event_source, source_event_id, user_id, status) on public.localloops_external_event_rsvps to authenticated;
grant insert (event_source, source_event_id, user_id, kind, pickup_area, seats_available)
  on public.localloops_external_ride_posts to authenticated;
grant update (read_at) on public.localloops_notifications to authenticated;

create policy "Discoverable localloops_profiles are visible to signed-in members"
  on public.localloops_profiles for select to authenticated
  using (discoverable or (select auth.uid()) = id);

create policy "Accepted connections can see one another's localloops_profiles"
  on public.localloops_profiles for select to authenticated
  using (exists (
    select 1 from public.localloops_friendships f
    where f.status = 'accepted'
      and ((f.requester_id = (select auth.uid()) and f.addressee_id = id)
        or (f.addressee_id = (select auth.uid()) and f.requester_id = id))
  ));

create policy "Members create their own profile"
  on public.localloops_profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "Members update their own profile"
  on public.localloops_profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Signed-in members can read public localloops_events"
  on public.localloops_events for select to authenticated
  using (visibility = 'public');

create policy "Visitors can read public community localloops_events"
  on public.localloops_events for select to anon
  using (visibility = 'public');

create policy "Members host public localloops_events as themselves"
  on public.localloops_events for insert to authenticated
  with check ((select auth.uid()) = host_id and visibility = 'public');

create policy "Hosts update their own public localloops_events"
  on public.localloops_events for update to authenticated
  using ((select auth.uid()) = host_id)
  with check ((select auth.uid()) = host_id and visibility = 'public');

create policy "Members can read their own RSVP for a public community event"
  on public.localloops_event_rsvps for select to authenticated
  using ((select auth.uid()) = user_id and exists (
    select 1 from public.localloops_events e where e.id = event_id and e.visibility = 'public'
  ));

create policy "Members RSVP for themselves to public localloops_events"
  on public.localloops_event_rsvps for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.localloops_events e
      where e.id = event_id and e.visibility = 'public'
    )
  );

create policy "Members update their own public-event RSVP"
  on public.localloops_event_rsvps for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.localloops_events e
      where e.id = event_id and e.visibility = 'public'
    )
  );

create policy "Members remove their own RSVP"
  on public.localloops_event_rsvps for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Members can read their own external event RSVPs"
  on public.localloops_external_event_rsvps for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Members RSVP to real external localloops_events as themselves"
  on public.localloops_external_event_rsvps for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Members update their own external event RSVP"
  on public.localloops_external_event_rsvps for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Members remove their own external event RSVP"
  on public.localloops_external_event_rsvps for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Friendship participants can read their request"
  on public.localloops_friendships for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create policy "Members send a friend request as themselves"
  on public.localloops_friendships for insert to authenticated
  with check (
    (select auth.uid()) = requester_id
    and requester_id <> addressee_id
    and status = 'pending'
  );

create policy "Recipients accept pending friend requests"
  on public.localloops_friendships for update to authenticated
  using ((select auth.uid()) = addressee_id and status = 'pending')
  with check ((select auth.uid()) = addressee_id and status = 'accepted');

create policy "Participants can dismiss a pending friend request"
  on public.localloops_friendships for delete to authenticated
  using (
    status = 'pending'
    and (select auth.uid()) in (requester_id, addressee_id)
  );

create policy "Accepted friends can read their localloops_messages"
  on public.localloops_messages for select to authenticated
  using (exists (
    select 1 from public.localloops_friendships f
    where f.id = friendship_id
      and f.status = 'accepted'
      and (select auth.uid()) in (f.requester_id, f.addressee_id)
  ));

create policy "Accepted friends can send localloops_messages as themselves"
  on public.localloops_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.localloops_friendships f
      where f.id = friendship_id
        and f.status = 'accepted'
        and (select auth.uid()) in (f.requester_id, f.addressee_id)
    )
  );

create policy "Members can read ride coordination for public localloops_events"
  on public.localloops_ride_posts for select to authenticated
  using (exists (
    select 1 from public.localloops_events e
    where e.id = event_id and e.visibility = 'public'
  ));

create policy "Members post their own ride interest for public localloops_events"
  on public.localloops_ride_posts for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.localloops_events e
      where e.id = event_id and e.visibility = 'public'
    )
  );

create policy "Members update their own ride post"
  on public.localloops_ride_posts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.localloops_events e
      where e.id = event_id and e.visibility = 'public'
    )
  );

create policy "Members remove their own ride post"
  on public.localloops_ride_posts for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Members can read external event ride posts"
  on public.localloops_external_ride_posts for select to authenticated
  using (true);

create policy "Members post their own external event ride coordination"
  on public.localloops_external_ride_posts for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Members update their own external event ride post"
  on public.localloops_external_ride_posts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Members remove their own external event ride post"
  on public.localloops_external_ride_posts for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Members read their own localloops_notifications"
  on public.localloops_notifications for select to authenticated
  using ((select auth.uid()) = recipient_id);

create policy "Members mark their own localloops_notifications as read"
  on public.localloops_notifications for update to authenticated
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);

-- Create a LocalLoops profile only after a person uses LocalLoops with this shared Auth project.
create function public.localloops_ensure_profile(p_display_name text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_display_name text := left(btrim(coalesce(p_display_name, '')), 60);
begin
  if v_user_id is null then
    raise exception 'Sign in to set up your LocalLoops profile.' using errcode = '42501';
  end if;
  if v_display_name = '' then
    v_display_name := left(coalesce(nullif(split_part(coalesce(auth.jwt() ->> 'email', 'Neighbor'), '@', 1), ''), 'Neighbor'), 60);
  end if;

  insert into public.localloops_profiles (id, display_name)
  values (
    v_user_id,
    v_display_name
  )
  on conflict (id) do nothing;
end;
$$;

revoke all on function public.localloops_ensure_profile(text) from public, anon, service_role;
grant execute on function public.localloops_ensure_profile(text) to authenticated;
