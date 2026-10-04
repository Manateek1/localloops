import { Suspense, lazy, useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, Compass, Leaf, List, Map, MapPin, Plus, Search, Trees } from 'lucide-react'
import type { CommunityEvent, LocationResult } from '../data/models'
import type { EventFeedState } from '../lib/events'
import { sortNearby } from '../lib/events'
import { EventCard } from '../components/EventCard'

const MapCanvas = lazy(() => import('../components/MapCanvas').then((module) => ({ default: module.MapCanvas })))

type ExplorePageProps = {
  location: LocationResult | null
  events: CommunityEvent[]
  loading: boolean
  sources: EventFeedState
  errors: string[]
  locationError: string
  communityAvailable: boolean
  query: string
  radius: number
  interests: string[]
  onQueryChange: (query: string) => void
  onSearch: (query: string) => Promise<void>
  onRadiusChange: (radius: number) => void
  onOpenEvent: (event: CommunityEvent) => void
  onCreateEvent: () => void
  onAskLeafy: () => void
  canCreateEvent: boolean
  onSignIn: () => void
}

const filters = ['All events', 'Outdoors', 'Arts & culture', 'Music', 'Free', 'Community']

export function ExplorePage({
  location, events, loading, sources, errors, locationError, communityAvailable, query, radius, interests, onQueryChange, onSearch,
  onRadiusChange,
  onOpenEvent, onCreateEvent, canCreateEvent, onSignIn,
  onAskLeafy,
}: ExplorePageProps) {
  const [view, setView] = useState<'map' | 'list'>('map')
  const [filter, setFilter] = useState('All events')
  const [searching, setSearching] = useState(false)
  const recommendedEvents = useMemo(() => sortNearby(events, interests), [events, interests])
  const filteredEvents = useMemo(() => recommendedEvents.filter((event) => {
    if (filter === 'All events') return true
    if (filter === 'Free') return event.isFree === true
    if (filter === 'Community') return event.source === 'community'
    const category = (event.category + ' ' + event.title).toLowerCase()
    if (filter === 'Outdoors') return /outdoor|park|hike|trail|camp|nature|garden/.test(category)
    if (filter === 'Arts & culture') return /art|culture|museum|theatre|theater|exhibit/.test(category)
    if (filter === 'Music') return /music|concert|band|song/.test(category)
    return true
  }), [recommendedEvents, filter])

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSearching(true)
    try {
      await onSearch(query)
    } finally {
      setSearching(false)
    }
  }

  const unavailableSources = [sources.ticketfairy !== 'ready' ? 'Ticket Fairy' : '', sources.ticketmaster === 'not_configured' ? 'Ticketmaster' : '', sources.nps === 'not_configured' ? 'National Park Service' : ''].filter(Boolean)

  return (
    <div className="greet-page greet-explore-page">
      <section className="greet-home-hero greet-home-hero--single" aria-label="Find local plans with LocalLoops">
        <div className="greet-home-hero__copy">
          <p className="greet-eyebrow">{location ? 'Good things are happening nearby' : 'A wider circle, close to home'}</p>
          <h1>{location ? 'Real plans around ' + location.label + '.' : 'Find a good plan, wherever home is.'}</h1>
          <p className="greet-home-hero__intro">Search a U.S. street address, town, or ZIP to find public events and local gatherings nearby.</p>
          <div className="greet-home-hero__actions">
            <button className="greet-button greet-button--primary" type="button" onClick={canCreateEvent ? onCreateEvent : onSignIn}><Plus size={17} />Host a gathering</button>
            <button className="greet-button greet-button--soft" type="button" onClick={onAskLeafy}><Leaf size={16} />Ask Leafy</button>
          </div>
        </div>
      </section>

      <section className="greet-search-panel" aria-label="Find events near a location">
        <form className="greet-location-search" onSubmit={submitSearch}>
          <MapPin size={19} />
          <label className="sr-only" htmlFor="greet-location-query">Search by U.S. address, town and state, or ZIP</label>
          <input id="greet-location-query" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="U.S. address, town and state, or ZIP code" required minLength={3} />
          <button type="submit" className="greet-button greet-button--primary" disabled={searching}>{searching ? 'Searching…' : <><Search size={16} />Find events</>}</button>
        </form>
        <div className="greet-search-help"><span className={locationError ? 'greet-search-status is-error' : 'greet-search-status'} role={locationError ? 'alert' : 'status'}>{locationError || (searching ? 'Finding this place and centering the map…' : location ? 'Map centered near ' + location.label + '.' : 'Try “Asheville, NC”, a street address, or a ZIP code.')}</span><label>Search radius <select value={radius} onChange={(event) => onRadiusChange(Number(event.target.value))}><option value={20}>20 miles</option><option value={30}>30 miles</option><option value={50}>50 miles</option><option value={100}>100 miles</option><option value={250}>250 miles</option></select></label></div>
      </section>

      <section className="greet-explore-panel" aria-label="Explore real local events">
        <div className="greet-explore-toolbar">
          <div className="greet-area-label"><span className="greet-area-label__icon"><Compass size={19} /></span><span><strong>{location ? location.label : 'Choose a location'}</strong><small>{location ? location.approximate === false ? 'Street-address match' : 'Approximate town or ZIP center' : 'Search any U.S. community to see what’s nearby'}</small></span></div>
          <div className="greet-toolbar-actions">
            <div className="greet-view-switch" role="group" aria-label="Map or list view">
              <button type="button" className={view === 'map' ? 'is-active' : ''} onClick={() => setView('map')} aria-pressed={view === 'map'}><Map size={15} />Map</button>
              <button type="button" className={view === 'list' ? 'is-active' : ''} onClick={() => setView('list')} aria-pressed={view === 'list'}><List size={15} />List</button>
            </div>
          </div>
        </div>

        <div className="greet-filter-row" role="group" aria-label="Filter events">
          {filters.map((item) => <button className={'greet-filter-chip ' + (filter === item ? 'is-active' : '')} type="button" key={item} onClick={() => setFilter(item)} aria-pressed={filter === item}>{item}</button>)}
          <span className="greet-filter-count">{filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}</span>
        </div>

        {view === 'map' ? (
          <div className="greet-explore-grid">
            <div className="greet-map-column">
              <Suspense fallback={<div className="greet-map greet-map--loading" role="status">Loading the live map…</div>}><MapCanvas location={location} events={filteredEvents} showSearchRadius searchRadiusMiles={radius} onOpenEvent={(id) => { const event = filteredEvents.find((item) => item.id === id); if (event) onOpenEvent(event) }} /></Suspense>
              <div className="greet-source-strip">
                <span className="greet-source-strip__label">Live sources</span>
                {sources.ticketfairy === 'ready' && <span><CalendarDays size={14} />Ticket Fairy</span>}
                {sources.ticketmaster === 'ready' && <span><CalendarDays size={14} />Ticketmaster</span>}
                {sources.nps === 'ready' && <span><Trees size={14} />National Park Service</span>}
                {communityAvailable && <span><UsersIcon />LocalLoops gatherings</span>}
              </div>
            </div>
            <div className="greet-event-list-column">
              <div className="greet-list-heading"><div><h2>{interests.length ? 'Recommended for you' : 'Coming up'}</h2><p>{location ? `Within ${radius} miles of ${location.label}` : 'Choose a town or ZIP to see nearby plans'}</p></div><button type="button" className="greet-text-button" onClick={() => setView('list')}>See all</button></div>
              {loading ? <div className="greet-loading" role="status">Checking real event listings…</div> : filteredEvents.length ? <div className="greet-event-list">{filteredEvents.slice(0, 5).map((event) => <EventCard key={event.id} event={event} onOpen={() => onOpenEvent(event)} compact />)}</div> : <EmptyEvents hasLocation={Boolean(location)} unavailableSources={unavailableSources} errors={errors} radius={radius} />}
            </div>
          </div>
        ) : (
          <div className="greet-list-view">
            {loading ? <div className="greet-loading" role="status">Checking real event listings…</div> : filteredEvents.length ? <div className="greet-event-grid">{filteredEvents.map((event) => <EventCard key={event.id} event={event} onOpen={() => onOpenEvent(event)} />)}</div> : <EmptyEvents hasLocation={Boolean(location)} unavailableSources={unavailableSources} errors={errors} radius={radius} />}
          </div>
        )}
      </section>

      <p className="greet-privacy-note"><MapPin size={14} />Street addresses are sent to the U.S. Census Bureau for lookup and are not saved by LocalLoops. Search details stay out of URLs and event listings.</p>
    </div>
  )
}

function EmptyEvents({ hasLocation, unavailableSources, errors, radius }: { hasLocation: boolean; unavailableSources: string[]; errors: string[]; radius: number }) {
  return (
    <div className="greet-empty-events">
      <span className="greet-empty-events__icon"><CalendarDays size={21} /></span>
      <strong>{errors.length ? 'Event listings could not load.' : hasLocation ? `No upcoming events found within ${radius} miles.` : 'Start by choosing a place.'}</strong>
      <span>{errors[0] ?? (hasLocation && unavailableSources.length ? unavailableSources.join(' and ') + ' are not connected yet. Public listings vary by area; try a wider radius or check back later.' : hasLocation ? 'Public listings vary by area. Try a wider radius or check back later as organizers post more events.' : 'Search any U.S. town, street address, or ZIP to load real nearby events.')}</span>
    </div>
  )
}

function UsersIcon() {
  return <span aria-hidden="true" className="greet-source-dot">●</span>
}
