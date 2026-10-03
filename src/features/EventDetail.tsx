import { Suspense, lazy, useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, CalendarDays, CarFront, Check, ExternalLink, MapPin, Trees, Users } from 'lucide-react'
import type { CommunityEvent, EventSource, LocationResult } from '../data/models'
import type { FriendshipRow } from '../lib/supabase/database.types'

const MapCanvas = lazy(() => import('../components/MapCanvas').then((module) => ({ default: module.MapCanvas })))

export type RidePlan = {
  id: string
  user_id: string
  event_source: EventSource | null
  kind: 'request' | 'offer'
  pickup_area: string
  seats_available: number | null
  display_name?: string
}

type EventDetailProps = {
  event: CommunityEvent
  going: boolean
  ridePost: RidePlan | null
  ridePosts: RidePlan[]
  friendships: FriendshipRow[]
  userId: string | null
  signedIn: boolean
  busy: boolean
  onBack: () => void
  onRsvp: () => Promise<void>
  onRide: (kind: 'request' | 'offer', pickupArea: string, seats: number | null) => Promise<boolean>
  onSayHello: (userId: string) => void
  onAcceptConnection: (friendshipId: string) => void
  onMessage: (friendshipId: string) => void
  onSignIn: () => void
}

function eventDate(value: string | null) {
  if (!value) return 'Date to be confirmed'
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Date to be confirmed'
    : date.toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function EventDetail({ event, going, ridePost, ridePosts, friendships, userId, signedIn, busy, onBack, onRsvp, onRide, onSayHello, onAcceptConnection, onMessage, onSignIn }: EventDetailProps) {
  const [rideKind, setRideKind] = useState<'request' | 'offer' | null>(null)
  const [pickupArea, setPickupArea] = useState(ridePost?.pickup_area ?? '')
  const [seats, setSeats] = useState(1)
  const [rideMessage, setRideMessage] = useState('')
  const eventLocation: LocationResult = {
    id: event.id,
    label: [event.city, event.stateCode].filter(Boolean).join(', '),
    city: event.city,
    state: event.state,
    stateCode: event.stateCode,
    latitude: event.latitude,
    longitude: event.longitude,
    zoom: 12,
  }
  const distance = event.distanceMiles === undefined ? '' : Math.round(event.distanceMiles) + ' miles from your search area'

  useEffect(() => {
    setPickupArea(ridePost?.pickup_area ?? '')
    setRideKind(null)
    setRideMessage('')
  }, [event.id, ridePost?.pickup_area])

  async function submitRide(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    if (!rideKind) return
    if (!signedIn) {
      onSignIn()
      return
    }
    if (await onRide(rideKind, pickupArea.trim(), rideKind === 'offer' ? seats : null)) {
      setRideMessage('Your ride note is saved for this public event.')
      setRideKind(null)
    }
  }

  return (
    <div className="greet-page greet-event-detail">
      <button className="greet-back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> Back to Explore</button>
      <div className="greet-event-detail__grid">
        <section className="greet-event-detail__main">
          <div className="greet-event-detail__hero">
            {event.imageUrl
              ? <img src={event.imageUrl} alt="" referrerPolicy="no-referrer" />
              : <div className="greet-event-detail__fallback"><Trees size={54} strokeWidth={1.2} /><span>Out in the community</span></div>}
            <span className="greet-event-detail__source">{event.sourceName}</span>
          </div>
          <div className="greet-event-detail__intro">
            <span className="greet-event-card__category">{event.category}</span>
            <h1>{event.title}</h1>
            {event.description && <p>{event.description}</p>}
          </div>
          <div className="greet-event-facts">
            <div><CalendarDays size={18} /><span><strong>{eventDate(event.startsAt)}{event.timeLabel ? ' · ' + event.timeLabel : ''}</strong><small>Time shown as listed by the organizer</small></span></div>
            <div><MapPin size={18} /><span><strong>{event.venue}</strong><small>{[event.city, event.stateCode].filter(Boolean).join(', ')} · approximate map pin</small></span></div>
            {distance && <div><Trees size={18} /><span><strong>{distance}</strong><small>Based on your town or ZIP search</small></span></div>}
          </div>
          <Suspense fallback={<div className="greet-map greet-map--loading" role="status">Loading the event map…</div>}><MapCanvas location={eventLocation} events={[event]} onOpenEvent={() => undefined} /></Suspense>
          <p className="greet-map-privacy">The map marks the public venue or broad meetup area. Member home locations are never shown.</p>
          <section className="greet-event-ride-section">
            <div className="greet-section-heading"><span className="greet-section-icon"><CarFront size={18} /></span><div><h2>Getting there together</h2><p>Coordinate around a public pickup place, never a home address.</p></div></div>
            {!signedIn && <button type="button" className="greet-text-button" onClick={onSignIn}>Sign in to coordinate a ride</button>}
            {ridePosts.length > 0 ? (
              <div className="greet-ride-list">
                {ridePosts.map((post) => {
                  const relationship = userId ? friendships.find((item) =>
                    (item.requester_id === userId && item.addressee_id === post.user_id)
                    || (item.addressee_id === userId && item.requester_id === post.user_id)) : undefined
                  const incoming = relationship?.status === 'pending' && relationship.addressee_id === userId
                  const sent = relationship?.status === 'pending' && relationship.requester_id === userId
                  const mine = post.user_id === userId
                  return <div className="greet-ride-item" key={post.id}>
                    <div className="greet-ride-row"><span className={post.kind === 'offer' ? 'is-offer' : 'is-request'}>{post.kind === 'offer' ? 'Seat offered' : 'Ride requested'}</span><strong translate="no">{post.pickup_area}</strong>{post.kind === 'offer' && <small>{post.seats_available} {post.seats_available === 1 ? 'seat' : 'seats'}</small>}</div>
                    <div className="greet-ride-contact"><span translate={mine ? undefined : 'no'}>{mine ? 'Your ride plan' : post.display_name ?? 'LocalLoops member'}</span>
                      {!mine && signedIn && (relationship?.status === 'accepted'
                        ? <button className="greet-button greet-button--quiet" type="button" onClick={() => relationship && onMessage(relationship.id)}>Message</button>
                        : incoming
                          ? <button className="greet-button greet-button--soft" type="button" onClick={() => relationship && onAcceptConnection(relationship.id)}>Accept</button>
                          : sent
                            ? <button className="greet-button greet-button--quiet" type="button" disabled>Request sent</button>
                            : <button className="greet-button greet-button--outline" type="button" onClick={() => onSayHello(post.user_id)}>Say hello</button>)}
                    </div>
                  </div>
                })}
              </div>
            ) : signedIn && <p className="greet-ride-empty">No one has shared a ride plan yet. Add yours when you’re ready.</p>}
            {signedIn && <div className="greet-ride-actions">
              <button type="button" className="greet-button greet-button--outline" onClick={() => setRideKind('request')}>{ridePost?.kind === 'request' ? 'Update ride request' : 'I need a ride'}</button>
              <button type="button" className="greet-button greet-button--soft" onClick={() => setRideKind('offer')}>{ridePost?.kind === 'offer' ? 'Update seat offer' : 'I can offer a seat'}</button>
            </div>}
            {rideKind && <form className="greet-ride-form" onSubmit={submitRide}>
              <label>Public pickup area<input required minLength={2} maxLength={100} value={pickupArea} onChange={(event) => setPickupArea(event.target.value)} placeholder="Town center, library, or another public place" /></label>
              {rideKind === 'offer' && <label>Seats available<select value={seats} onChange={(event) => setSeats(Number(event.target.value))}><option value={1}>1 seat</option><option value={2}>2 seats</option><option value={3}>3 seats</option><option value={4}>4 seats</option><option value={5}>5 seats</option></select></label>}
              <div><button className="greet-button greet-button--primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save ride plan'}</button><button className="greet-button greet-button--quiet" type="button" onClick={() => setRideKind(null)}>Cancel</button></div>
              <small>Only share a broad public meeting spot. Never enter a street address or home location.</small>
            </form>}
            {rideMessage && <p className="greet-form-message" role="status">{rideMessage}</p>}
          </section>
        </section>
        <aside className="greet-event-action">
          <div className="greet-event-source-card"><span>EVENT SOURCE</span><strong>{event.sourceName}</strong><small>{event.source === 'community' ? event.hostName ? <>Hosted by <span translate="no">{event.hostName}</span></> : 'A local gathering shared by a LocalLoops member.' : 'Details are provided by the event organizer.'}</small>
            {event.sourceUrl && <a href={event.sourceUrl} target="_blank" rel="noreferrer">Open original listing <ExternalLink size={14} /></a>}
          </div>
          {event.source === 'community' && event.hostName && <p className="greet-community-event-note"><Users size={15} />Shared by <span translate="no">{event.hostName}</span>. Meetups are public.</p>}
          <button className={'greet-button greet-button--primary greet-rsvp ' + (going ? 'is-going' : '')} type="button" disabled={busy} onClick={() => signedIn ? void onRsvp() : onSignIn()}>
            {going ? <><Check size={18} />You’re going</> : signedIn ? 'RSVP for this event' : 'Sign in to RSVP'}
          </button>
          {going && <p className="greet-rsvp-note" role="status">Your RSVP is saved to your account.</p>}
          <div className="greet-event-safety"><MapPin size={16} /><p>Check the original listing before you go. Public-event times and venue details can change.</p></div>
        </aside>
      </div>
    </div>
  )
}
