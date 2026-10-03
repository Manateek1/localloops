import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

import eventsHandler from './api/events.ts'
import geocodeHandler from './api/geocode.ts'
import voiceTokenHandler from './api/voice-token.ts'

function localApi(): Plugin {
  return {
    name: 'greetme-local-api',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
        const handler = pathname === '/api/events' ? eventsHandler : pathname === '/api/geocode' ? geocodeHandler : pathname === '/api/voice-token' ? voiceTokenHandler : null
        if (!handler) return next()
        const wrapped = {
          setHeader: (name: string, value: string) => response.setHeader(name, value),
          status(code: number) {
            response.statusCode = code
            return wrapped
          },
          json(body: unknown) {
            response.setHeader('Content-Type', 'application/json; charset=utf-8')
            response.end(JSON.stringify(body))
          },
        }
        void handler({ method: request.method, url: request.url }, wrapped).catch(next)
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const localEnv = loadEnv(mode, process.cwd(), '')
    if (!process.env.TICKETMASTER_API_KEY && localEnv.TICKETMASTER_API_KEY) process.env.TICKETMASTER_API_KEY = localEnv.TICKETMASTER_API_KEY
    if (!process.env.NPS_API_KEY && localEnv.NPS_API_KEY) process.env.NPS_API_KEY = localEnv.NPS_API_KEY
    for (const key of ['ELEVENLABS_API_KEY', 'ELEVENLABS_AGENT_ID', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']) {
      if (!process.env[key] && localEnv[key]) process.env[key] = localEnv[key]
    }
  return {
    plugins: [react(), localApi()],
  }
})
