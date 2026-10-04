import { US_STATES } from '../src/data/models.ts'

type VercelRequest = { method?: string; url?: string }
type VercelResponse = {
  setHeader(name: string, value: string): void
  status(code: number): VercelResponse
  json(body: unknown): void
}

type PublicEvent = {
  id: string
  sourceId: string
  source: 'ticketmaster' | 'nps' | 'ticketfairy'
  sourceName: string
  sourceUrl: string | null
  title: string
  description: string
  startsAt: string | null
  timeLabel: string | null
  venue: string
  city: string
  state: string
  stateCode: string
  latitude: number
  longitude: number
  imageUrl: string | null
  category: string
  isFree: boolean | null
  distanceMiles: number
}

const milesBetween = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const radians = Math.PI / 180
  const dLat = (lat2 - lat1) * radians
  const dLon = (lon2 - lon1) * radians
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * radians) * Math.cos(lat2 * radians) * Math.sin(dLon / 2) ** 2
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const asText = (value: unknown) => typeof value === 'string' ? value.trim() : ''

type TicketFairyEvent = {
  url?: string | null
  displayName?: string
  subtitle?: string | null
  description?: string | null
  shortDescription?: string | null
  eventTypes?: string[]
  tags?: string[]
  startDate?: string
  imageURL?: string | null
  startingPrice?: { amount?: string; currency?: string } | null
  venue?: {
    name?: string | null
    country?: string | null
    state?: string | null
    city?: string | null
    hidden?: boolean
    latitude?: string | null
    longitude?: string | null
  } | null
}

function encodeGeohash(latitude: number, longitude: number, precision = 6) {
  const alphabet = '0123456789bcdefghjkmnpqrstuvwxyz'
  let latRange: [number, number] = [-90, 90]
  let lonRange: [number, number] = [-180, 180]
  let even = true
  let bit = 0
  let character = 0
  let hash = ''
  while (hash.length < precision) {
    const range = even ? lonRange : latRange
    const value = even ? longitude : latitude
    const middle = (range[0] + range[1]) / 2
    if (value >= middle) {
      character |= 1 << (4 - bit)
      range[0] = middle
    } else {
      range[1] = middle
    }
    even = !even
    if (bit < 4) bit += 1
    else {
      hash += alphabet[character]
      bit = 0
      character = 0
    }
  }
  return hash
}

function validCoordinate(value: unknown) {
  if (value === null || value === undefined || value === '') return Number.NaN
  return Number(value)
}

async function getTicketmasterEvents(latitude: number, longitude: number, radius: number): Promise<PublicEvent[]> {
  const key = process.env.TICKETMASTER_API_KEY
  if (!key) return []

  const now = new Date()
  const end = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000)
  const params = new URLSearchParams({
    apikey: key,
    countryCode: 'US',
    geoPoint: encodeGeohash(latitude, longitude),
    radius: String(radius),
    unit: 'miles',
    size: '100',
    sort: 'date,asc',
    startDateTime: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    endDateTime: end.toISOString().replace(/\.\d{3}Z$/, 'Z'),
  })
  const response = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`Ticketmaster returned ${response.status}`)
  const payload = await response.json() as { _embedded?: { events?: any[] } }
  return (payload._embedded?.events ?? []).flatMap((event): PublicEvent[] => {
    const venue = event._embedded?.venues?.[0]
    const lat = validCoordinate(venue?.location?.latitude ?? event.place?.location?.latitude ?? event.location?.latitude)
    const lon = validCoordinate(venue?.location?.longitude ?? event.place?.location?.longitude ?? event.location?.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return []
    const category = event.classifications?.[0]?.segment?.name
      ?? event.classifications?.[0]?.genre?.name
      ?? 'Community'
    const images = Array.isArray(event.images) ? event.images : []
    const image = images
      .filter((item: any) => typeof item.url === 'string')
      .sort((a: any, b: any) => Math.abs((b.width ?? 0) / Math.max(1, b.height ?? 1) - 1.78)
        - Math.abs((a.width ?? 0) / Math.max(1, a.height ?? 1) - 1.78))[0]
    const city = asText(venue?.city?.name) || asText(event.place?.address?.city) || asText(event.city?.name)
    const stateCode = (asText(venue?.state?.stateCode) || asText(event.place?.address?.stateCode) || asText(event.stateCode)).toUpperCase()
    const state = asText(venue?.state?.name) || asText(event.place?.address?.state) || stateCode
    const distanceMiles = milesBetween(latitude, longitude, lat, lon)
    const sourceId = asText(event.id)
    const title = asText(event.name)
    if (!sourceId || !title || distanceMiles > radius) return []
    return [{
      id: `ticketmaster:${sourceId}`,
      sourceId,
      source: 'ticketmaster',
      sourceName: 'Ticketmaster',
      sourceUrl: asText(event.url) || null,
      title,
      description: asText(event.info) || asText(event.pleaseNote),
      startsAt: asText(event.dates?.start?.localDate)
        || asText(event.dates?.start?.dateTime)
        || null,
      timeLabel: asText(event.dates?.start?.localTime) || null,
      venue: asText(venue?.name) || asText(event.place?.name) || asText(event.place?.area?.name) || city || 'Public venue',
      city,
      state,
      stateCode,
      latitude: lat,
      longitude: lon,
      imageUrl: asText(image?.url) || null,
      category,
      isFree: typeof event.priceRanges?.[0]?.min === 'number' ? event.priceRanges[0].min === 0 : null,
      distanceMiles,
    }]
  })
}

