import { getGuideConfigStatus, handleGuideRequest } from '../server/guide.ts'

type VercelRequest = {
  method?: string
  ip?: string
  headers?: Record<string, string | string[] | undefined>
  body?: unknown
}
type VercelResponse = {
  setHeader(name: string, value: string): void
  status(code: number): VercelResponse
  json(body: unknown): void
}

declare const process: { env: Record<string, string | undefined> }

const WINDOW_MS = 60 * 60 * 1000
const REQUESTS_PER_WINDOW = 20
const MAX_BODY_BYTES = 32 * 1024
const requestWindows = new Map<string, { startedAt: number; count: number }>()

function respond(response: VercelResponse, status: number, body: unknown) {
  response.setHeader('Cache-Control', 'no-store')
  return response.status(status).json(body)
}

function header(request: VercelRequest, name: string) {
  const value = request.headers?.[name] ?? request.headers?.[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

function isRateLimited(request: VercelRequest) {
  const forwardedFor = header(request, 'x-forwarded-for')
  const client = request.ip || forwardedFor?.split(',')[0]?.trim() || 'unknown-client'
  const now = Date.now()
  const window = requestWindows.get(client)
  if (!window || now - window.startedAt >= WINDOW_MS) {
    requestWindows.set(client, { startedAt: now, count: 1 })
    if (requestWindows.size > 5000) {
      for (const [key, value] of requestWindows) {
        if (now - value.startedAt >= WINDOW_MS) requestWindows.delete(key)
      }
    }
    return false
  }
  if (window.count >= REQUESTS_PER_WINDOW) return true
  window.count += 1
  return false
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  const secrets = {
    AZURE_FOUNDRY_ENDPOINT: process.env.AZURE_FOUNDRY_ENDPOINT,
    AZURE_FOUNDRY_API_KEY: process.env.AZURE_FOUNDRY_API_KEY,
    AZURE_FOUNDRY_DEPLOYMENT: process.env.AZURE_FOUNDRY_DEPLOYMENT,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  }

  if (request.method === 'GET') return respond(response, 200, getGuideConfigStatus(secrets))
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'GET, POST')
    return respond(response, 405, { error: 'Use GET or POST for the voice guide.' })
  }
  if (isRateLimited(request)) return respond(response, 429, { error: 'The voice guide is taking a short break. Try again later.' })

  try {
    const bodyBytes = new TextEncoder().encode(JSON.stringify(request.body ?? null)).byteLength
    if (bodyBytes > MAX_BODY_BYTES) return respond(response, 413, { error: 'That recording was too long. Please try a shorter question.' })
    const result = await handleGuideRequest(request.body, secrets)
    return respond(response, result.status, result.body)
  } catch {
    return respond(response, 500, { error: 'The voice guide could not answer just now. Please try again.' })
  }
}
