import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

import eventsHandler from './api/events.ts'
import geocodeHandler from './api/geocode.ts'
import translateHandler from './api/translate.ts'
import guideHandler from './api/guide.ts'

function localApi(): Plugin {
  return {
    name: 'localloops-local-api',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
        const handler = pathname === '/api/events' ? eventsHandler : pathname === '/api/geocode' ? geocodeHandler : pathname === '/api/translate' ? translateHandler : pathname === '/api/guide' ? guideHandler : null
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
        const invoke = () => { void handler({ method: request.method, url: request.url }, wrapped).catch(next) }
        if (!['/api/translate', '/api/guide'].includes(pathname) || request.method !== 'POST') {
          invoke()
          return
        }

        const chunks: Buffer[] = []
        let bytes = 0
        let tooLarge = false
        request.on('data', (chunk: Buffer | string) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
          bytes += buffer.length
          if (bytes > (pathname === '/api/guide' ? 1_100_000 : 32 * 1024)) {
            tooLarge = true
            return
          }
          chunks.push(buffer)
        })
        request.on('end', () => {
          if (tooLarge) {
            response.statusCode = 413
            response.setHeader('Content-Type', 'application/json; charset=utf-8')
            response.end(JSON.stringify({ code: 'request_too_large' }))
            return
          }
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
            const handler = pathname === '/api/guide' ? guideHandler : translateHandler
            void handler({ method: request.method, url: request.url, body }, wrapped).catch(next)
          } catch {
            response.statusCode = 400
            response.setHeader('Content-Type', 'application/json; charset=utf-8')
            response.end(JSON.stringify({ code: 'invalid_json' }))
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const localEnv = loadEnv(mode, process.cwd(), '')
    if (!process.env.TICKETMASTER_API_KEY && localEnv.TICKETMASTER_API_KEY) process.env.TICKETMASTER_API_KEY = localEnv.TICKETMASTER_API_KEY
    if (!process.env.NPS_API_KEY && localEnv.NPS_API_KEY) process.env.NPS_API_KEY = localEnv.NPS_API_KEY
    for (const key of ['GEMINI_API_KEY', 'ELEVENLABS_API_KEY', 'GOOGLE_TRANSLATE_API_KEY', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']) {
      if (!process.env[key] && localEnv[key]) process.env[key] = localEnv[key]
    }
  return {
    plugins: [react(), localApi()],
  }
})
