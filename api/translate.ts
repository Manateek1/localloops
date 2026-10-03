type VercelRequest = {
  method?: string
  url?: string
  body?: unknown
}

type VercelResponse = {
  setHeader(name: string, value: string): void
  status(code: number): VercelResponse
  json(body: unknown): void
}

type GoogleTranslateResponse = {
  data?: {
    languages?: Array<{ language?: string; name?: string }>
    translations?: Array<{ translatedText?: string }>
  }
}

function respond(response: VercelResponse, status: number, body: unknown, cache = 'no-store') {
  response.setHeader('Cache-Control', cache)
  return response.status(status).json(body)
}

function apiKey() {
  return process.env.GOOGLE_TRANSLATE_API_KEY
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const url = new URL(request.url ?? '/', 'https://greetme.invalid')
  const listLanguages = request.method === 'GET' && url.searchParams.get('action') === 'languages'
  if (!listLanguages && request.method !== 'POST') return respond(response, 405, { code: 'method_not_allowed' })

  const key = apiKey()
  if (!key) return respond(response, 503, { code: 'translation_not_configured' })

  if (listLanguages) {
    try {
      const languagesUrl = new URL('https://translation.googleapis.com/language/translate/v2/languages')
      languagesUrl.searchParams.set('target', 'en')
      languagesUrl.searchParams.set('key', key)
      const upstream = await fetch(languagesUrl, { headers: { Accept: 'application/json' } })
      if (!upstream.ok) return respond(response, 502, { code: 'translation_unavailable' })
      const payload = await upstream.json() as GoogleTranslateResponse
      const languages = (payload.data?.languages ?? [])
        .filter((item) => item.language && item.name)
        .map((item) => ({ code: item.language!, name: item.name! }))
        .sort((left, right) => left.name.localeCompare(right.name))
      return respond(response, 200, { languages }, 'public, s-maxage=86400, stale-while-revalidate=604800')
    } catch {
      return respond(response, 502, { code: 'translation_unavailable' })
    }
  }

  const body = request.body as { texts?: unknown; target?: unknown } | undefined
  const target = typeof body?.target === 'string' ? body.target : ''
  const texts = Array.isArray(body?.texts) ? body.texts : null
  if (!/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/.test(target) || target.toLowerCase() === 'en') {
    return respond(response, 400, { code: 'invalid_target_language' })
  }
  if (!texts || texts.length < 1 || texts.length > 40 || !texts.every((text) => typeof text === 'string' && text.length > 0 && text.length <= 4500)) {
    return respond(response, 400, { code: 'invalid_text_batch' })
  }
  const totalCharacters = (texts as string[]).reduce((total, text) => total + text.length, 0)
  if (totalCharacters > 4500) return respond(response, 413, { code: 'translation_batch_too_large' })

  try {
    const translationUrl = new URL('https://translation.googleapis.com/language/translate/v2')
    translationUrl.searchParams.set('key', key)
    const upstream = await fetch(translationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ q: texts, target, format: 'text' }),
    })
    if (!upstream.ok) return respond(response, 502, { code: 'translation_unavailable' })
    const payload = await upstream.json() as GoogleTranslateResponse
    const translations = payload.data?.translations
    if (!translations || translations.length !== texts.length || translations.some((item) => typeof item.translatedText !== 'string')) {
      return respond(response, 502, { code: 'translation_unavailable' })
    }
    return respond(response, 200, { translations })
  } catch {
    return respond(response, 502, { code: 'translation_unavailable' })
  }
}
