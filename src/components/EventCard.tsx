import { ArrowUpRight, CalendarDays, MapPin, Ticket, Trees } from 'lucide-react'
import type { CommunityEvent } from '../data/models'
import { useLanguage } from '../features/LanguageProvider'

function eventDate(value: string | null, language: string) {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Intl.DateTimeFormat(language, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(year, month - 1, day))
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat(language, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date)
}

export function EventCard({ event, onOpen, compact = false }: { event: CommunityEvent; onOpen: () => void; compact?: boolean }) {
  const { language } = useLanguage()
  const location = [event.city, event.stateCode].filter(Boolean).join(', ')
  const dateLabel = eventDate(event.startsAt, language)
  return (
    <article className={'greet-event-card ' + (compact ? 'is-compact' : '')}>
      <button className="greet-event-card__open" type="button" onClick={onOpen} aria-label={'Open ' + event.title}>
        <span className="greet-event-card__visual">
          {event.imageUrl
            ? <img src={event.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
            : <span className={'greet-event-card__placeholder greet-event-card__placeholder--' + event.source}><Trees size={28} strokeWidth={1.5} /></span>}
          <span className="greet-event-card__source" translate="no">{event.sourceName}</span>
        </span>
        <span className="greet-event-card__body">
          <span className="greet-event-card__category" translate="no">{event.category}</span>
          <strong className="greet-event-card__title" translate="no">{event.title}</strong>
          <span className="greet-event-card__meta"><CalendarDays size={15} />{dateLabel ? <span translate="no">{dateLabel}</span> : 'Date to be confirmed'}{event.timeLabel && <span translate="no"> · {event.timeLabel}</span>}</span>
          <span className="greet-event-card__meta"><MapPin size={15} /><span translate="no">{event.venue}{location ? ' · ' + location : ''}</span></span>
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
