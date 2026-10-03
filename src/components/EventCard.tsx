import { ArrowUpRight, CalendarDays, MapPin } from 'lucide-react'
import type { MeetEvent } from '../data/demo'
import { Avatar } from './Avatar'

export function EventCard({ event, onOpen, compact = false }: { event: MeetEvent; onOpen: () => void; compact?: boolean }) {
  return (
    <button className={`event-card ${compact ? 'event-card--compact' : ''}`} type="button" onClick={onOpen}>
      <span className="event-card__image-wrap">
        <img src={event.image} alt="" className="event-card__image" />
        <span className="event-card__image-date">{event.date.replace(', ', ' · ')}</span>
      </span>
      <span className="event-card__body">
        <span className="event-card__eyebrow">{event.category} <span>·</span> {event.travel} away</span>
        <strong className="event-card__title">{event.shortTitle}</strong>
        <span className="event-card__meta"><CalendarDays size={14} /> {event.time}</span>
        <span className="event-card__meta"><MapPin size={14} /> {event.town} <span className="meta-separator">·</span> {event.source}</span>
        <span className="event-card__footer">
          <span className="avatar-stack" aria-label={`${event.attendees} people going`}>
            <Avatar initials={event.host.initials} color={event.host.color} size="small" />
            <Avatar initials="AR" color="sage" size="small" />
            <Avatar initials="MW" color="gold" size="small" />
          </span>
          <span className="event-card__attendees">{event.attendees} going</span>
          <ArrowUpRight size={16} className="event-card__arrow" />
        </span>
      </span>
    </button>
  )
}
