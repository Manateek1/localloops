# LocalLoops

LocalLoops helps people find public events and neighbors in their area, including rural communities where nearby plans may be spread across several towns. The app searches real listings from Ticketmaster and the National Park Service, shows public gatherings created by LocalLoops members, and never fills gaps with sample people or invented events.

Location search accepts a U.S. ZIP code or a town and state, and uses an approximate postal-place center. The map uses OpenFreeMap tiles based on OpenStreetMap data. Search works in all 50 states; listing coverage depends on the event providers and gatherings members publish.

## Run locally

Use a Node.js version supported by Vite 8, then install dependencies and create a local environment file:

```sh
npm install
cp .env.example .env.local
npm run dev
```

The Vite development server also runs the `/api` handlers locally. ZIP and town search works without an API key. Without event-provider keys, LocalLoops shows a clear empty state and does not invent listings. Sign-in, member profiles, community gatherings, RSVPs, ride coordination, connection requests, and member messages need a separately configured LocalLoops Supabase project.

## Configure Supabase

Create a new project for LocalLoops. Do not point this app at a database used by another product. Copy its project URL and publishable key into `.env.local`:

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

The migration enables row-level security on every app table. Profiles are visible only to authenticated members who opted into discovery; direct messages require an accepted connection. Members can optionally add a broad town or region and state to be discoverable in that state. LocalLoops stores public pickup-area labels, not home addresses or live member coordinates. Configure the Supabase Auth site URL and allowed redirect URLs for local development and each deployed app origin.

## Connect real event sources

Create API keys in the providers' developer portals and add them only as server environment variables:

```dotenv
TICKETMASTER_API_KEY=...
NPS_API_KEY=...
```

- [Ticketmaster Discovery API](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/) returns organizer listings around the searched coordinates.
- [National Park Service API](https://www.nps.gov/subjects/developer/api-documentation.htm) contributes dated NPS events with published coordinates.

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

Import this repository into Vercel with the Vite framework preset. Add the Supabase URL and publishable key as `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, then add event-provider and voice keys as server-only variables. Apply the Supabase migration and set Auth redirect URLs before inviting members. Vercel builds the Vite app and deploys the `api/` handlers as serverless functions.

## Scope

LocalLoops has email/password sign-in, profiles, opt-in member discovery, connection requests, accepted-connection messages, public community events, event RSVPs, and public-place ride coordination. The large sprout character is Leafy, the voice guide. The guide uses Gemini for spoken questions and answers, and ElevenLabs for speech synthesis; browser speech synthesis provides a fallback.
