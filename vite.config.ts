import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

import eventsHandler from './api/events.ts'
import geocodeHandler from './api/geocode.ts'

function localApi(): Plugin {
  return {
    name: 'greetme-local-api',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
        const handler = pathname === '/api/events' ? eventsHandler : pathname === '/api/geocode' ? geocodeHandler : null
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
  return {
    plugins: [react(), localApi()],
  }
})
