# GreetMe

GreetMe helps people find public events and neighbors in their area, including rural communities where nearby plans may be spread across several towns. The app searches real listings from Ticketmaster and the National Park Service, shows public gatherings created by GreetMe members, and never fills gaps with sample people or invented events.

Location search accepts a U.S. ZIP code or a town and state, and uses an approximate postal-place center. The map uses OpenFreeMap tiles based on OpenStreetMap data. Search works in all 50 states; listing coverage depends on the event providers and gatherings members publish.

## Run locally

Use a Node.js version supported by Vite 8, then install dependencies and create a local environment file:

```sh
npm install
cp .env.example .env.local
npm run dev
```

The Vite development server also runs the `/api/geocode` and `/api/events` handlers locally. ZIP and town search works without an API key. Without event-provider keys, GreetMe shows a clear empty state and does not invent listings. Sign-in, member profiles, community gatherings, RSVPs, ride coordination, connection requests, and messages need a separately configured GreetMe Supabase project.

## Configure Supabase

Create a new project for GreetMe. Do not point this app at a database used by another product. Copy its project URL and publishable key into `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Apply the checked-in migration using the Supabase CLI:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The migration enables row-level security on every app table. Profiles are visible only to authenticated members who opted into discovery; direct messages require an accepted connection. Members can optionally add a broad town or region and state to be discoverable in that state. GreetMe stores public pickup-area labels, not home addresses or live member coordinates. Configure the Supabase Auth site URL and allowed redirect URLs for local development and each deployed app origin.

## Connect real event sources

Create API keys in the providers' developer portals and add them only as server environment variables:

```dotenv
TICKETMASTER_API_KEY=...
NPS_API_KEY=...
```

- [Ticketmaster Discovery API](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/) returns organizer listings around the searched coordinates.
- [National Park Service API](https://www.nps.gov/subjects/developer/api-documentation.htm) contributes dated NPS events with published coordinates.

In Vercel, set these as server-side environment variables. Never prefix them with `VITE_`; the browser calls GreetMe's `/api/events` function and does not receive either key. The map and place search need no key. Each event card names its source and links back to the original listing. Provider coverage is not a complete catalog of every county fair, library program, or small-town event, so GreetMe also lets signed-in members publish real public gatherings.

## Deploy to Vercel

Import this repository into Vercel with the Vite framework preset. Add the Supabase URL and publishable key as `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, then add the event-provider keys above as server-only variables. Apply the Supabase migration and set Auth redirect URLs before inviting members. Vercel builds the Vite app and deploys the `api/` handlers as serverless functions.

## Scope

GreetMe has email/password sign-in, profiles, opt-in member discovery, connection requests, accepted-connection messages, public community events, event RSVPs, and public-place ride coordination. The large sprout character is the friendly product guide; AI, Gemma, and ElevenLabs are intentionally not connected yet.
