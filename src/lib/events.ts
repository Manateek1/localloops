import type { CommunityEvent, EventSource, LocationResult } from '../data/models'
import type { EventRow, ProfileRow } from './supabase/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabase/database.types'

export type EventFeedState = {
  ticketmaster: 'ready' | 'not_configured' | 'unavailable'
  nps: 'ready' | 'not_configured' | 'unavailable'
}

export type EventFeed = { events: CommunityEvent[]; sources: EventFeedState; errors: string[] }

const emptySources: EventFeedState = { ticketmaster: 'not_configured', nps: 'not_configured' }

export async function getSourcedEvents(location: LocationResult, radius: number): Promise<EventFeed> {
  try {
    const params = new URLSearchParams({
      lat: String(location.latitude),
      lon: String(location.longitude),
      radius: String(radius),
      state: location.stateCode,
    })
    const response = await fetch(`/api/events?${params}`)
    if (!response.ok) throw new Error('Event search is unavailable right now.')
    const payload = await response.json() as {
      events?: CommunityEvent[]
      sources?: EventFeedState
      errors?: string[]
    }
    return { events: payload.events ?? [], sources: payload.sources ?? emptySources, errors: payload.errors ?? [] }
  } catch {
    return {
      events: [],
      sources: { ticketmaster: 'unavailable', nps: 'unavailable' },
      errors: ['Event search could not connect. Try again in a moment.'],
    }
  }
}

const milesBetween = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const radians = Math.PI / 180
  const dLat = (lat2 - lat1) * radians
  const dLon = (lon2 - lon1) * radians
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * radians) * Math.cos(lat2 * radians) * Math.sin(dLon / 2) ** 2
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function getCommunityEvents(
  client: SupabaseClient<Database> | null,
  location: LocationResult,
  radius: number,
): Promise<CommunityEvent[]> {
  if (!client) return []
  const until = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString()
  const latDelta = radius / 69
  const longitudeDelta = Math.min(180, radius / (69 * Math.max(0.1, Math.cos(location.latitude * Math.PI / 180))))
  const minLongitude = location.longitude - longitudeDelta
  const maxLongitude = location.longitude + longitudeDelta
  let request = client
    .from('events')
    .select('*')
    .gte('starts_at', new Date().toISOString())
    .lte('starts_at', until)
    .gte('latitude', Math.max(-90, location.latitude - latDelta))
    .lte('latitude', Math.min(90, location.latitude + latDelta))
    .order('starts_at', { ascending: true })
    .limit(1000)
  if (minLongitude < -180) request = request.or(`longitude.gte.${minLongitude + 360},longitude.lte.${maxLongitude}`)
  else if (maxLongitude > 180) request = request.or(`longitude.gte.${minLongitude},longitude.lte.${maxLongitude - 360}`)
  else request = request.gte('longitude', minLongitude).lte('longitude', maxLongitude)
  const { data, error } = await request
  if (error || !data) return []

  const rows = data as EventRow[]
  const distanceById = new Map<string, number>()
  const nearby = rows.filter((event) => {
    const distance = milesBetween(location.latitude, location.longitude, event.latitude, event.longitude)
    if (distance > radius) return false
    distanceById.set(event.id, distance)
    return true
  })
  const hostIds = [...new Set(nearby.map((event) => event.host_id))]
  const hostNames = new Map<string, string>()
  if (hostIds.length) {
    const { data: profiles } = await client.from('profiles').select('id, display_name').in('id', hostIds)
    for (const profile of (profiles ?? []) as Pick<ProfileRow, 'id' | 'display_name'>[]) {
      hostNames.set(profile.id, profile.display_name)
    }
  }

  return nearby.map((event) => ({
    id: `community:${event.id}`,
    sourceId: event.id,
    source: 'community' as EventSource,
    sourceName: 'Community event',
    sourceUrl: event.source_url,
    title: event.title,
    description: event.description,
    startsAt: event.starts_at,
    timeLabel: null,
    venue: event.venue_label,
    city: event.region_label.split(',')[0]?.trim() ?? event.region_label,
    state: event.state_code,
    stateCode: event.state_code,
    latitude: event.latitude,
    longitude: event.longitude,
    imageUrl: null,
    category: 'Community',
    isFree: true,
    distanceMiles: distanceById.get(event.id),
    communityEventId: event.id,
    hostName: hostNames.get(event.host_id),
  }))
}

export function sortNearby(events: CommunityEvent[]) {
  return [...events].sort((a, b) => {
    const timeA = a.startsAt ? Date.parse(a.startsAt) : Number.MAX_SAFE_INTEGER
    const timeB = b.startsAt ? Date.parse(b.startsAt) : Number.MAX_SAFE_INTEGER
    return timeA - timeB || (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0)
  })
}
