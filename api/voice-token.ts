type VercelRequest = {
  method?: string
  headers?: Record<string, string | string[] | undefined>
}

type VercelResponse = {
  setHeader(name: string, value: string): void
  status(code: number): VercelResponse
  json(body: unknown): void
}

function respond(response: VercelResponse, status: number, body: unknown) {
  response.setHeader('Cache-Control', 'no-store')
  return response.status(status).json(body)
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') return respond(response, 405, { code: 'method_not_allowed', message: 'Use POST.' })

  const authorization = request.headers?.authorization
  const bearer = Array.isArray(authorization) ? authorization[0] : authorization
  const accessToken = bearer?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!accessToken) return respond(response, 401, { code: 'sign_in_required', message: 'Sign in to start a voice chat.' })

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY
  const agentId = process.env.ELEVENLABS_AGENT_ID
  if (!supabaseUrl || !supabaseKey || !elevenLabsKey || !agentId) {
    return respond(response, 503, { code: 'voice_not_configured', message: 'The LocalLoops voice guide is not connected yet.' })
  }

  try {
    const authResponse = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${accessToken}` },
    })
    if (!authResponse.ok) return respond(response, 401, { code: 'sign_in_required', message: 'Your sign-in has expired. Sign in again to talk with the guide.' })

    const tokenUrl = new URL('https://api.elevenlabs.io/v1/convai/conversation/token')
    tokenUrl.searchParams.set('agent_id', agentId)
    const tokenResponse = await fetch(tokenUrl, {
      headers: { 'xi-api-key': elevenLabsKey, Accept: 'application/json' },
    })
    if (!tokenResponse.ok) return respond(response, 502, { code: 'voice_provider_unavailable', message: 'The voice guide could not connect just now. Please try again.' })

    const payload = await tokenResponse.json() as { token?: unknown }
    if (typeof payload.token !== 'string' || !payload.token) {
      return respond(response, 502, { code: 'voice_provider_unavailable', message: 'The voice service returned an invalid session. Please try again.' })
    }
    return respond(response, 200, { token: payload.token })
  } catch {
    return respond(response, 502, { code: 'voice_provider_unavailable', message: 'The voice guide could not connect just now. Please try again.' })
  }
}