async function getNpsEvents(latitude: number, longitude: number, radius: number, stateCode: string): Promise<PublicEvent[]> {
  const key = process.env.NPS_API_KEY
  if (!key) return []

  const start = new Date().toISOString().slice(0, 10)
  const end = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const query = new URLSearchParams({ stateCode, dateStart: start, dateEnd: end, pageSize: '50', expandRecurring: 'true' })
  const fetchPage = async (pageNumber: number) => {
    const params = new URLSearchParams(query)
    params.set('pageNumber', String(pageNumber))
    const response = await fetch(`https://developer.nps.gov/api/v1/events?${params}`, {
      headers: { Accept: 'application/json', 'X-Api-Key': key },
    })
    if (!response.ok) throw new Error(`National Park Service returned ${response.status}`)
    return await response.json() as { data?: any[]; total?: string | number }
  }
  const firstPage = await fetchPage(1)
  const total = Number(firstPage.total) || (firstPage.data?.length ?? 0)
  const pageCount = Math.min(5, Math.max(1, Math.ceil(total / 50)))
  const pages = await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) => fetchPage(index + 2)))
  const sourceEvents = [firstPage, ...pages].flatMap((page) => page.data ?? [])
  return sourceEvents.flatMap((event): PublicEvent[] => {
    const rawLat = validCoordinate(event.latitude ?? event.location?.latitude ?? event.location?.lat)
    const rawLon = validCoordinate(event.longitude ?? event.location?.longitude ?? event.location?.lon ?? event.location?.lng)
    if (!Number.isFinite(rawLat) || !Number.isFinite(rawLon)) return []
    const distanceMiles = milesBetween(latitude, longitude, rawLat, rawLon)
    if (distanceMiles > radius) return []
    const date = asText(event.date) || (Array.isArray(event.dates) ? asText(event.dates[0]) : '')
    const startsAt = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null
    const timeLabel = asText(event.times?.[0]?.timestart) || (event.isallday ? 'All day' : '') || null
    const sourceId = asText(event.id ?? event.eventid)
    const title = asText(event.title)
    if (!sourceId || !title) return []
    const images = Array.isArray(event.images) ? event.images : []
    const venue = asText(event.location) || asText(event.parkfullname) || 'National Park Service site'
    const eventInfoUrl = asText(event.infourl) || asText(event.regresurl)
    const imagePath = asText(images[0]?.url)
    return [{
      id: `nps:${sourceId}`,
      sourceId,
      source: 'nps',
      sourceName: 'National Park Service',
      sourceUrl: eventInfoUrl || (asText(event.sitecode) ? `https://www.nps.gov/${asText(event.sitecode)}/index.htm` : null),
      title,
      description: asText(event.description),
      startsAt,
      timeLabel,
      venue,
      city: venue,
      state: stateCode,
      stateCode,
      latitude: rawLat,
      longitude: rawLon,
      imageUrl: imagePath ? (imagePath.startsWith('http') ? imagePath : `https://www.nps.gov${imagePath}`) : null,
      category: asText(event.category) || 'Parks & outdoors',
      isFree: typeof event.isfree === 'boolean' ? event.isfree : null,
      distanceMiles,
    }]
  })
}

function getTicketFairyEventUrl(value: unknown) {
  const raw = asText(value)
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || !['ticketfairy.com', 'www.ticketfairy.com'].includes(url.hostname)) return null
    return url.toString()
  } catch {
    return null
  }
}

