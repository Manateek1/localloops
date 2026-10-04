import { Suspense, lazy, useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, Compass, List, Map, MapPin, MessageCircle, Plus, Search, Trees } from 'lucide-react'
import type { CommunityEvent, LocationResult } from '../data/models'
import type { EventFeedState } from '../lib/events'
import { EventCard } from '../components/EventCard'
import { VoiceGuide } from './VoiceGuide'

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
  onQueryChange: (query: string) => void
  onSearch: (query: string) => Promise<void>
  onRadiusChange: (radius: number) => void
  onOpenEvent: (event: CommunityEvent) => void
  onCreateEvent: () => void
  canCreateEvent: boolean
  onSignIn: () => void
}

const filters = ['All events', 'Outdoors', 'Arts & culture', 'Music', 'Free', 'Community']

export function ExplorePage({
  location, events, loading, sources, errors, locationError, communityAvailable, query, radius, onQueryChange, onSearch,
  onRadiusChange, onOpenEvent, onCreateEvent, canCreateEvent, onSignIn,
}: ExplorePageProps) {
  const [view, setView] = useState<'map' | 'list'>('map')
  const [filter, setFilter] = useState('All events')
  const [searching, setSearching] = useState(false)
  const filteredEvents = useMemo(() => events.filter((event) => {
    if (filter === 'All events') return true
    if (filter === 'Free') return event.isFree === true
    if (filter === 'Community') return event.source === 'community'
    const category = (event.category + ' ' + event.title).toLowerCase()
    if (filter === 'Outdoors') return /outdoor|park|hike|trail|camp|nature|garden/.test(category)
    if (filter === 'Arts & culture') return /art|culture|museum|theatre|theater|exhibit/.test(category)
    if (filter === 'Music') return /music|concert|band|song/.test(category)
    return true
  }), [events, filter])

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSearching(true)
    try {
      await onSearch(query)
    } finally {
      setSearching(false)
    }
  }

  const unavailableSources = [sources.ticketmaster === 'not_configured' ? 'Ticketmaster' : '', sources.nps === 'not_configured' ? 'National Park Service' : ''].filter(Boolean)

  return (
    <div className="greet-page greet-explore-page">
      <section className="greet-home-hero" aria-label="Find local plans with LocalLoops">
        <div className="greet-home-hero__copy">
          <p className="greet-eyebrow">{location ? 'Good things are happening nearby' : 'A wider circle, close to home'}</p>
          <h1>{location ? 'Real plans around ' + location.label + '.' : 'Find a good plan, wherever home is.'}</h1>
          <p className="greet-home-hero__intro">Discover real public events and local gatherings across all 50 states.</p>
          <button className="greet-button greet-button--primary" type="button" onClick={canCreateEvent ? onCreateEvent : onSignIn}><Plus size={17} />Host a gathering</button>
        </div>
        <GuideChatPreview />
      </section>

      <section className="greet-search-panel" aria-label="Find events near a location">
        <form className="greet-location-search" onSubmit={submitSearch}>
          <MapPin size={19} />
          <label className="sr-only" htmlFor="greet-location-query">Search by U.S. town, state, or ZIP</label>
          <input id="greet-location-query" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search any U.S. town, state, or ZIP code" required minLength={3} />
          <button type="submit" className="greet-button greet-button--primary" disabled={searching}>{searching ? 'Searching…' : <><Search size={16} />Find events</>}</button>
        </form>
        <div className="greet-search-help"><span className={locationError ? 'greet-search-status is-error' : 'greet-search-status'} role={locationError ? 'alert' : 'status'}>{locationError || (searching ? 'Finding this place and centering the map…' : location ? 'Map centered near ' + location.label + '.' : 'Try “Asheville, NC” or a ZIP code.')}</span><label>Search radius <select value={radius} onChange={(event) => onRadiusChange(Number(event.target.value))}><option value={25}>25 miles</option><option value={50}>50 miles</option><option value={100}>100 miles</option><option value={250}>250 miles</option></select></label></div>
      </section>

      <section className="greet-explore-panel" aria-label="Explore real local events">
        <div className="greet-explore-toolbar">
          <div className="greet-area-label"><span className="greet-area-label__icon"><Compass size={19} /></span><span><strong>{location ? location.label : 'Across the United States'}</strong><small>{location ? 'Approximate town or ZIP area' : 'Choose any location to see what’s nearby'}</small></span></div>
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
              <Suspense fallback={<div className="greet-map greet-map--loading" role="status">Loading the live map…</div>}><MapCanvas location={location} events={filteredEvents} onOpenEvent={(id) => { const event = filteredEvents.find((item) => item.id === id); if (event) onOpenEvent(event) }} /></Suspense>
              <div className="greet-source-strip">
                <span className="greet-source-strip__label">Live sources</span>
                {sources.ticketfairy === 'ready' && <span><CalendarDays size={14} />Ticket Fairy</span>}
                {sources.ticketmaster === 'ready' && <span><CalendarDays size={14} />Ticketmaster</span>}
                {sources.nps === 'ready' && <span><Trees size={14} />National Park Service</span>}
                {communityAvailable && <span><UsersIcon />LocalLoops gatherings</span>}
              </div>
            </div>
            <div className="greet-event-list-column">
              <div className="greet-list-heading"><div><h2>Coming up</h2><p>{location ? 'Listings returned for your search area' : 'Plans from towns large and small'}</p></div><button type="button" className="greet-text-button" onClick={() => setView('list')}>See all</button></div>
              {loading ? <div className="greet-loading" role="status">Checking real event listings…</div> : filteredEvents.length ? <div className="greet-event-list">{filteredEvents.slice(0, 5).map((event) => <EventCard key={event.id} event={event} onOpen={() => onOpenEvent(event)} compact />)}</div> : <EmptyEvents hasLocation={Boolean(location)} unavailableSources={unavailableSources} errors={errors} />}
            </div>
          </div>
        ) : (
          <div className="greet-list-view">
            {loading ? <div className="greet-loading" role="status">Checking real event listings…</div> : filteredEvents.length ? <div className="greet-event-grid">{filteredEvents.map((event) => <EventCard key={event.id} event={event} onOpen={() => onOpenEvent(event)} />)}</div> : <EmptyEvents hasLocation={Boolean(location)} unavailableSources={unavailableSources} errors={errors} />}
          </div>
        )}
      </section>

      <VoiceGuide signedIn={canCreateEvent} onSignIn={onSignIn} />
      <p className="greet-privacy-note"><MapPin size={14} />Location searches use town or ZIP centers. LocalLoops does not save your precise location.</p>
    </div>
  )
}

