import { ArrowUpRight, CalendarDays, MapPin, Ticket, Trees } from 'lucide-react'
import type { CommunityEvent } from '../data/models'

function eventDate(value: string | null) {
  if (!value) return 'Date to be confirmed'
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date to be confirmed' : date.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export function EventCard({ event, onOpen, compact = false }: { event: CommunityEvent; onOpen: () => void; compact?: boolean }) {
  const location = [event.city, event.stateCode].filter(Boolean).join(', ')
  return (
    <article className={'greet-event-card ' + (compact ? 'is-compact' : '')}>
      <button className="greet-event-card__open" type="button" onClick={onOpen} aria-label={'Open ' + event.title}>
        <span className="greet-event-card__visual">
          {event.imageUrl
            ? <img src={event.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
            : <span className={'greet-event-card__placeholder greet-event-card__placeholder--' + event.source}><Trees size={28} strokeWidth={1.5} /></span>}
          <span className="greet-event-card__source">{event.sourceName}</span>
        </span>
        <span className="greet-event-card__body">
          <span className="greet-event-card__category">{event.category}</span>
          <strong className="greet-event-card__title">{event.title}</strong>
          <span className="greet-event-card__meta"><CalendarDays size={15} />{eventDate(event.startsAt)}{event.timeLabel ? ' · ' + event.timeLabel : ''}</span>
          <span className="greet-event-card__meta"><MapPin size={15} />{event.venue}{location ? ' · ' + location : ''}</span>
          <span className="greet-event-card__footer">
            <span>{event.distanceMiles === undefined ? 'Local event' : Math.round(event.distanceMiles) + ' mi away'}</span>
            {event.isFree === true && <span className="greet-free-badge">Free</span>}
            {event.isFree === false && <span className="greet-ticket-note"><Ticket size={13} />Ticketed</span>}
            <ArrowUpRight size={16} className="greet-event-card__arrow" />
          </span>
        </span>
      </button>
    </article>
  )
}