async function getTicketFairyEvents(
  latitude: number,
  longitude: number,
  radius: number,
  stateCode: string,
): Promise<PublicEvent[]> {
  const stateName = US_STATES.find(([code]) => code === stateCode)?.[1]
  if (!stateName) return []

  const today = new Date()
  const end = new Date(today.getTime() + 120 * 24 * 60 * 60 * 1000)
  const params = new URLSearchParams({
    country: 'us',
    state: stateName,
    section_type: 'upcoming',
    sort: 'start_date',
    order: 'asc',
    from: today.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
    size: '200',
  })
  const sourceEvents: TicketFairyEvent[] = []
  let cursor: string | null = null
  for (let page = 0; page < 3; page += 1) {
    const pageParams = new URLSearchParams(params)
    if (cursor) pageParams.set('cursor', cursor)
    const response = await fetch(`https://www.ticketfairy.com/api/v1/events/listing?${pageParams}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error(`Ticket Fairy returned ${response.status}`)
    const payload = await response.json() as {
      success?: boolean
      data?: { events?: TicketFairyEvent[]; pagination?: { nextCursor?: string | null } }
    }
    if (payload.success !== true) throw new Error('Ticket Fairy returned an unsuccessful response')
    sourceEvents.push(...(payload.data?.events ?? []))
    cursor = payload.data?.pagination?.nextCursor ?? null
    if (!cursor) break
  }

  return sourceEvents.flatMap((event): PublicEvent[] => {
    const venue = event.venue
    // Do not place events with intentionally hidden venue details on a precise map pin.
    if (!venue || venue.hidden === true || asText(venue.country).toLowerCase() !== 'us') return []

    const lat = validCoordinate(venue.latitude)
    const lon = validCoordinate(venue.longitude)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) return []
    const distanceMiles = milesBetween(latitude, longitude, lat, lon)
    if (distanceMiles > radius) return []

    const sourceUrl = getTicketFairyEventUrl(event.url)
    const sourceId = sourceUrl ? new URL(sourceUrl).pathname.replace(/\/+$/, '') : ''
    const title = asText(event.displayName)
    const city = asText(venue.city)
    const returnedState = asText(venue.state)
    const matchedState = US_STATES.find(([code, name]) =>
      code === returnedState.toUpperCase() || name.toLowerCase() === returnedState.toLowerCase())
    const startsAt = asText(event.startDate)
    const startTime = Date.parse(startsAt)
    const now = Date.now()
    const endTime = now + 120 * 24 * 60 * 60 * 1000
    if (!sourceId || !title || !matchedState || matchedState[0] !== stateCode
      || !Number.isFinite(startTime) || startTime < now || startTime > endTime) return []

    const price = Number(event.startingPrice?.amount)
    const category = event.eventTypes?.map(asText).find(Boolean)
      || event.tags?.map(asText).find(Boolean)
      || 'Community event'
    return [{
      id: `ticketfairy:${sourceId}`,
      sourceId,
      source: 'ticketfairy',
      sourceName: 'Ticket Fairy',
      sourceUrl,
      title,
      description: asText(event.shortDescription) || asText(event.description) || asText(event.subtitle),
      startsAt,
      timeLabel: null,
      venue: asText(venue.name) || city || 'Public venue',
      city,
      state: returnedState || stateName,
      stateCode,
      latitude: lat,
      longitude: lon,
      imageUrl: asText(event.imageURL) || null,
      category,
      isFree: event.startingPrice && Number.isFinite(price) ? price === 0 : null,
      distanceMiles,
    }]
  })
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600')
  if (request.method !== 'GET') return response.status(405).json({ error: 'Use GET.' })

  const url = new URL(request.url ?? '/', 'https://localloops.invalid')
  const latitude = Number(url.searchParams.get('lat'))
  const longitude = Number(url.searchParams.get('lon'))
  const requestedRadius = Number(url.searchParams.get('radius') ?? 50)
  const radius = Math.min(250, Math.max(5, Number.isFinite(requestedRadius) ? requestedRadius : 50))
  const stateCode = (url.searchParams.get('state') ?? '').toUpperCase()
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90
    || !Number.isFinite(longitude) || Math.abs(longitude) > 180
    || !/^[A-Z]{2}$/.test(stateCode)) {
    return response.status(400).json({ error: 'Provide a valid location and two-letter state code.' })
  }

  const sources: Record<'ticketmaster' | 'nps' | 'ticketfairy', 'ready' | 'not_configured' | 'unavailable'> = {
    ticketmaster: process.env.TICKETMASTER_API_KEY ? 'ready' : 'not_configured',
    nps: process.env.NPS_API_KEY ? 'ready' : 'not_configured',
    ticketfairy: 'ready',
  }
  const results = await Promise.allSettled([
    getTicketmasterEvents(latitude, longitude, radius),
    getNpsEvents(latitude, longitude, radius, stateCode),
    getTicketFairyEvents(latitude, longitude, radius, stateCode),
  ])
  const events: PublicEvent[] = []
  const errors: string[] = []
  if (results[0].status === 'fulfilled') {
    sources.ticketmaster = process.env.TICKETMASTER_API_KEY ? 'ready' : 'not_configured'
    events.push(...results[0].value)
  } else {
    sources.ticketmaster = 'unavailable'
    errors.push('Ticketmaster event search is temporarily unavailable.')
  }
  if (results[1].status === 'fulfilled') {
    sources.nps = process.env.NPS_API_KEY ? 'ready' : 'not_configured'
    events.push(...results[1].value)
  } else {
    sources.nps = 'unavailable'
    errors.push('National Park Service event search is temporarily unavailable.')
  }
  if (results[2].status === 'fulfilled') {
    sources.ticketfairy = 'ready'
    events.push(...results[2].value)
  } else {
    sources.ticketfairy = 'unavailable'
    errors.push('Ticket Fairy event search is temporarily unavailable.')
  }
  events.sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''))
  return response.status(200).json({ events, sources, errors })
}