function GuideChatPreview() {
  return (
    <aside className="greet-guide-preview" aria-label="Sample conversation with the LocalLoops guide">
      <div className="greet-guide-preview__header">
        <div>
          <span className="greet-guide-preview__eyebrow"><MessageCircle size={13} />Sample conversation</span>
          <strong>Meet your LocalLoops guide</strong>
        </div>
        <span className="greet-guide-preview__badge">Example</span>
      </div>
      <div className="greet-guide-preview__body">
        <div className="greet-guide-preview__thread" role="group" aria-label="Illustrative chat messages">
          <p className="greet-guide-preview__user">I’m outside town. What’s nearby this weekend?</p>
          <div className="greet-guide-preview__reply">
            <span>LocalLoops guide</span>
            <p>Search a town or ZIP to find real public events and neighbor-hosted gatherings nearby.</p>
          </div>
        </div>
        <img src="/images/localloops-sprout.png" alt="The friendly LocalLoops guide character" />
      </div>
      <p className="greet-guide-preview__footnote">An example of how your local guide can help.</p>
    </aside>
  )
}

function EmptyEvents({ hasLocation, unavailableSources, errors }: { hasLocation: boolean; unavailableSources: string[]; errors: string[] }) {
  return (
    <div className="greet-empty-events">
      <span className="greet-empty-events__icon"><CalendarDays size={21} /></span>
      <strong>{errors.length ? 'Event listings could not load.' : hasLocation ? 'No upcoming events found in this radius.' : 'Start by choosing a place.'}</strong>
      <span>{errors[0] ?? (hasLocation && unavailableSources.length ? unavailableSources.join(' and ') + ' are not connected yet. Public listings vary by area; try a wider radius or check back later.' : hasLocation ? 'Public listings vary by area. Try a wider radius or check back later as organizers post more events.' : 'Search any town, state, or ZIP to load real nearby events.')}</span>
    </div>
  )
}

function UsersIcon() {
  return <span aria-hidden="true" className="greet-source-dot">●</span>
}
