import type { LocationResult } from '../data/models'

export async function searchLocation(query: string): Promise<LocationResult> {
  const value = query.trim().replace(/\s+/g, ' ')
  if (value.length < 3 || value.length > 100) {
    throw new Error('Enter a U.S. street address, ZIP code, or a town and state.')
  }

  const response = await fetch('/api/geocode', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ query: value }),
  })
  const payload = await response.json() as {
    location?: LocationResult
    approximate?: boolean
    source?: string
    error?: string
  }
  if (!response.ok || !payload.location) {
    if (response.status === 404) throw new Error(payload.error ?? 'No U.S. place matched. Check the address, ZIP code, and state.')
    throw new Error(payload.error ?? 'Place search is unavailable right now. Try again in a moment.')
  }
  return { ...payload.location, approximate: payload.approximate ?? true, geocoder: payload.source }
}
