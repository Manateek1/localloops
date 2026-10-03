import { useMemo, useState } from 'react'
import { CalendarDays, Check, MapPin, MessageCircle, Search, UserRoundPlus } from 'lucide-react'
import type { CommunityMode, DemoPerson, MeetEvent } from '../data/demo'
import { Avatar } from '../components/Avatar'

export type FriendStatus = 'none' | 'pending' | 'incoming' | 'accepted'

const citySharedEvents: Record<string, string> = {
  lena: 'twin-peaks-hike',
  mark: 'lake-merritt-kayak',
  olivia: 'dolores-potluck',
  ben: 'oakland-art-walk',
  tessa: 'dolores-potluck',
  jamie: 'twin-peaks-hike',
  alex: 'oakland-art-walk',
}

type PeoplePageProps = {
  mode: CommunityMode
  people: DemoPerson[]
  events: MeetEvent[]
  friendStatuses: Record<string, FriendStatus>
  onSendRequest: (personId: string) => void
  onAcceptRequest: (personId: string) => void
  onOpenMessage: (personId: string) => void
}

export function PeoplePage({ mode, people, events, friendStatuses, onSendRequest, onAcceptRequest, onOpenMessage }: PeoplePageProps) {
  const [tab, setTab] = useState<'for-you' | 'nearby'>('for-you')
  const [interestFilter, setInterestFilter] = useState('All interests')
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  const visiblePeople = useMemo(() => {
    return people
      .filter((person) => {
        const textMatches = `${person.name} ${person.town} ${person.interests.join(' ')}`.toLowerCase().includes(query.toLowerCase())
        const interestMatches = interestFilter === 'All interests' || person.interests.some((interest) => interest.toLowerCase().includes(interestFilter.toLowerCase()))
        return textMatches && interestMatches
      })
      .sort((a, b) => tab === 'nearby' ? Number.parseInt(a.travel) - Number.parseInt(b.travel) : 0)
  }, [people, query, interestFilter, tab])

const interestFilters = ['All interests', 'Hiking', 'Food', 'Kayaking']

  return (
    <div className="page-content people-page">
      <div className="page-heading-row">
        <div>
          <p className="page-eyebrow">Shared interests make a good start</p>
          <h1>Your kind of people, a little closer.</h1>
          <p className="page-heading-copy">See what you have in common and which public events you might enjoy together.</p>
        </div>
        <button className="explore-search-toggle" type="button" onClick={() => setSearchOpen((open) => !open)} aria-label="Search people"><Search size={18} /><span>Find people</span></button>
      </div>
      {searchOpen && <label className="search-field"><Search size={17} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, town, or interest" />{query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search">×</button>}</label>}

      <div className="people-toolbar">
        <div className="people-tabs" role="tablist" aria-label="People sort">
          <button type="button" className={tab === 'for-you' ? 'is-active' : ''} onClick={() => setTab('for-you')} role="tab" aria-selected={tab === 'for-you'}>For you</button>
          <button type="button" className={tab === 'nearby' ? 'is-active' : ''} onClick={() => setTab('nearby')} role="tab" aria-selected={tab === 'nearby'}>Nearby</button>
        </div>
        <div className="people-filters" role="group" aria-label="Filter people by interest">
          {interestFilters.map((filter) => <button key={filter} type="button" onClick={() => setInterestFilter(filter)} className={`filter-chip ${interestFilter === filter ? 'is-active' : ''}`} aria-pressed={interestFilter === filter}>{filter}</button>)}
        </div>
      </div>

      <section className="people-list" aria-label="People you may like">
        {visiblePeople.map((person) => {
          const status = friendStatuses[person.id] ?? 'none'
          const sharedEventId = mode === 'city' ? citySharedEvents[person.id] : person.sharedEventId
          const sharedEvent = events.find((event) => event.id === sharedEventId) ?? events[0]
          const location = mode === 'city' ? (person.id === 'mark' || person.id === 'ben' ? 'Oakland' : 'San Francisco') : person.town
          const travel = mode === 'city' ? (person.id === 'mark' ? '18 min' : '12 min') : person.travel
          return (
            <article className="person-row" key={person.id}>
              <Avatar initials={person.initials} color={person.color} size="large" />
              <div className="person-row__main">
                <div className="person-row__title"><h2>{person.name}</h2><span className="person-location"><MapPin size={13} /> {location} · {travel}</span></div>
                <p className="person-bio">{person.bio}</p>
                <div className="person-interests">{person.interests.map((interest) => <span key={interest}>{interest}</span>)}</div>
                {sharedEvent && <p className="shared-event"><CalendarDays size={14} /><span>Also going to <strong>{sharedEvent.shortTitle}</strong></span></p>}
              </div>
              <div className="person-row__action">
                {status === 'accepted' ? (
                  <button className="button button--outline" type="button" onClick={() => onOpenMessage(person.id)}><MessageCircle size={16} /> Message</button>
                ) : status === 'incoming' ? (
                  <button className="button button--soft" type="button" onClick={() => onAcceptRequest(person.id)}><Check size={16} /> Accept request</button>
                ) : status === 'pending' ? (
                  <button className="button button--quiet" type="button" disabled><Check size={16} /> Request sent</button>
                ) : (
                  <button className="button button--outline" type="button" onClick={() => onSendRequest(person.id)}><UserRoundPlus size={16} /> Add friend</button>
                )}
              </div>
            </article>
          )
        })}
        {!visiblePeople.length && <div className="empty-events"><Search size={19} /><strong>No one found yet</strong><span>Try a different interest or search.</span></div>}
      </section>
      <p className="people-privacy-note">Only broad town context is shown. Member home addresses and exact locations stay private.</p>
    </div>
  )
}
