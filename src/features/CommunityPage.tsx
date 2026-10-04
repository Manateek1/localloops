import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, CalendarDays, Check, Compass, Leaf, MapPin, MessageCircle, Plus, Search, Users, UserRoundPlus } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CommunityEvent, Profile } from '../data/models'
import type { CommunityMemberRow, CommunityRow, EventRow, FriendshipRow, ProfileRow, Database } from '../lib/supabase/database.types'
import { US_STATES } from '../data/models'

type CommunityPageProps = {
  client: SupabaseClient<Database> | null
  profiles: Profile[]
  friendships: FriendshipRow[]
  userId: string | null
  stateCode: string | null
  loading: boolean
  profile: Profile | null
  onRequest: (profileId: string) => void
  onAccept: (friendshipId: string) => void
  onMessage: (friendshipId: string) => void
  onCreateEvent: (communityId: string) => void
  onOpenEvent: (event: CommunityEvent) => void
  onSignIn: () => void
}

type CommunitySection = 'communities' | 'people'
type CommunityList = 'discover' | 'mine'
type CommunitySummary = Pick<CommunityRow, 'id' | 'name' | 'description' | 'region_label' | 'member_count' | 'created_at'>

function formatEventDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function asCommunityEvent(event: EventRow, hostName: string | undefined): CommunityEvent {
  return {
    id: 'community:' + event.id,
    sourceId: event.id,
    source: 'community',
    sourceName: 'Community event',
    sourceUrl: event.source_url,
    title: event.title,
    description: event.description,
    startsAt: event.starts_at,
    timeLabel: null,
    venue: event.venue_label,
    city: event.region_label.split(',')[0]?.trim() ?? event.region_label,
    state: event.state_code,
    stateCode: event.state_code,
    latitude: event.latitude,
    longitude: event.longitude,
    imageUrl: null,
    category: event.category,
    isFree: true,
    communityEventId: event.id,
    hostName,
  }
}

