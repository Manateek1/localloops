# Greet Meet

Created for Dublin Hacx, Greet Meet explores how shared interests can lead to local events, new connections, and active plans. This mobile-first prototype includes an urban city experience and a rural mode connecting nearby towns, local calendars, libraries, Parks & Rec, and public-event ride coordination.

For the team's plain-language feature request and review process, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Run the prototype

```sh
npm install
npm run dev
```

The demo uses fictional San Francisco/Oakland and Foothill communities data. Search, filters, map/list view, mode switching, RSVPs, ride interest/offers, friend requests, accepted-friend DMs, notifications, and the community guide all run in local React state. Refreshing resets the sample interactions.

The guide is a local simulation. Its original helper-robot/dumpling character is a static image, and its voice control simulates listening without requesting microphone access. No external AI, live event search, push notification, or authentication service is connected.

## Supabase foundation

The repo contains a Supabase CLI config, an initial migration, typed `supabase-js` client scaffolding, and `.env.example`. The browser demo does not need project credentials. To prepare a local environment later, copy `.env.example` to `.env.local` and fill in a project URL and publishable key. Never put a secret/service-role key in a browser environment variable.

The migration adds profiles, public events, RSVPs, friendships, messages, ride posts, and notifications. RLS is enabled on every table. Anonymous access is not granted; authenticated access is limited by ownership, public-event context, or friendship participation. Message policies require an accepted friendship. Profile and ride-location fields store only broad region or pickup-area labels, not home addresses or precise member coordinates. The local Supabase config sets `auto_expose_new_tables = false`.

No Supabase project was linked and no migration was applied remotely. Authentication, hosted project connection, event search, AI, push notifications, and the app's data mutations remain for the team to iterate on. Add any future Data API grant together with its matching RLS policies after the team settles the product access model.

## Design references

- Approved concept: [`design/greet-meet-approved-board.png`](design/greet-meet-approved-board.png)
- Design tokens and responsive structure: [`design/design-system.md`](design/design-system.md)
- Community guide character: [`public/images/leaf-guide.png`](public/images/leaf-guide.png)
