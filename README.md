# LocalLoops

**LocalLoops** connects neighbors and surfaces real gatherings across local and rural communities. While city dwellers have countless event apps, rural residents often live 20 to 70 miles apart and rely on fragmented cork boards or word of mouth. LocalLoops bridges that distance—uniting neighbors around shared passions, community carpooling, and hands-free conversational voice AI—while fiercely protecting rural privacy.

---

## 🌟 Key Features

### 🌲 1. Purpose-Built for Rural Communities
- **County & Region Matching (Zero Address Leakage)**: Matches members by broad county or region (e.g., *Shenandoah County, VA*), never exact GPS pins, street addresses, or ZIP codes.
- **Extended Rural Radius (25–100 Miles)**: In rural counties, a neighbor or event 35 miles away in the next valley is considered local. The search radius easily expands to encompass regional hubs.
- **Rural Ride Coordination & Carpooling**: Overcomes rural transit deserts by letting attendees offer or request rides from safe public meeting points.
- **Shared Passions Matching**: Community directory automatically highlights shared rural interests (e.g., *Local Food Security, Gardening & Seed Swapping, Trail Stewardship, Live Acoustic Music, Outdoor Skills*).

### 🎙️ 2. Sprout AI — Conversational Voice Companion
- **Hands-Free Voice Discovery**: Especially accessible for older residents or hands-busy neighbors. Tap the mic to speak naturally and hear spoken recommendations about upcoming gatherings.
- **Dual AI Engine**: Powered by **Grok 4.6 on Microsoft Azure AI Foundry** for intelligent event and community reasoning, paired with **ElevenLabs Text-to-Speech** for warm, lifelike audio.
- **Multi-Language Support**: Translates community listings and spoken interactions using Google Cloud Translation.

### 🤝 3. Safe, Mutual-Consent Community Connections
- **Opt-In Directory**: Members choose whether they appear in the local public directory.
- **Safe Handshakes**: Private messaging only unlocks after *both* neighbors accept a connection request—preventing spam and harassment.
- **Real Community Gatherings**: Members can start local groups, host gatherings at verified public venues, and RSVP.

---

## 🚀 Quick Start (Run Locally)

LocalLoops requires a Node.js version supported by Vite 8 (Node 20+ recommended).

```sh
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local

# 3. Start local development server
npm run dev
