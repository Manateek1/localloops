import { useMemo, useState } from 'react'
import { Check, Leaf, MapPin, MessageCircle, Search, UserRoundPlus } from 'lucide-react'
import type { FriendshipRow } from '../lib/supabase/database.types'
import type { Profile } from '../data/models'
import { US_STATES } from '../data/models'

type CommunityPageProps = {
  profiles: Profile[]
  profile: Profile | null
  friendships: FriendshipRow[]
  userId: string | null
  stateCode: string | null
  loading: boolean
  onRequest: (profileId: string) => void
  onAccept: (friendshipId: string) => void
  onMessage: (friendshipId: string) => void
  onSignIn: () => void
}

export function CommunityPage({ profiles, profile, friendships, userId, stateCode, loading, onRequest, onAccept, onMessage, onSignIn }: CommunityPageProps) {
  const [query, setQuery] = useState('')
  const sharedInterests = (candidate: Profile) => {
    const candidateInterests = new Set(candidate.interests.map((interest) => interest.trim().toLowerCase()))
    return (profile?.interests ?? []).filter((interest) => candidateInterests.has(interest.trim().toLowerCase()))
  }
  const visible = useMemo(() => profiles.filter((candidate) =>
    `${candidate.display_name} ${candidate.home_region ?? ''} ${candidate.interests.join(' ')} ${candidate.bio ?? ''}`
      .toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sharedInterests(b).length - sharedInterests(a).length), [profiles, profile, query])
  const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'N'
  const stateName = US_STATES.find(([code]) => code === stateCode)?.[1]

  function relationshipWith(profileId: string) {
    if (!userId) return undefined
    return friendships.find((relationship) =>
      (relationship.requester_id === userId && relationship.addressee_id === profileId)
      || (relationship.addressee_id === userId && relationship.requester_id === profileId))
  }

  return (
    <div className="greet-page greet-community-page">
      <div className="greet-page-heading">
        <p className="greet-eyebrow">Real neighbors, shared interests</p>
        <h1>A community grows one hello at a time.</h1>
        <p>{stateName ? `Showing opt-in members who chose ${stateName} as their broad region, plus people connected to you.` : 'Only people who created a LocalLoops account and chose to be discoverable appear here.'}</p>
      </div>
      <label className="greet-community-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names, regions, or interests" /></label>

      {!userId ? (
        <section className="greet-empty-card"><div className="greet-empty-card__icon"><Leaf size={21} /></div><h2>Sign in to meet your neighbors.</h2><p>Community profiles are visible only to signed-in members.</p><button className="greet-button greet-button--primary" type="button" onClick={onSignIn}>Sign in</button></section>
      ) : loading ? <div className="greet-loading" role="status">Finding discoverable neighbors…</div> : (
        <section className="greet-member-list" aria-label="Discoverable LocalLoops members">
          {visible.map((profile) => {
            const relationship = relationshipWith(profile.id)
            const accepted = relationship?.status === 'accepted'
            const incoming = relationship?.status === 'pending' && relationship.addressee_id === userId
            const sent = relationship?.status === 'pending' && relationship.requester_id === userId
            return (
              <article className="greet-member-card" key={profile.id}>
                {profile.avatar_url
                  ? <img className="greet-member-avatar" src={profile.avatar_url} alt="" referrerPolicy="no-referrer" />
                  : <span className="greet-member-avatar greet-member-avatar--initials" aria-hidden="true">{initials(profile.display_name)}</span>}
                <div className="greet-member-card__body">
                  <h2 translate="no">{profile.display_name}</h2>
                  {profile.home_region && <p className="greet-member-location" translate="no"><MapPin size={13} />{profile.home_region}</p>}
                  {profile.bio && <p className="greet-member-bio" translate="no">{profile.bio}</p>}
                  {sharedInterests(profile).length > 0 && <p className="greet-member-match">Shares {sharedInterests(profile).slice(0, 3).join(', ')} with you</p>}
                  {profile.interests.length > 0 && <div className="greet-tag-list" translate="no">{profile.interests.slice(0, 5).map((interest) => <span key={interest}>{interest}</span>)}</div>}
                </div>
                <div className="greet-member-action">
                  {accepted
                    ? <button className="greet-button greet-button--outline" type="button" onClick={() => relationship && onMessage(relationship.id)}><MessageCircle size={15} />Message</button>
                    : incoming
                      ? <button className="greet-button greet-button--soft" type="button" onClick={() => relationship && onAccept(relationship.id)}><Check size={15} />Accept</button>
                      : sent
                        ? <button className="greet-button greet-button--quiet" type="button" disabled>Request sent</button>
                        : <button className="greet-button greet-button--outline" type="button" onClick={() => onRequest(profile.id)}><UserRoundPlus size={15} />Say hello</button>}
                </div>
              </article>
            )
          })}
          {!visible.length && <div className="greet-empty-card greet-empty-card--wide"><div className="greet-empty-card__icon"><Leaf size={21} /></div><h2>{profiles.length ? 'No neighbors match that search yet.' : 'Your community is just getting started.'}</h2><p>{profiles.length ? 'Try another name, region, or interest.' : 'When people nearby join LocalLoops and opt in to discovery, they will appear here. Invite a library, local group, or neighbor to get things started.'}</p></div>}
        </section>
      )}
      <p className="greet-privacy-note"><MapPin size={14} />People choose whether they appear. LocalLoops shows broad regions only, never home addresses or live locations.</p>
    </div>
  )
}
