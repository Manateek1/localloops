type VercelRequest = { method?: string; body?: unknown }
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
  const code = /^[a-z]{2}$/i.test(normalized) ? normalized.toUpperCase() : states[normalized] ?? ''
  return code && Object.values(states).includes(code) ? code : ''
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0')
  response.setHeader('Vary', 'Authorization')
  if (request.method !== 'POST') return response.status(405).json({ error: 'Use POST.' })

  const body = request.body as { query?: unknown } | null
  const query = typeof body?.query === 'string' ? body.query.trim().replace(/\s+/g, ' ') : ''
  if (query.length < 3 || query.length > 100) {
    return response.status(400).json({ error: 'Enter a U.S. street address, ZIP code, or a town and state.' })
  }

  const zip = query.match(/^(\d{5})(?:-\d{4})?$/)
  const parts = query.split(',')
  const city = parts.length === 2 ? parts[0].trim() : ''
  const state = parts.length === 2 ? stateCode(parts[1]) : ''
  const looksLikeCityState = Boolean(city && state && !/(^\d|\b(?:street|st|road|rd|avenue|ave|boulevard|blvd|lane|ln|drive|dr|route|rt|highway|hwy)\b)/i.test(city))

  if (!zip && !looksLikeCityState) {
    const censusUrl = new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress')
    censusUrl.searchParams.set('address', query)
    censusUrl.searchParams.set('benchmark', 'Public_AR_Current')
    censusUrl.searchParams.set('format', 'json')
    try {
      const upstream = await fetch(censusUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      })
      if (!upstream.ok) throw new Error(`Census Geocoder returned ${upstream.status}`)
      const payload = await upstream.json() as {
        result?: { addressMatches?: Array<{
          coordinates?: { x?: number; y?: number }
          addressComponents?: { city?: string; state?: string; zip?: string }
        }> }
      }
      const match = payload.result?.addressMatches?.[0]
      const latitude = Number(match?.coordinates?.y)
      const longitude = Number(match?.coordinates?.x)
      const matchedCity = match?.addressComponents?.city?.trim() ?? ''
      const matchedState = match?.addressComponents?.state?.trim() ?? ''
      const abbreviation = stateCode(matchedState)
      if (!match || !Number.isFinite(latitude) || !Number.isFinite(longitude) || !abbreviation) {
        return response.status(404).json({ error: 'No U.S. address matched. Include a street number, street, city, and state.' })
      }
      return response.status(200).json({
        location: {
          id: `${abbreviation}:${matchedCity.toLowerCase()}`,
          label: `${matchedCity || 'U.S. location'}, ${abbreviation}`,
          city: matchedCity || 'U.S. location',
          state: states[matchedState.toLowerCase()] ? matchedState : abbreviation,
          stateCode: abbreviation,
          latitude,
          longitude,
          zoom: 12,
        },
        approximate: false,
        source: 'U.S. Census Bureau',
      })
    } catch {
      return response.status(502).json({ error: 'Address search is unavailable right now. Try a ZIP code or town and state.' })
    }
  }

  const lookupUrl = zip
    ? `https://api.zippopotam.us/us/${zip[1]}`
    : `https://api.zippopotam.us/us/${state.toLowerCase()}/${encodeURIComponent(city)}`
  try {
    const upstream = await fetch(lookupUrl, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) })
    if (upstream.status === 404) return response.status(404).json({ error: 'No U.S. place matched that search. Check the ZIP code or town and state.' })
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
    const cityName = place['place name'] ?? ''
    const stateName = place.state ?? payload.state ?? place['state abbreviation'] ?? payload['state abbreviation'] ?? ''
    const abbreviation = (place['state abbreviation'] ?? payload['state abbreviation'] ?? '').toUpperCase()
    return response.status(200).json({
      location: {
        id: `${abbreviation}:${payload['post code'] ?? place['post code'] ?? cityName.toLowerCase()}`,
        label: `${cityName}, ${abbreviation}`,
        city: cityName,
        state: stateName,
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
