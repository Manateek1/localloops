import { useMemo, useState } from 'react'
import { CalendarDays, LibraryBig, List, Map, Search, Trees, TreePine } from 'lucide-react'
import type { CommunityMode, MeetEvent } from '../data/demo'
import { EventCard } from '../components/EventCard'
import { MapCanvas } from '../components/MapCanvas'

type ExplorePageProps = {
  mode: CommunityMode
  events: MeetEvent[]
  onModeChange: (mode: CommunityMode) => void
  onOpenEvent: (eventId: string) => void
}

const filters = ['For you', 'This weekend', 'Outdoors', 'Food & local']

export function ExplorePage({ mode, events, onModeChange, onOpenEvent }: ExplorePageProps) {
  const [view, setView] = useState<'map' | 'list'>('map')
  const [filter, setFilter] = useState('For you')
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filteredEvents = useMemo(() => events.filter((event) => {
    const matchesText = `${event.title} ${event.town} ${event.category} ${event.source}`.toLowerCase().includes(query.toLowerCase())
    const matchesFilter = filter === 'For you'
      || (filter === 'This weekend' && (event.date.includes('Oct 10') || event.date.includes('Oct 11')))
      || (filter === 'Outdoors' && ['Hiking', 'Kayaking'].includes(event.category))
      || (filter === 'Food & local' && ['Food', 'Arts'].includes(event.category))
    return matchesText && matchesFilter
  }), [events, filter, query])

  const rural = mode === 'rural'

  return (
    <div className="page-content explore-page">
      <div className="explore-heading">
        <div>
          <p className="page-eyebrow">{rural ? 'A wider circle, close to home' : 'A city full of shared interests'}</p>
          <h1>{rural ? 'Good things are happening nearby.' : 'Your next plan is around the corner.'}</h1>
          <p className="explore-heading__copy">
            {rural
              ? 'Explore events across Pine Ridge, Riverton, Lakeside, and Cedar Falls.'
              : 'Find welcoming events and new faces across San Francisco and Oakland.'}
          </p>
        </div>
        <button className="explore-search-toggle" type="button" onClick={() => setSearchOpen((open) => !open)} aria-label="Search events">
          <Search size={18} /> <span>Search events</span>
        </button>
      </div>

      {searchOpen && (
        <label className="search-field">
          <Search size={17} />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try hiking, food, or a town" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search">×</button>}
        </label>
      )}

      <section className="explore-panel" aria-label="Explore local events">
        <div className="explore-panel__toolbar">
          <div className="mode-label">
            <span className="mode-label__icon">{rural ? <Trees size={18} /> : <MapPinIcon />}</span>
            <span><strong>{rural ? 'Foothill communities' : 'San Francisco · Oakland'}</strong><small>{rural ? 'Four towns, one community' : 'City events across the Bay'}</small></span>
          </div>
          <div className="toolbar-actions">
            <div className="segmented-control" role="group" aria-label="Map or list view">
              <button type="button" className={view === 'map' ? 'is-active' : ''} onClick={() => setView('map')} aria-pressed={view === 'map'}><Map size={15} /> Map</button>
              <button type="button" className={view === 'list' ? 'is-active' : ''} onClick={() => setView('list')} aria-pressed={view === 'list'}><List size={15} /> List</button>
            </div>
            <button className="mode-switch" type="button" onClick={() => onModeChange(rural ? 'city' : 'rural')}>
              {rural ? 'Switch to City' : 'Explore Rural'} <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>

        <div className="filter-row" role="group" aria-label="Filter events">
          {filters.map((item) => (
            <button className={`filter-chip ${filter === item ? 'is-active' : ''}`} type="button" key={item} onClick={() => setFilter(item)} aria-pressed={filter === item}>{item}</button>
          ))}
          <span className="filter-count">{filteredEvents.length} events</span>
        </div>

        {view === 'map' ? (
          <div className="explore-grid">
            <div className="explore-map-column">
              <MapCanvas mode={mode} events={filteredEvents} onOpenEvent={onOpenEvent} />
              <div className="source-strip" aria-label="Event sources">
                <span className="source-strip__label">Local sources</span>
                <span><CalendarDays size={15} /> Community calendars</span>
                <span><LibraryBig size={15} /> Library programs</span>
                <span><TreePine size={15} /> Parks &amp; Rec</span>
              </div>
            </div>
            <div className="event-list-column">
              <div className="event-list-heading">
                <div><h2>Coming up</h2><p>{rural ? 'Good plans across the foothills' : 'A few ways to meet around the Bay'}</p></div>
                <button type="button" className="text-button" onClick={() => setView('list')}>See all</button>
              </div>
              <div className="event-card-list">
                {filteredEvents.length ? filteredEvents.map((event) => <EventCard key={event.id} event={event} onOpen={() => onOpenEvent(event.id)} compact />) : <EmptyEvents query={query} />}
              </div>
              {rural && <p className="travel-note"><span className="travel-note__line" /> Travel times are approximate; discover public events across nearby towns.</p>}
            </div>
          </div>
        ) : (
          <div className="list-view-content">
            <div className="source-strip source-strip--list" aria-label="Event sources">
              <span className="source-strip__label">Shared by local groups</span>
              <span><CalendarDays size={15} /> Community calendars</span>
              <span><LibraryBig size={15} /> Library programs</span>
              <span><TreePine size={15} /> Parks &amp; Rec</span>
            </div>
            <div className="full-event-grid">
              {filteredEvents.length ? filteredEvents.map((event) => <EventCard key={event.id} event={event} onOpen={() => onOpenEvent(event.id)} />) : <EmptyEvents query={query} />}
            </div>
          </div>
        )}
      </section>
      <div className="explore-bottom-note"><Trees size={17} /><span>Events are public. Share only the details you’re comfortable sharing.</span></div>
    </div>
  )
}

function EmptyEvents({ query }: { query: string }) {
  return <div className="empty-events"><Search size={19} /><strong>No events found</strong><span>{query ? 'Try another interest or town.' : 'Choose another filter to see more.'}</span></div>
}

function MapPinIcon() {
  return <Map size={18} />
}
