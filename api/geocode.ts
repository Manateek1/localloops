type VercelRequest = { method?: string; url?: string }
type VercelResponse = {
  setHeader(name: string, value: string): void
  status(code: number): VercelResponse
  json(body: unknown): void
}

const states: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO',
  connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID',
  illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA',
  maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
  mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR',
  pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD',
  tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA',
  'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC',
}

function stateCode(input: string) {
  const normalized = input.trim().toLowerCase()
  if (/^[a-z]{2}$/i.test(normalized)) return normalized.toUpperCase()
  return states[normalized] ?? ''
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
  if (request.method !== 'GET') return response.status(405).json({ error: 'Use GET.' })

  const url = new URL(request.url ?? '/', 'https://localloops.invalid')
  const query = (url.searchParams.get('q') ?? '').trim().replace(/\s+/g, ' ')
  if (query.length < 3 || query.length > 100) {
    return response.status(400).json({ error: 'Enter a ZIP code or a town and state.' })
  }

  let lookupUrl: string
  if (/^\d{5}$/.test(query)) {
    lookupUrl = `https://api.zippopotam.us/us/${query}`
  } else {
    const parts = query.split(',')
    const city = parts.slice(0, -1).join(',').trim()
    const state = stateCode(parts.at(-1) ?? '')
    if (!city || !state) {
      return response.status(400).json({ error: 'For a town search, include its state (for example, “Asheville, NC”).' })
    }
    lookupUrl = `https://api.zippopotam.us/us/${state.toLowerCase()}/${encodeURIComponent(city)}`
  }

  try {
    const upstream = await fetch(lookupUrl, { headers: { Accept: 'application/json' } })
    if (upstream.status === 404) return response.status(404).json({ error: 'No U.S. place matched that search. Check the ZIP code and state.' })
    if (!upstream.ok) throw new Error(`Place lookup returned ${upstream.status}`)
    const payload = await upstream.json() as {
      'post code'?: string
      state?: string
      'state abbreviation'?: string
      places?: Array<Record<string, string>>
    }
    const place = payload.places?.[0]
    const latitude = Number(place?.latitude)
    const longitude = Number(place?.longitude)
    if (!place || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return response.status(404).json({ error: 'No coordinates were returned for that place.' })
    }
    const city = place['place name'] ?? ''
    const state = place.state ?? payload.state ?? place['state abbreviation'] ?? payload['state abbreviation'] ?? ''
    const abbreviation = (place['state abbreviation'] ?? payload['state abbreviation'] ?? '').toUpperCase()
    return response.status(200).json({
      location: {
        id: `${abbreviation}:${payload['post code'] ?? place['post code'] ?? city.toLowerCase()}`,
        label: `${city}, ${abbreviation}`,
        city,
        state,
        stateCode: abbreviation,
        latitude,
        longitude,
        zoom: 10,
      },
      approximate: true,
      source: 'Zippopotam.us',
    })
  } catch {
    return response.status(502).json({ error: 'Place search is unavailable right now. Try again in a moment.' })
  }
}
