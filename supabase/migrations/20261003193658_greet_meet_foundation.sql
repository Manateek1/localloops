-- Greet Meet's initial data model. The UI currently uses local sample data.
-- Every table is protected by RLS; authenticated grants are paired with narrow policies.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  avatar_url text,
  bio text check (bio is null or char_length(bio) <= 280),
  home_region text,
  discoverable boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column public.profiles.home_region is
  'Broad town or region label only. Never store a home address or precise member location.';

create table public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  mode text not null check (mode in ('city', 'rural')),
  visibility text not null default 'public' check (visibility = 'public'),
  region_label text not null,
  venue_label text not null,
  source_name text,
  source_url text,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

comment on table public.events is
  'Public community events only in this prototype. Private event scheduling is deferred.';

create table public.event_rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('going', 'interested')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  friendship_id uuid not null references public.friendships (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

comment on table public.messages is
  'Future policies must allow messages only between participants after friendship acceptance.';

create table public.ride_posts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('request', 'offer')),
  pickup_area text not null,
  seats_available smallint,
  created_at timestamptz not null default now(),
  check (
    (kind = 'offer' and seats_available is not null and seats_available between 1 and 5)
    or (kind = 'request' and seats_available is null)
  )
);

comment on column public.ride_posts.pickup_area is
  'Broad public pickup area such as a town center. Never store a street address.';

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  event_id uuid references public.events (id) on delete cascade,
  kind text not null check (kind in ('event_alert', 'friend_request', 'message')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index event_rsvps_user_id_idx on public.event_rsvps (user_id);
create index messages_friendship_created_idx on public.messages (friendship_id, created_at desc);
create index ride_posts_event_created_idx on public.ride_posts (event_id, created_at desc);
create index notifications_recipient_created_idx on public.notifications (recipient_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.friendships enable row level security;
alter table public.messages enable row level security;
alter table public.ride_posts enable row level security;
alter table public.notifications enable row level security;

-- Start with no role access, then grant only authenticated operations backed by policies below.
revoke all on table
  public.profiles,
  public.events,
  public.event_rsvps,
  public.friendships,
  public.messages,
  public.ride_posts,
  public.notifications
from public, anon, authenticated, service_role;

grant select on public.profiles to authenticated;
grant insert (id, display_name, avatar_url, bio, home_region, discoverable)
  on public.profiles to authenticated;
grant select on public.events to authenticated;
grant insert (host_id, title, description, starts_at, ends_at, mode, region_label, venue_label, source_name, source_url)
  on public.events to authenticated;
grant select, delete on public.event_rsvps to authenticated;
grant select, delete on public.friendships to authenticated;
grant select on public.messages to authenticated;
grant select, delete on public.ride_posts to authenticated;
grant select on public.notifications to authenticated;

grant update (display_name, avatar_url, bio, home_region, discoverable)
  on public.profiles to authenticated;
grant update (title, description, starts_at, ends_at, mode, region_label, venue_label, source_name, source_url)
  on public.events to authenticated;
grant update (status) on public.event_rsvps to authenticated;
grant insert (event_id, user_id, status) on public.event_rsvps to authenticated;
grant insert (requester_id, addressee_id) on public.friendships to authenticated;
grant update (status, accepted_at) on public.friendships to authenticated;
grant insert (friendship_id, sender_id, body) on public.messages to authenticated;
grant insert (event_id, user_id, kind, pickup_area, seats_available)
  on public.ride_posts to authenticated;
grant update (kind, pickup_area, seats_available) on public.ride_posts to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "Discoverable profiles are visible to signed-in members"
  on public.profiles for select to authenticated
  using (discoverable or (select auth.uid()) = id);

create policy "Members create their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "Members update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Signed-in members can read public events"
  on public.events for select to authenticated
  using (visibility = 'public');

create policy "Members host public events as themselves"
  on public.events for insert to authenticated
  with check ((select auth.uid()) = host_id and visibility = 'public');

create policy "Hosts update their own public events"
  on public.events for update to authenticated
  using ((select auth.uid()) = host_id)
  with check ((select auth.uid()) = host_id and visibility = 'public');

create policy "Members can read RSVPs for public events"
  on public.event_rsvps for select to authenticated
  using (exists (
    select 1 from public.events e
    where e.id = event_id and e.visibility = 'public'
  ));

create policy "Members RSVP for themselves to public events"
  on public.event_rsvps for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.visibility = 'public'
    )
  );

create policy "Members update their own public-event RSVP"
  on public.event_rsvps for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.visibility = 'public'
    )
  );

create policy "Members remove their own RSVP"
  on public.event_rsvps for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Friendship participants can read their request"
  on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create policy "Members send a friend request as themselves"
  on public.friendships for insert to authenticated
  with check (
    (select auth.uid()) = requester_id
    and requester_id <> addressee_id
    and status = 'pending'
  );

create policy "Recipients accept pending friend requests"
  on public.friendships for update to authenticated
  using ((select auth.uid()) = addressee_id and status = 'pending')
  with check ((select auth.uid()) = addressee_id and status = 'accepted');

create policy "Participants can dismiss a pending friend request"
  on public.friendships for delete to authenticated
  using (
    status = 'pending'
    and (select auth.uid()) in (requester_id, addressee_id)
  );

create policy "Accepted friends can read their messages"
  on public.messages for select to authenticated
  using (exists (
    select 1 from public.friendships f
    where f.id = friendship_id
      and f.status = 'accepted'
      and (select auth.uid()) in (f.requester_id, f.addressee_id)
  ));

create policy "Accepted friends can send messages as themselves"
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.friendships f
      where f.id = friendship_id
        and f.status = 'accepted'
        and (select auth.uid()) in (f.requester_id, f.addressee_id)
    )
  );

create policy "Members can read ride coordination for public events"
  on public.ride_posts for select to authenticated
  using (exists (
    select 1 from public.events e
    where e.id = event_id and e.visibility = 'public'
  ));

create policy "Members post their own ride interest for public events"
  on public.ride_posts for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.visibility = 'public'
    )
  );

create policy "Members update their own ride post"
  on public.ride_posts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.visibility = 'public'
    )
  );

create policy "Members remove their own ride post"
  on public.ride_posts for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Members read their own notifications"
  on public.notifications for select to authenticated
  using ((select auth.uid()) = recipient_id);

create policy "Members mark their own notifications as read"
  on public.notifications for update to authenticated
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);