export function CommunityPage({ client, profiles, friendships, userId, stateCode, loading, profile, onRequest, onAccept, onMessage, onCreateEvent, onOpenEvent, onSignIn }: CommunityPageProps) {
  const [section, setSection] = useState<CommunitySection>('communities')
  const [communityList, setCommunityList] = useState<CommunityList>('discover')
  const [query, setQuery] = useState('')
  const [communities, setCommunities] = useState<CommunitySummary[]>([])
  const [memberships, setMemberships] = useState<CommunityMemberRow[]>([])
  const [communityLoading, setCommunityLoading] = useState(true)
  const [communityError, setCommunityError] = useState('')
  const [communityRefresh, setCommunityRefresh] = useState(0)
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [region, setRegion] = useState(profile?.home_region ?? '')
  const [formError, setFormError] = useState('')
  const [formBusy, setFormBusy] = useState(false)
  const [communityActionError, setCommunityActionError] = useState('')
  const [busyCommunityId, setBusyCommunityId] = useState<string | null>(null)
  const [communityEvents, setCommunityEvents] = useState<EventRow[]>([])
  const [communityEventHosts, setCommunityEventHosts] = useState<Record<string, string>>({})
  const [communityEventsLoading, setCommunityEventsLoading] = useState(false)
  const [communityEventsError, setCommunityEventsError] = useState('')

  useEffect(() => {
    if (!client) {
      setCommunities([])
      setMemberships([])
      setCommunityLoading(false)
      return
    }
    let active = true
    setCommunityLoading(true)
    setCommunityError('')
    const membershipRequest = userId
      ? client.from('localloops_community_members').select('*').eq('user_id', userId)
      : Promise.resolve({ data: [] as CommunityMemberRow[], error: null })
    void Promise.all([
      client.from('localloops_communities').select('id, name, description, region_label, member_count, created_at').order('created_at', { ascending: false }).limit(200),
      membershipRequest,
    ]).then(([communityResult, membershipResult]) => {
      if (!active) return
      setCommunities((communityResult.data ?? []) as CommunitySummary[])
      setMemberships((membershipResult.data ?? []) as CommunityMemberRow[])
      setCommunityError(communityResult.error?.message ?? membershipResult.error?.message ?? '')
    }).catch(() => {
      if (active) setCommunityError('Communities could not load. Try again in a moment.')
    }).finally(() => { if (active) setCommunityLoading(false) })
    return () => { active = false }
  }, [client, userId, communityRefresh])

  useEffect(() => {
    if (!client || !selectedCommunityId) {
      setCommunityEvents([])
      setCommunityEventHosts({})
      setCommunityEventsError('')
      return
    }
    let active = true
    setCommunityEventsLoading(true)
    setCommunityEventsError('')
    void (async () => {
      try {
        const { data, error } = await client.from('localloops_events').select('*').eq('community_id', selectedCommunityId)
          .gte('starts_at', new Date().toISOString())
          .order('starts_at', { ascending: true }).limit(50)
        if (!active) return
        if (error) {
          setCommunityEventsError('Community events could not load. Try again in a moment.')
          setCommunityEvents([])
          return
        }
        const rows = (data ?? []) as EventRow[]
        setCommunityEvents(rows)
        const hostIds = [...new Set(rows.map((event) => event.host_id))]
        if (!hostIds.length) return
        const { data: hostProfiles } = await client.from('localloops_profiles').select('id, display_name').in('id', hostIds)
        if (active) {
          setCommunityEventHosts(Object.fromEntries(((hostProfiles ?? []) as Pick<ProfileRow, 'id' | 'display_name'>[]).map((host) => [host.id, host.display_name])))
        }
      } catch {
        if (active) setCommunityEventsError('Community events could not load. Try again in a moment.')
      } finally {
        if (active) setCommunityEventsLoading(false)
      }
    })()
    return () => { active = false }
  }, [client, selectedCommunityId])

  const stateName = US_STATES.find(([code]) => code === stateCode)?.[1]
  const memberCommunityIds = useMemo(() => new Set(memberships.map((membership) => membership.community_id)), [memberships])
  const selectedCommunity = communities.find((community) => community.id === selectedCommunityId) ?? null
  const selectedMembership = memberships.find((membership) => membership.community_id === selectedCommunityId)
  const isSelectedMember = Boolean(selectedMembership)
  const isSelectedOrganizer = selectedMembership?.role === 'owner'
  const visibleCommunities = useMemo(() => communities.filter((community) => {
    const matchesList = communityList === 'discover' || memberCommunityIds.has(community.id)
    const matchesSearch = `${community.name} ${community.description} ${community.region_label ?? ''}`.toLowerCase().includes(query.toLowerCase())
    return matchesList && matchesSearch
  }), [communities, communityList, memberCommunityIds, query])
  const sharedInterests = (candidate: Profile) => {
    const candidateInterests = new Set(candidate.interests.map((interest) => interest.trim().toLowerCase()))
    return (profile?.interests ?? []).filter((interest) => candidateInterests.has(interest.trim().toLowerCase()))
  }
  const visibleProfiles = useMemo(() => profiles.filter((item) =>
    `${item.display_name} ${item.home_region ?? ''} ${item.interests.join(' ')} ${item.bio ?? ''}`
      .toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sharedInterests(b).length - sharedInterests(a).length), [profiles, profile, query])
  const initials = (value: string) => value.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'N'

  function relationshipWith(profileId: string) {
    if (!userId) return undefined
    return friendships.find((relationship) =>
      (relationship.requester_id === userId && relationship.addressee_id === profileId)
      || (relationship.addressee_id === userId && relationship.requester_id === profileId))
  }

  async function createCommunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!userId || !client) {
      onSignIn()
      return
    }
    setFormBusy(true)
    setFormError('')
    const { data, error } = await client.rpc('localloops_create_community', {
      p_name: name.trim(),
      p_description: description.trim(),
      p_region_label: region.trim() || null,
    })
    setFormBusy(false)
    if (error || !data) {
      setFormError(error?.message ?? 'Your community could not be created. Try again.')
      return
    }
    setName('')
    setDescription('')
    setCreateOpen(false)
    setCommunityList('mine')
    setSelectedCommunityId(data)
    setCommunityRefresh((value) => value + 1)
  }

  async function joinCommunity(community: CommunitySummary) {
    if (!userId || !client) {
      onSignIn()
      return
    }
    setBusyCommunityId(community.id)
    setCommunityActionError('')
    const { error } = await client.rpc('localloops_join_community', { p_community_id: community.id })
    setBusyCommunityId(null)
    if (error) {
      setCommunityActionError(error.message)
      return
    }
    setSelectedCommunityId(community.id)
    setCommunityRefresh((value) => value + 1)
  }

  async function leaveCommunity(community: CommunitySummary) {
    if (!userId || !client) return
    setBusyCommunityId(community.id)
    setCommunityActionError('')
    const { error } = await client.rpc('localloops_leave_community', { p_community_id: community.id })
    setBusyCommunityId(null)
    if (error) {
      setCommunityActionError(error.message)
      return
    }
    setSelectedCommunityId(null)
    setCommunityList('discover')
    setCommunityRefresh((value) => value + 1)
  }

  return (
    <div className="greet-page greet-community-page">
      <div className="greet-page-heading">
        <p className="greet-eyebrow">Find your people, make plans together</p>
        <h1>Communities for the things you share.</h1>
        <p>Start or join a local community, then see its upcoming events. One-to-one friend requests and messages stay separate under People and Inbox.</p>
      </div>

      <div className="greet-community-tabs" role="tablist" aria-label="Community area">
        <button type="button" role="tab" aria-selected={section === 'communities'} className={section === 'communities' ? 'is-active' : ''} onClick={() => { setSection('communities'); setSelectedCommunityId(null) }}><Users size={15} />Communities</button>
        <button type="button" role="tab" aria-selected={section === 'people'} className={section === 'people' ? 'is-active' : ''} onClick={() => { setSection('people'); setSelectedCommunityId(null) }}><UserRoundPlus size={15} />People</button>
      </div>

      {section === 'communities' ? (
        <>
          {selectedCommunity ? (
            <section className="greet-community-detail">
              <button className="greet-community-back" type="button" onClick={() => setSelectedCommunityId(null)}><ArrowLeft size={16} />All communities</button>
              <div className="greet-community-detail__header">
                <div>
                  <p className="greet-eyebrow">Community</p>
                  <h2>{selectedCommunity.name}</h2>
                  <p className="greet-community-detail__description">{selectedCommunity.description || 'A place for neighbors to connect and make plans.'}</p>
                  <div className="greet-community-meta">
                    {selectedCommunity.region_label && <span><MapPin size={14} />{selectedCommunity.region_label}</span>}
                    <span><Users size={14} />{selectedCommunity.member_count} of 50 members</span>
                  </div>
                </div>
                {isSelectedMember
                  ? <div className="greet-community-detail__actions">
                      <span className="greet-community-joined"><Check size={14} />You’re a member</span>
                      {isSelectedOrganizer
                        ? <span className="greet-community-owner">Organizer</span>
                        : <button className="greet-button greet-button--quiet" type="button" disabled={busyCommunityId === selectedCommunity.id} onClick={() => void leaveCommunity(selectedCommunity)}>{busyCommunityId === selectedCommunity.id ? 'Leaving…' : 'Leave community'}</button>}
                    </div>
                  : <button className="greet-button greet-button--primary" type="button" disabled={selectedCommunity.member_count >= 50 || busyCommunityId === selectedCommunity.id} onClick={() => void joinCommunity(selectedCommunity)}>{busyCommunityId === selectedCommunity.id ? 'Joining…' : selectedCommunity.member_count >= 50 ? 'Community full' : 'Join community'}</button>}
              </div>

              {communityActionError && <p className="greet-form-message is-error" role="alert">{communityActionError}</p>}
              {selectedCommunity.member_count < 2 && <p className="greet-community-note">This community is just getting started. It needs one more member before it can host its first event.</p>}

              <div className="greet-community-events-heading">
                <div><p className="greet-eyebrow">Make a plan</p><h3>Upcoming community events</h3></div>
              {isSelectedMember && selectedCommunity.member_count >= 2 && <button className="greet-button greet-button--outline" type="button" onClick={() => onCreateEvent(selectedCommunity.id)}><Plus size={15} />Host an event</button>}
              </div>
              {communityEventsLoading ? <div className="greet-loading" role="status">Loading community events…</div>
                : communityEventsError ? <p className="greet-form-message is-error" role="alert">{communityEventsError}</p>
                  : communityEvents.length ? <div className="greet-community-event-list">
                      {communityEvents.map((event) => <button className="greet-community-event" type="button" key={event.id} onClick={() => onOpenEvent(asCommunityEvent(event, communityEventHosts[event.host_id]))}>
                        <span className="greet-community-event__icon"><CalendarDays size={19} /></span>
                        <span className="greet-community-event__body"><strong>{event.title}</strong><small>{formatEventDate(event.starts_at)} · {event.venue_label}</small></span>
                        <span className="greet-community-event__arrow">View</span>
                      </button>)}
                    </div>
                    : <div className="greet-empty-card greet-empty-card--wide"><div className="greet-empty-card__icon"><CalendarDays size={20} /></div><h2>No upcoming events yet.</h2><p>{isSelectedMember && selectedCommunity.member_count >= 2 ? 'Start a plan at a public place and invite your community.' : 'Join the community and help plan its first gathering.'}</p></div>}
            </section>
          ) : (
            <>
              <div className="greet-community-toolbar">
                <div className="greet-community-subtabs" role="tablist" aria-label="Community list">
                  <button type="button" role="tab" aria-selected={communityList === 'discover'} className={communityList === 'discover' ? 'is-active' : ''} onClick={() => setCommunityList('discover')}><Compass size={14} />Discover</button>
                  <button type="button" role="tab" aria-selected={communityList === 'mine'} className={communityList === 'mine' ? 'is-active' : ''} onClick={() => userId ? setCommunityList('mine') : onSignIn()}>My communities{userId ? <span>{memberships.length}</span> : null}</button>
                </div>
                <button className="greet-button greet-button--primary" type="button" onClick={() => userId && client ? setCreateOpen((value) => !value) : onSignIn()}><Plus size={15} />Create community</button>
              </div>

              {createOpen && <section className="greet-community-create">
                <div className="greet-community-create__heading"><div><p className="greet-eyebrow">Bring people together</p><h2>Create a community</h2></div><span>2–50 members</span></div>
                <p>Give your group a clear name and broad area. You’ll be its first member; one more neighbor can join before the group hosts events.</p>
                <form className="greet-form" onSubmit={(event) => void createCommunity(event)}>
                  <label>Community name<input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Weekend hikers" /></label>
                  <label>What is it about?<textarea rows={3} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Share the kinds of meetups or interests people can expect." /></label>
                  <label><span>Town or broad area <small className="greet-field-optional">(optional)</small></span><input maxLength={100} value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Town or region, never a home address" /></label>
                  <p className="greet-form-hint">Some ideas: Weekend hikers · Neighborhood gardeners · Local music fans</p>
                  {formError && <p className="greet-form-message is-error" role="alert">{formError}</p>}
                  <div className="greet-community-create__actions"><button className="greet-button greet-button--quiet" type="button" onClick={() => { setCreateOpen(false); setFormError('') }}>Cancel</button><button className="greet-button greet-button--primary" type="submit" disabled={formBusy}>{formBusy ? 'Creating…' : 'Create community'}</button></div>
                </form>
              </section>}

              <label className="greet-community-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search communities, interests, or towns" /></label>

              {!client ? <section className="greet-empty-card"><div className="greet-empty-card__icon"><Leaf size={21} /></div><h2>Community service is not connected yet.</h2><p>The site needs its LocalLoops database settings before people can create accounts or join communities.</p></section>
                : communityLoading ? <div className="greet-loading" role="status">Finding communities…</div>
                  : communityError ? <section className="greet-empty-card"><div className="greet-empty-card__icon"><Leaf size={21} /></div><h2>Communities could not load.</h2><p>{communityError}</p><button className="greet-button greet-button--outline" type="button" onClick={() => setCommunityRefresh((value) => value + 1)}>Try again</button></section>
                    : <section className="greet-community-list" aria-label={communityList === 'mine' ? 'Your communities' : 'Discover communities'}>
                        {visibleCommunities.map((community) => {
                          const joined = memberCommunityIds.has(community.id)
                          return <article className="greet-community-card" key={community.id}>
                            <button className="greet-community-card__main" type="button" onClick={() => setSelectedCommunityId(community.id)}>
                              <span className="greet-community-card__icon"><Users size={21} /></span>
                              <span className="greet-community-card__body"><strong>{community.name}</strong><small>{community.description || 'A place for neighbors to connect and make plans.'}</small><span className="greet-community-card__meta">{community.region_label && <span><MapPin size={12} />{community.region_label}</span>}<span><Users size={12} />{community.member_count}/50</span>{community.member_count < 2 && <span>Getting started</span>}</span></span>
                            </button>
                            <div className="greet-community-card__actions">
                              {joined ? <span className="greet-community-joined"><Check size={13} />Joined</span>
                                : <button className="greet-button greet-button--outline" type="button" disabled={community.member_count >= 50 || busyCommunityId === community.id} onClick={() => void joinCommunity(community)}>{busyCommunityId === community.id ? 'Joining…' : community.member_count >= 50 ? 'Full' : 'Join'}</button>}
                              {joined && <button className="greet-button greet-button--quiet" type="button" onClick={() => setSelectedCommunityId(community.id)}>Open</button>}
                            </div>
                          </article>
                        })}
                        {!visibleCommunities.length && <div className="greet-empty-card greet-empty-card--wide"><div className="greet-empty-card__icon"><Compass size={20} /></div><h2>{communityList === 'mine' ? 'You haven’t joined a community yet.' : communities.length ? 'No communities match that search.' : 'Start the first community.'}</h2><p>{communityList === 'mine' ? 'Discover a group that sounds like you, or create one and invite a neighbor.' : communities.length ? 'Try another name or town, or start a community of your own.' : 'Create a group around an interest, neighborhood, or local activity. Others can find it and join.'}</p>{communityList === 'mine' ? <button className="greet-button greet-button--outline" type="button" onClick={() => setCommunityList('discover')}>Discover communities</button> : null}</div>}
                      </section>}
              <p className="greet-privacy-note"><MapPin size={14} />Communities show broad areas and member counts. Private profile details remain governed by each member’s discovery settings.</p>
            </>
          )}
        </>
      ) : (
        <>
          <div className="greet-page-heading greet-people-heading"><p className="greet-eyebrow">Real neighbors, shared interests</p><h2>Meet people nearby.</h2><p>{stateName ? `Showing opt-in members who chose ${stateName} as their broad region, plus people connected to you.` : 'Only people who created a LocalLoops account and chose to be discoverable appear here.'}</p></div>
          <label className="greet-community-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names, regions, or interests" /></label>
          {!userId ? (
            <section className="greet-empty-card"><div className="greet-empty-card__icon"><Leaf size={21} /></div><h2>Sign in to meet your neighbors.</h2><p>People choose whether they appear in the member directory.</p><button className="greet-button greet-button--primary" type="button" onClick={onSignIn}>Sign in</button></section>
          ) : loading ? <div className="greet-loading" role="status">Finding discoverable neighbors…</div> : (
            <section className="greet-member-list" aria-label="Discoverable LocalLoops members">
              {visibleProfiles.map((person) => {
                const relationship = relationshipWith(person.id)
                const matchedInterests = sharedInterests(person)
                const accepted = relationship?.status === 'accepted'
                const incoming = relationship?.status === 'pending' && relationship.addressee_id === userId
                const sent = relationship?.status === 'pending' && relationship.requester_id === userId
                return <article className="greet-member-card" key={person.id}>
                  {person.avatar_url ? <img className="greet-member-avatar" src={person.avatar_url} alt="" referrerPolicy="no-referrer" /> : <span className="greet-member-avatar greet-member-avatar--initials" aria-hidden="true">{initials(person.display_name)}</span>}
                  <div className="greet-member-card__body"><h2 translate="no">{person.display_name}</h2>{person.home_region && <p className="greet-member-location" translate="no"><MapPin size={13} />{person.home_region}</p>}{person.bio && <p className="greet-member-bio" translate="no">{person.bio}</p>}{matchedInterests.length > 0 && <p className="greet-member-match">Shares {matchedInterests.slice(0, 3).join(', ')} with you</p>}{person.interests.length > 0 && <div className="greet-tag-list" translate="no">{person.interests.slice(0, 5).map((interest) => <span key={interest}>{interest}</span>)}</div>}</div>
                  <div className="greet-member-action">{accepted ? <button className="greet-button greet-button--outline" type="button" onClick={() => relationship && onMessage(relationship.id)}><MessageCircle size={15} />Message</button> : incoming ? <button className="greet-button greet-button--soft" type="button" onClick={() => relationship && onAccept(relationship.id)}><Check size={15} />Accept</button> : sent ? <button className="greet-button greet-button--quiet" type="button" disabled>Request sent</button> : <button className="greet-button greet-button--outline" type="button" onClick={() => onRequest(person.id)}><UserRoundPlus size={15} />Say hello</button>}</div>
                </article>
              })}
              {!visibleProfiles.length && <div className="greet-empty-card greet-empty-card--wide"><div className="greet-empty-card__icon"><Leaf size={21} /></div><h2>{profiles.length ? 'No neighbors match that search yet.' : 'Your community is just getting started.'}</h2><p>{profiles.length ? 'Try another name, region, or interest.' : 'When people nearby join LocalLoops and opt in to discovery, they will appear here. Invite a library, local group, or neighbor to get things started.'}</p></div>}
            </section>
          )}
          <p className="greet-privacy-note"><MapPin size={14} />People choose whether they appear. LocalLoops shows broad regions only, never home addresses or live locations.</p>
        </>
      )}
    </div>
  )
}
