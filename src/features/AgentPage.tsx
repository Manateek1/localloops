import { AudioLines, CalendarDays, MapPin } from 'lucide-react'
import type { CommunityEvent, LocationResult } from '../data/models'
import { EventCard } from '../components/EventCard'
import { VoiceGuide } from './VoiceGuide'

type AgentPageProps = {
  events: CommunityEvent[]
  errors: string[]
  loading: boolean
  location: LocationResult | null
  onOpenEvent: (event: CommunityEvent) => void
  onOpenExplore: () => void
}

export function AgentPage({ events, errors, loading, location, onOpenEvent, onOpenExplore }: AgentPageProps) {
  return (
    <div className="greet-page greet-agent-page">
      <header className="greet-page-heading">
        <p className="greet-eyebrow"><AudioLines size={14} aria-hidden="true" /> Voice guide</p>
        <h1>Talk to Sprout</h1>
        <p>Ask by voice about real public events and LocalLoops gatherings near your chosen location. Sprout listens and replies aloud; there’s no written chat.</p>
      </header>

      <section className="greet-agent-voice" aria-label="Talk with Sprout by voice">
        <VoiceGuide events={events} location={location} />
      </section>

      <section className="greet-agent-events" aria-label="Live events near your location">
        <div className="greet-agent-events__heading">
          <div>
            <p className="greet-eyebrow">Real local listings</p>
            <h2>Plans near you</h2>
            <p>{location ? `Public events around ${location.label}.` : 'Choose an area to see current events and give Sprout local context.'}</p>
          </div>
          <button className="greet-button greet-button--outline" type="button" onClick={onOpenExplore}>
            <MapPin size={16} /> {location ? 'Change area' : 'Choose an area'}
          </button>
        </div>

        {!location && (
          <div className="greet-empty-events">
            <span className="greet-empty-events__icon"><MapPin size={21} /></span>
            <strong>Choose a location first.</strong>
            <span>Search a U.S. town, street address, or ZIP in Explore to load real nearby listings.</span>
            <button className="greet-text-button" type="button" onClick={onOpenExplore}>Open Explore</button>
          </div>
        )}

        {location && loading && (
          <div className="greet-loading" role="status">Checking live event listings near {location.label}…</div>
        )}

        {location && !loading && events.length > 0 && (
          <>
            {errors.length > 0 && <p className="greet-agent-events__note" role="status">Some event sources did not respond; these are the listings that loaded.</p>}
            <div className="greet-agent-event-grid">
              {events.slice(0, 4).map((event) => (
                <EventCard key={event.id} event={event} onOpen={() => onOpenEvent(event)} compact />
              ))}
            </div>
          </>
        )}

        {location && !loading && events.length === 0 && (
          <div className="greet-empty-events">
            <span className="greet-empty-events__icon"><CalendarDays size={21} /></span>
            <strong>{errors.length ? 'Live event listings could not load.' : 'No upcoming public events found.'}</strong>
            <span>{errors[0] ?? 'Try a wider search radius in Explore, or check back as organizers post events.'}</span>
            <button className="greet-text-button" type="button" onClick={onOpenExplore}>Adjust event search</button>
          </div>
        )}
      </section>
    </div>
  )
}
