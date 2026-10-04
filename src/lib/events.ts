import type { CommunityEvent, EventSource, LocationResult } from '../data/models'
import type { EventRow, ProfileRow } from './supabase/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabase/database.types'

export type EventFeedState = {
  ticketmaster: 'ready' | 'not_configured' | 'unavailable'
  nps: 'ready' | 'not_configured' | 'unavailable'
  ticketfairy: 'ready' | 'not_configured' | 'unavailable'
  community: 'ready' | 'not_configured' | 'unavailable'
}

export type EventFeed = { events: CommunityEvent[]; sources: EventFeedState; errors: string[] }
export type CommunityEventFeed = {
  events: CommunityEvent[]
  status: EventFeedState['community']
  error: string | null
}

export const emptySources: EventFeedState = {
  ticketmaster: 'not_configured',
  nps: 'not_configured',
  ticketfairy: 'not_configured',
  community: 'not_configured',
}

export async function getSourcedEvents(location: LocationResult, radius: number): Promise<EventFeed> {
  try {
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        latitude: location.latitude,
        longitude: location.longitude,
        radius,
        stateCode: location.stateCode,
      }),
    })
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
      sources: { ticketmaster: 'unavailable', nps: 'unavailable', ticketfairy: 'unavailable', community: 'not_configured' },
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
): Promise<CommunityEventFeed> {
  if (!client) return { events: [], status: 'not_configured', error: null }
  const until = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString()
  const latDelta = radius / 69
  const longitudeDelta = Math.min(180, radius / (69 * Math.max(0.1, Math.cos(location.latitude * Math.PI / 180))))
  const minLongitude = location.longitude - longitudeDelta
  const maxLongitude = location.longitude + longitudeDelta
  let request = client
    .from('localloops_events')
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
  if (error || !data) {
    return {
      events: [],
      status: 'unavailable',
      error: 'LocalLoops gatherings could not load from the database. Try again in a moment.',
    }
  }

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
    const { data: profiles } = await client.schema('localloops').from('profiles').select('id, display_name').in('id', hostIds)
    for (const profile of (profiles ?? []) as Pick<ProfileRow, 'id' | 'display_name'>[]) {
      hostNames.set(profile.id, profile.display_name)
    }
  }

  return { events: nearby.map((event) => ({
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
  })), status: 'ready', error: null }
}

export async function getUserEventHistoryCategories(
  client: SupabaseClient<Database> | null,
  userId: string | null,
): Promise<string[]> {
  if (!client || !userId) return []

  const { data: rsvps, error: rsvpError } = await client
    .from('localloops_event_rsvps')
    .select('event_id,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (rsvpError || !rsvps?.length) return []

  const eventIds = [...new Set(rsvps.map((rsvp) => rsvp.event_id))]
  const { data: events, error: eventError } = await client
    .from('localloops_events')
    .select('category')
    .in('id', eventIds)
  if (eventError || !events) return []

  return [...new Set(events
    .map((event) => event.category.trim())
    .filter((category) => category && category.toLowerCase() !== 'community'))]
}

const normalizeForSearch = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()

const interestTerms: Record<string, string[]> = {
  hiking: ['hiking', 'hike', 'trail', 'trails', 'nature', 'outdoor', 'outdoors', 'camping', 'camp'],
  'outdoor skills': ['hiking', 'hike', 'trail', 'nature', 'outdoor', 'outdoors', 'camping', 'wilderness', 'survival', 'kayak', 'fishing', 'climbing'],
  'local food': ['food', 'farm', 'farmers market', 'market', 'culinary', 'cooking', 'tasting', 'food truck'],
  'arts culture': ['art', 'arts', 'museum', 'theater', 'theatre', 'gallery', 'exhibit', 'culture', 'craft', 'history'],
  'live music': ['music', 'concert', 'band', 'jazz', 'folk', 'bluegrass', 'orchestra', 'live music'],
  wellness: ['wellness', 'yoga', 'meditation', 'fitness', 'health', 'exercise', 'run', 'running'],
  gardening: ['garden', 'gardening', 'plant', 'plants', 'flower', 'flowers', 'seed', 'horticulture'],
  books: ['book', 'books', 'reading', 'read', 'author', 'library', 'literary', 'story'],
  photography: ['photography', 'photograph', 'photographer', 'photo', 'camera'],
  volunteering: ['volunteer', 'volunteering', 'cleanup', 'clean up', 'service', 'food bank'],
}

function eventRelevance(event: CommunityEvent, interests: string[]) {
  const searchable = ` ${normalizeForSearch(`${event.title} ${event.category} ${event.description}`)} `
  const matched = new Set<string>()
  for (const interest of interests) {
    const normalizedInterest = normalizeForSearch(interest)
    if (!normalizedInterest) continue
    const terms = interestTerms[normalizedInterest] ?? [interest]
    if (terms.some((term) => searchable.includes(` ${normalizeForSearch(term)} `))) matched.add(normalizedInterest)
  }
  return matched.size
}

export function sortNearby(events: CommunityEvent[], interests: string[] = []) {
  return [...events].sort((a, b) => {
    const relevance = eventRelevance(b, interests) - eventRelevance(a, interests)
    if (relevance) return relevance
    const timeA = a.startsAt ? Date.parse(a.startsAt) : Number.MAX_SAFE_INTEGER
    const timeB = b.startsAt ? Date.parse(b.startsAt) : Number.MAX_SAFE_INTEGER
    return timeA - timeB || (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0)
  })
}
