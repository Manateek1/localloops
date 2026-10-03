import { ArrowLeft, CalendarDays, CarFront, Check, Clock3, MapPin, Users } from 'lucide-react'
import type { MeetEvent } from '../data/demo'
import { Avatar } from '../components/Avatar'

type RideChoice = 'none' | 'need' | 'offer'

type EventDetailProps = {
  event: MeetEvent
  going: boolean
  rideChoice: RideChoice
  onBack: () => void
  onRsvp: () => void
  onRide: (choice: Exclude<RideChoice, 'none'>) => void
}

export function EventDetail({ event, going, rideChoice, onBack, onRsvp, onRide }: EventDetailProps) {
  const attendeeCount = event.attendees

  return (
    <div className="page-content event-detail-page">
      <button className="back-link" type="button" onClick={onBack}><ArrowLeft size={17} /> Back to Explore</button>
      <div className="event-detail-grid">
        <div className="event-detail-main">
          <div className="event-hero-image">
            <img src={event.image} alt={`${event.title} community event`} />
            <span className="event-hero-image__source">{event.source}</span>
          </div>
          <div className="event-detail-heading">
            <div className="event-tags">{event.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            <h1>{event.title}</h1>
            <p className="event-detail-lede">{event.description}</p>
          </div>
          <div className="detail-info-grid">
            <div className="detail-info-item"><CalendarDays size={19} /><span><strong>{event.date}</strong><small>{event.time}</small></span></div>
            <div className="detail-info-item"><MapPin size={19} /><span><strong>{event.venue}</strong><small>{event.town} · public meeting place</small></span></div>
            <div className="detail-info-item"><Clock3 size={19} /><span><strong>{event.travel} away</strong><small>Approximate travel time</small></span></div>
          </div>
          <section className="attendees-section">
            <div className="attendees-section__heading"><div><h2>Good company</h2><p>People who are looking forward to it</p></div><span>{attendeeCount} going</span></div>
            <div className="attendee-row">
              <Avatar initials={event.host.initials} color={event.host.color} />
              <Avatar initials="LM" color="plum" />
              <Avatar initials="AR" color="sage" />
              <Avatar initials="JR" color="blue" />
              <span className="attendee-row__note">and {Math.max(0, attendeeCount - 4)} more</span>
            </div>
          </section>
          <p className="public-event-note"><Users size={16} /> This is a public community event. Member home locations are never shown.</p>
        </div>

        <aside className="event-action-panel">
          <div className="host-card">
            <Avatar initials={event.host.initials} color={event.host.color} size="large" />
            <span><small>Hosted by</small><strong>{event.host.name}</strong><small>{event.source}</small></span>
          </div>
          {event.publicEvent && (
            <div className="ride-panel">
              <div className="ride-panel__heading"><span className="ride-icon"><CarFront size={18} /></span><div><strong>Getting there together</strong><small>Coordinate for this public event</small></div></div>
              <p>Offer a seat or let neighbors know you could use a ride. Share only a broad public pickup area.</p>
              <div className="ride-actions">
                <button className={`button button--outline ${rideChoice === 'need' ? 'is-selected' : ''}`} type="button" onClick={() => onRide('need')} aria-pressed={rideChoice === 'need'}>
                  {rideChoice === 'need' ? <Check size={17} /> : <Users size={17} />} Need a ride
                </button>
                <button className={`button button--soft ${rideChoice === 'offer' ? 'is-selected' : ''}`} type="button" onClick={() => onRide('offer')} aria-pressed={rideChoice === 'offer'}>
                  {rideChoice === 'offer' ? <Check size={17} /> : <CarFront size={17} />} Offer a seat
                </button>
              </div>
              {rideChoice !== 'none' && <p className="ride-confirmation" role="status">{rideChoice === 'need' ? 'You’re on the ride-interest list.' : 'Your offer to share a seat is listed.'} You can coordinate after connecting.</p>}
            </div>
          )}
          <button className={`button button--primary rsvp-button ${going ? 'is-going' : ''}`} type="button" onClick={onRsvp} aria-pressed={going}>
            {going ? <><Check size={18} /> You’re going</> : 'RSVP for this event'}
          </button>
          {going && <p className="rsvp-confirmation" role="status">You’re on the list. We’ll keep you posted on event updates.</p>}
        </aside>
      </div>
    </div>
  )
}

export type { RideChoice }
