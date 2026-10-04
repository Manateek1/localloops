# LocalLoops

LocalLoops helps people find public events and neighbors in their area, including rural communities where nearby plans may be spread across several towns. It searches live listings from Ticket Fairy and, when their keys are configured, Ticketmaster and the National Park Service. Members can host public gatherings and mark that they are going; LocalLoops never fills gaps with sample people or invented events.

Location search accepts a U.S. street address, ZIP code, or town and state. Street addresses are matched by the U.S. Census Geocoder; ZIP and town searches use approximate postal-place centers. The default radius is 30 miles, with options to narrow it to 20 miles or search farther. Search works across all 50 states, but event coverage depends on provider inventory and member posts. Ticket Fairy's public API returns state-filtered listings, so the app checks up to five pages per state and maps only events inside the chosen radius. The map uses OpenFreeMap tiles based on OpenStreetMap data.

## Run locally

Use a Node.js version supported by Vite 8, then install dependencies and create a local environment file:

```sh
npm install
cp .env.example .env.local
npm run dev
```

The Vite development server also runs the `/api/geocode` and `/api/events` handlers locally. Address, ZIP, and town search needs no API key. Ticket Fairy is the no-key live event source; Ticketmaster and National Park Service are optional key-backed sources. Sign-in, member profiles, gatherings, shared attendance, ride coordination, connection requests, and messages need a Supabase URL, publishable key, matching project ref, and the checked-in migrations.

## Configure Supabase

Use a dedicated Supabase project for LocalLoops when available. Its migrations create only `localloops_`-prefixed tables and RPCs, and its signup trigger skips other products' profile creation. Copy the URL, publishable key, and project ref into `.env.local`. The app checks that the URL's project ref matches the configured ref before it enables accounts, which prevents accidentally connecting LocalLoops to a different project.

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_REF=YOUR_PROJECT_REF
```

For immediate email/password signup without verification, turn off **Confirm email** in the project's Supabase Auth email provider settings. Hosted Supabase projects require email confirmation by default; local Supabase uses the checked-in setting `enable_confirmations = false`.

Apply the checked-in migration using the Supabase CLI:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The migrations enable row-level security on every app table. A member's “I'm going” status is visible to signed-in members; display names follow profile discovery and connection settings. Profiles are visible only to members who opted into discovery, plus accepted connections. Nearby events are ranked using a member's saved interests and their past community-event attendance. Direct messages require an accepted connection. Members can optionally add a broad town or region and state to be discoverable in that state. Search addresses are not saved, and LocalLoops stores public meetup coordinates and place names, not home addresses or live member locations. Configure the Supabase Auth site URL and allowed redirect URLs for local development and each deployed app origin.

## Connect real event sources

Ticket Fairy's live public event API needs no key. To add the optional Ticketmaster and NPS sources, create their API keys and add them only as server environment variables:

```dotenv
TICKETMASTER_API_KEY=...
NPS_API_KEY=...
```

- [Ticket Fairy's public event API](https://www.ticketfairy.com/developers) supplies live public listings without an account or key. Its public listing filters by state and has pagination; LocalLoops fetches at most five pages (up to 1,000 results) from the next 120 days, then filters by distance.
- [Ticketmaster Discovery API](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/) can return listings around the searched coordinates when `TICKETMASTER_API_KEY` is set.
- [National Park Service API](https://www.nps.gov/subjects/developer/api-documentation.htm) contributes dated NPS events when `NPS_API_KEY` is set.

In Vercel, set these as server-side environment variables. Never prefix them with `VITE_`; the browser calls the `/api/events` function and does not receive either key. The map and place search need no key. Each event card names its source and links back to the original listing. Provider coverage is not a complete catalog of every county fair, library program, or small-town event, so LocalLoops also lets signed-in members publish real public gatherings.

## Voice guide

The guide is voice-only: people tap **Talk to Leafy**, speak, and hear a spoken response. It does not render a text chat or transcript. The browser asks for microphone permission only after the button is tapped, records up to 15 seconds, and sends the recording to the server-side `/api/guide` handler. Use the deployed HTTPS URL or `localhost`; if the microphone is blocked, allow it in the browser's site settings.

Set these server-only environment variables in `.env.local` for local development and in Vercel for deployment. Never prefix either key with `VITE_`:

```dotenv
GEMINI_API_KEY=...
ELEVENLABS_API_KEY=...
```

Create the Gemini key in Google AI Studio on the free tier, without linking billing. The guide uses `gemini-3.5-flash` to understand the recording and produce a short spoken answer. It receives the selected approximate area and up to eight public event listings; it does not receive member profiles or precise coordinates. The API request opts out of saving interaction records. Gemini's free tier has rate limits, and Google says free-tier prompts may be used to improve its products. If its free quota is unavailable or exhausted, the guide reports that and does not switch to a paid tier. See [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing) and [audio input formats](https://ai.google.dev/gemini-api/docs/audio).

Create an ElevenLabs personal API key with text-to-speech permission only and set it as `ELEVENLABS_API_KEY`. The server sends only Gemini's short reply to ElevenLabs and plays the returned audio. Speech uses the credits already included in the account plan; if ElevenLabs is unavailable or out of credits, the browser's built-in voice reads the same answer. Keep automatic top-up disabled if you do not want the ElevenLabs account to buy more credits. See [ElevenLabs API keys](https://elevenlabs.io/docs/overview/administration/workspaces/api-keys) and [text-to-speech API](https://elevenlabs.io/docs/api-reference/text-to-speech/stream).

The selected site language is sent to Gemini for its spoken answer. The recognized words are kept in short-term browser memory to support follow-up questions; LocalLoops does not display or save a transcript. Gemini and ElevenLabs process the audio or generated reply to provide the service.

## Translate the site

LocalLoops defaults to English. The header language picker translates public interface and event text with Google Cloud Translation. Private profile fields, member names, pickup-area notes, and direct messages are excluded. The full Google language list appears when the translation API is configured; a common-language list remains available before then.

Create a Google Cloud API key, enable Cloud Translation API, and set `GOOGLE_TRANSLATE_API_KEY` as a server-only environment variable in `.env.local` or Vercel. Restrict the key to Cloud Translation API and set an API quota before deploying. A billing-enabled project is required. Google's current pricing applies a monthly $10 credit to the first 500,000 text characters, then charges $20 per million characters for Cloud Translation Basic. See [Google Cloud setup](https://docs.cloud.google.com/translate/docs/setup) and [current pricing](https://cloud.google.com/products/translate/pricing). Without the key, the picker stays available, but the page remains in English with a setup notice.

## Deploy to Vercel

Import this repository into Vercel with the Vite framework preset. Add the Supabase URL, publishable key, and matching project ref as `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_SUPABASE_PROJECT_REF`, then add event-provider and voice keys as server-only variables. Apply the Supabase migrations and set Auth redirect URLs before inviting members. Vercel builds the Vite app and deploys the `api/` handlers as serverless functions.

## Scope

LocalLoops has email/password sign-in, profiles, opt-in member discovery, connection requests, accepted-connection messages, public community events, shared “I'm going” attendance, and public-place ride coordination. The large sprout character is Leafy, the voice guide. The guide uses Gemini for spoken questions and answers, and ElevenLabs for speech synthesis; browser speech synthesis provides a fallback.
