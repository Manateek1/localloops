import type { LocationResult } from '../data/models'

const stateCodes: Record<string, string> = {
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
  return stateCodes[normalized] ?? ''
}

export async function searchLocation(query: string): Promise<LocationResult> {
  const value = query.trim().replace(/\s+/g, ' ')
  if (value.length < 3) throw new Error('Enter a five-digit ZIP code or a town and state.')
  if (!/^\d{5}$/.test(value)) {
    const parts = value.split(',')
    const city = parts.slice(0, -1).join(',').trim()
    const code = stateCode(parts.at(-1) ?? '')
    if (!city || !code) throw new Error('For a town search, include its state, such as “Asheville, NC”.')
  }

  const response = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`, { headers: { Accept: 'application/json' } })
  const payload = await response.json() as { location?: LocationResult; error?: string }
  if (!response.ok || !payload.location) {
    if (response.status === 404) throw new Error(payload.error ?? 'No U.S. place matched. Check the ZIP code and state.')
    throw new Error(payload.error ?? 'Place search is unavailable right now. Try again in a moment.')
  }
  return payload.location
}
