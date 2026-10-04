import { Suspense, lazy } from 'react'
import { ArrowLeft, CalendarDays, Check, ExternalLink, MapPin, Trees, Users } from 'lucide-react'
import type { CommunityEvent, EventAttendee, LocationResult } from '../data/models'
import type { FriendshipRow } from '../lib/supabase/database.types'
import { useLanguage } from './LanguageProvider'

const MapCanvas = lazy(() => import('../components/MapCanvas').then((module) => ({ default: module.MapCanvas })))

type EventDetailProps = {
  event: CommunityEvent
  going: boolean
  attendees: EventAttendee[]
  friendships: FriendshipRow[]
  userId: string | null
  signedIn: boolean
  busy: boolean
  onBack: () => void
  onRsvp: () => Promise<void>
  onSayHello: (userId: string) => void
  onAcceptConnection: (friendshipId: string) => void
  onSignIn: () => void
}

function eventDate(value: string | null, language: string) {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Intl.DateTimeFormat(language, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(year, month - 1, day))
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat(language, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

export function EventDetail({ event, going, attendees, friendships, userId, signedIn, busy, onBack, onRsvp, onSayHello, onAcceptConnection, onSignIn }: EventDetailProps) {
  const { language } = useLanguage()
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
  const dateLabel = eventDate(event.startsAt, language)
  const distance = event.distanceMiles === undefined ? '' : Math.round(event.distanceMiles) + ' miles from your search location'

  return (
    <div className="greet-page greet-event-detail">
      <button className="greet-back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> Back to Explore</button>
      <div className="greet-event-detail__grid">
        <section className="greet-event-detail__main">
          <div className="greet-event-detail__hero">
            {event.imageUrl
              ? <img src={event.imageUrl} alt="" referrerPolicy="no-referrer" />
              : <div className="greet-event-detail__fallback"><Trees size={54} strokeWidth={1.2} /><span>Out in the community</span></div>}
            <span className="greet-event-detail__source" translate="no">{event.sourceName}</span>
          </div>
          <div className="greet-event-detail__intro">
            <span className="greet-event-card__category" translate="no">{event.category}</span>
            <h1 translate="no">{event.title}</h1>
            {event.description && <p translate="no">{event.description}</p>}
          </div>
          <div className="greet-event-facts">
            <div><CalendarDays size={18} /><span><strong>{dateLabel ? <span translate="no">{dateLabel}</span> : 'Date to be confirmed'}{event.timeLabel && <span translate="no"> · {event.timeLabel}</span>}</strong><small>Time shown as listed by the organizer</small></span></div>
            <div><MapPin size={18} /><span><strong translate="no">{event.venue}</strong><small><span translate="no">{[event.city, event.stateCode].filter(Boolean).join(', ')}</span> · public event location</small></span></div>
            {distance && <div><Trees size={18} /><span><strong>{distance}</strong><small>Based on the place you searched</small></span></div>}
          </div>
          <Suspense fallback={<div className="greet-map greet-map--loading" role="status">Loading the event map…</div>}><MapCanvas location={eventLocation} events={[event]} onOpenEvent={() => undefined} /></Suspense>
          <p className="greet-map-privacy">The map marks the public venue or broad meetup area. Member home locations are never shown.</p>
        </section>
        <aside className="greet-event-action">
          <div className="greet-event-source-card"><span>EVENT SOURCE</span><strong translate="no">{event.sourceName}</strong><small>{event.source === 'community' ? event.hostName ? <>Hosted by <span translate="no">{event.hostName}</span></> : 'A local gathering shared by a LocalLoops member.' : 'Details are provided by the event organizer.'}</small>
            {event.sourceUrl && <a href={event.sourceUrl} target="_blank" rel="noreferrer">Open original listing <ExternalLink size={14} /></a>}
          </div>
          {event.source === 'community' && event.hostName && <p className="greet-community-event-note"><Users size={15} />Shared by <span translate="no">{event.hostName}</span>. Meetups are public.</p>}
          <button className={'greet-button greet-button--primary greet-rsvp ' + (going ? 'is-going' : '')} type="button" disabled={busy} onClick={() => signedIn ? void onRsvp() : onSignIn()}>
            {going ? <><Check size={18} />You’re going</> : signedIn ? 'I’m going' : 'Sign in to join'}
          </button>
          <p className="greet-rsvp-note">This shares that you plan to attend. It is not a ticket or formal registration.</p>
          <section className="greet-event-attendees" aria-label="People going to this event">
            <h2>{signedIn ? `${attendees.length} ${attendees.length === 1 ? 'person' : 'people'} going` : 'See who’s going'}</h2>
            {!signedIn
              ? <p>Sign in to see the member attendance list.</p>
              : attendees.length
                ? <ul>{attendees.map((attendee) => {
                  const mine = attendee.userId === userId
                  const relationship = friendships.find((item) =>
                    (item.requester_id === userId && item.addressee_id === attendee.userId)
                    || (item.addressee_id === userId && item.requester_id === attendee.userId))
                  const incoming = relationship?.status === 'pending' && relationship.addressee_id === userId
                  const sent = relationship?.status === 'pending' && relationship.requester_id === userId
                  return <li key={attendee.userId}>
                    <span translate={mine ? undefined : 'no'}>{attendee.displayName ?? 'LocalLoops member'}</span>
                    {!mine && attendee.displayName && (relationship?.status === 'accepted'
                      ? <small>Connected</small>
                      : incoming
                        ? <button type="button" className="greet-text-button" onClick={() => relationship && onAcceptConnection(relationship.id)}>Accept</button>
                        : sent
                          ? <small>Request sent</small>
                          : <button type="button" className="greet-text-button" onClick={() => onSayHello(attendee.userId)}>Say hello</button>)}
                  </li>
                })}</ul>
                : <p>Be the first to say you’re going.</p>}
            <small className="greet-event-attendees__privacy">Attendance is visible to signed-in members. Names appear for discoverable neighbors and your connections.</small>
          </section>
          <div className="greet-event-safety"><MapPin size={16} /><p>Check the original listing before you go. Public-event times and venue details can change.</p></div>
        </aside>
      </div>
    </div>
  )
}
