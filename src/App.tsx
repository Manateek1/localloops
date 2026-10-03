import { useCallback, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { BottomNav, Header, type Page } from './components/Navigation'
import { AccountPage } from './features/AccountPage'
import { AuthModal } from './features/AuthModal'
import { CommunityPage } from './features/CommunityPage'
import { CreateEventModal } from './features/CreateEventModal'
import { EventDetail, type RidePlan } from './features/EventDetail'
import { ExplorePage } from './features/ExplorePage'
import { InboxPage } from './features/InboxPage'
import { MessagesPage } from './features/MessagesPage'
import { getCommunityEvents, getSourcedEvents, sortNearby, type EventFeedState } from './lib/events'
import { searchLocation } from './lib/location'
import type { CommunityEvent, EventSource, LocationResult, Profile } from './data/models'
import type { FriendshipRow, MessageRow, ProfileRow } from './lib/supabase/database.types'
import { supabaseClient } from './lib/supabase/client'
import { TranslationNotice } from './features/LanguageProvider'

const noSources: EventFeedState = { ticketmaster: 'not_configured', nps: 'not_configured' }

function App() {
  const [page, setPage] = useState<Page>('explore')
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileRefresh, setProfileRefresh] = useState(0)
  const [authOpen, setAuthOpen] = useState(false)
  const [eventComposerOpen, setEventComposerOpen] = useState(false)
  const [location, setLocation] = useState<LocationResult | null>(null)
  const [locationQuery, setLocationQuery] = useState('')
  const [radius, setRadius] = useState(100)
  const [events, setEvents] = useState<CommunityEvent[]>([])
  const [feedSources, setFeedSources] = useState<EventFeedState>(noSources)
  const [feedErrors, setFeedErrors] = useState<string[]>([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState(false)
  const [socialRefresh, setSocialRefresh] = useState(0)
  const [discoverableProfiles, setDiscoverableProfiles] = useState<Profile[]>([])
  const [friendships, setFriendships] = useState<FriendshipRow[]>([])
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(null)
  const [going, setGoing] = useState(false)
  const [ridePost, setRidePost] = useState<RidePlan | null>(null)
  const [ridePosts, setRidePosts] = useState<RidePlan[]>([])
  const [eventBusy, setEventBusy] = useState(false)
  const [messageSending, setMessageSending] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!supabaseClient) {
      setAuthLoading(false)
      return
    }
    let active = true
    void supabaseClient.auth.getSession().then(({ data }) => {
      if (active) {
        setUser(data.session?.user ?? null)
        setAuthLoading(false)
      }
    })
    const { data } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session) {
        setProfile(null)
        setFriendships([])
        setMessages([])
        setDiscoverableProfiles([])
        setSelectedThreadId(null)
      }
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabaseClient || !user) {
      setProfile(null)
      return
    }
    let active = true
    void supabaseClient.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => {
      if (active) setProfile((data as Profile | null) ?? null)
    })
    return () => { active = false }
  }, [user?.id, profileRefresh])

  useEffect(() => {
    if (!location) {
      setEvents([])
      setFeedSources(noSources)
      setFeedErrors([])
      return
    }
    let active = true
    setFeedLoading(true)
    void Promise.all([
      getSourcedEvents(location, radius),
      getCommunityEvents(supabaseClient, location, radius),
    ]).then(([feed, community]) => {
      if (!active) return
      setEvents(sortNearby([...feed.events, ...community]))
      setFeedSources(feed.sources)
      setFeedErrors(feed.errors)
    }).catch(() => {
      if (!active) return
      setEvents([])
      setFeedErrors(['Event search could not connect. Try again in a moment.'])
    }).finally(() => { if (active) setFeedLoading(false) })
    return () => { active = false }
  }, [location, radius, profileRefresh])

  useEffect(() => {
    if (!supabaseClient || !user || !['community', 'inbox', 'messages'].includes(page)) {
      setSocialLoading(false)
      return
    }
    let active = true
    setSocialLoading(true)
    const client = supabaseClient
    const load = async () => {
      let profileQuery = client.from('profiles').select('*').eq('discoverable', true).neq('id', user.id)
      if (location?.stateCode) profileQuery = profileQuery.eq('state_code', location.stateCode)
      const [profileResult, friendshipResult] = await Promise.all([
        profileQuery.order('created_at', { ascending: false }).limit(100),
        client.from('friendships').select('*').or('requester_id.eq.' + user.id + ',addressee_id.eq.' + user.id).order('created_at', { ascending: false }),
      ])
      if (!active) return
      const realProfiles = (profileResult.data ?? []) as ProfileRow[]
      const relationRows = (friendshipResult.data ?? []) as FriendshipRow[]
      setFriendships(relationRows)
      const linkedProfileIds = [...new Set(relationRows.flatMap((row) => [row.requester_id, row.addressee_id]).filter((id) => id !== user.id))]
      const { data: linkedProfiles } = linkedProfileIds.length
        ? await client.from('profiles').select('*').in('id', linkedProfileIds)
        : { data: [] }
      const profilesById = new Map<string, ProfileRow>()
      ;[...realProfiles, ...((linkedProfiles ?? []) as ProfileRow[])].forEach((item) => profilesById.set(item.id, item))
      setDiscoverableProfiles([...profilesById.values()])
      const threadIds = relationRows.filter((row) => row.status === 'accepted').map((row) => row.id)
      if (!threadIds.length) {
        setMessages([])
        return
      }
      const { data: messageRows } = await client.from('messages').select('*').in('friendship_id', threadIds).order('created_at', { ascending: true }).limit(500)
      if (active) setMessages((messageRows ?? []) as MessageRow[])
    }
    void load().catch(() => {
      if (active) {
        setDiscoverableProfiles([])
        setFriendships([])
        setMessages([])
      }
    }).finally(() => { if (active) setSocialLoading(false) })
    return () => { active = false }
  }, [user?.id, page, socialRefresh, location?.stateCode])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const profilesById = useMemo(() => {
    const map = new Map<string, Profile>()
    if (profile) map.set(profile.id, profile)
    discoverableProfiles.forEach((item) => map.set(item.id, item))
    return map
  }, [profile, discoverableProfiles])

  const selectedThread = friendships.find((friendship) => friendship.id === selectedThreadId) ?? null
  const threadUserId = selectedThread && user
    ? (selectedThread.requester_id === user.id ? selectedThread.addressee_id : selectedThread.requester_id)
    : null
  const threadProfileName = threadUserId ? profilesById.get(threadUserId)?.display_name ?? 'LocalLoops neighbor' : 'LocalLoops neighbor'
  const threadMessages = selectedThreadId ? messages.filter((message) => message.friendship_id === selectedThreadId) : []

  const notify = (message: string) => setToast(message)

  const openSignIn = () => setAuthOpen(true)
  const navigate = (nextPage: Page) => {
    setPage(nextPage)
    if (nextPage === 'messages' && !selectedThreadId) setPage('inbox')
  }

  const submitLocation = async (query: string) => {
    setLocationQuery(query)
    try {
      const nextLocation = await searchLocation(query)
      setLocation(nextLocation)
      notify('Showing real events near ' + nextLocation.label + '.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'We could not find that place.')
    }
  }

  const openEvent = (event: CommunityEvent) => {
    setSelectedEvent(event)
    setPage('event')
  }

  const refreshSocial = () => setSocialRefresh((value) => value + 1)

  const sendConnectionRequest = async (profileId: string) => {
    if (!supabaseClient || !user) return openSignIn()
    const existing = friendships.find((item) =>
      (item.requester_id === user.id && item.addressee_id === profileId)
      || (item.requester_id === profileId && item.addressee_id === user.id))
    if (existing) return
    const { error } = await supabaseClient.from('friendships').insert({ requester_id: user.id, addressee_id: profileId })
    if (error) notify(error.message)
    else {
      notify('Your hello is on its way.')
      refreshSocial()
    }
  }

  const acceptConnectionRequest = async (friendshipId: string) => {
    if (!supabaseClient || !user) return
    const { error } = await supabaseClient.from('friendships').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', friendshipId).eq('addressee_id', user.id)
    if (error) notify(error.message)
    else {
      notify('You’re connected. A conversation is ready when you are.')
      refreshSocial()
    }
  }

  const dismissConnectionRequest = async (friendshipId: string) => {
    if (!supabaseClient || !user) return
    const { error } = await supabaseClient.from('friendships').delete().eq('id', friendshipId)
    if (error) notify(error.message)
    else refreshSocial()
  }

  const openThread = (friendshipId: string) => {
    setSelectedThreadId(friendshipId)
    setPage('messages')
  }

  const sendMessage = async (text: string): Promise<boolean> => {
    if (!supabaseClient || !user || !selectedThreadId) return false
    setMessageSending(true)
    const { error } = await supabaseClient.from('messages').insert({ friendship_id: selectedThreadId, sender_id: user.id, body: text })
    setMessageSending(false)
    if (error) {
      notify(error.message)
      return false
    }
    refreshSocial()
    return true
  }

  const loadEventSocial = useCallback(async () => {
    if (!supabaseClient || !selectedEvent || !user) {
      setGoing(false)
      setRidePost(null)
      setRidePosts([])
      return
    }
    const event = selectedEvent
    const isCommunity = event.source === 'community' && Boolean(event.communityEventId)
    const [rsvpResult, rideResult, friendshipResult] = await Promise.all([
      isCommunity
        ? supabaseClient.from('event_rsvps').select('event_id,user_id,status,created_at').eq('event_id', event.communityEventId!).eq('user_id', user.id).maybeSingle()
        : supabaseClient.from('external_event_rsvps').select('event_source,source_event_id,user_id,status,created_at').eq('event_source', event.source as Exclude<EventSource, 'community'>).eq('source_event_id', event.sourceId).eq('user_id', user.id).maybeSingle(),
      isCommunity
        ? supabaseClient.from('ride_posts').select('id,event_id,user_id,kind,pickup_area,seats_available,created_at').eq('event_id', event.communityEventId!)
        : supabaseClient.from('external_ride_posts').select('id,event_source,source_event_id,user_id,kind,pickup_area,seats_available,created_at').eq('event_source', event.source as Exclude<EventSource, 'community'>).eq('source_event_id', event.sourceId),
      supabaseClient.from('friendships').select('*').or('requester_id.eq.' + user.id + ',addressee_id.eq.' + user.id).order('created_at', { ascending: false }),
    ])
    setGoing(rsvpResult.data?.status === 'going')
    const rideRows = rideResult.data ?? []
    const memberIds = [...new Set(rideRows.map((row: any) => row.user_id))]
    const { data: memberProfiles } = memberIds.length
      ? await supabaseClient.from('profiles').select('id,display_name').in('id', memberIds)
      : { data: [] }
    const namesById = new Map(((memberProfiles ?? []) as Pick<ProfileRow, 'id' | 'display_name'>[]).map((row) => [row.id, row.display_name]))
    const rides = rideRows.map((row: any) => ({
      id: row.id ?? row.user_id,
      user_id: row.user_id,
      event_source: row.event_source ?? null,
      kind: row.kind,
      pickup_area: row.pickup_area,
      seats_available: row.seats_available,
      display_name: namesById.get(row.user_id),
    })) as RidePlan[]
    setFriendships((friendshipResult.data ?? []) as FriendshipRow[])
    setRidePosts(rides)
    setRidePost(rides.find((item) => item.user_id === user.id) ?? null)
  }, [selectedEvent, user?.id])

  useEffect(() => {
    if (page !== 'event') return
    void loadEventSocial().catch(() => {
      setGoing(false)
      setRidePost(null)
      setRidePosts([])
    })
  }, [page, loadEventSocial])

  const toggleRsvp = async () => {
    if (!supabaseClient || !user || !selectedEvent) return openSignIn()
    setEventBusy(true)
    const event = selectedEvent
    const nextGoing = !going
    const result = event.source === 'community' && event.communityEventId
      ? nextGoing
        ? await supabaseClient.from('event_rsvps').upsert({ event_id: event.communityEventId, user_id: user.id, status: 'going' }, { onConflict: 'event_id,user_id' })
        : await supabaseClient.from('event_rsvps').delete().eq('event_id', event.communityEventId).eq('user_id', user.id)
      : nextGoing
        ? await supabaseClient.from('external_event_rsvps').upsert({ event_source: event.source as Exclude<EventSource, 'community'>, source_event_id: event.sourceId, user_id: user.id, status: 'going' }, { onConflict: 'event_source,source_event_id,user_id' })
        : await supabaseClient.from('external_event_rsvps').delete().eq('event_source', event.source as Exclude<EventSource, 'community'>).eq('source_event_id', event.sourceId).eq('user_id', user.id)
    setEventBusy(false)
    if (result.error) notify(result.error.message)
    else {
      setGoing(nextGoing)
      notify(nextGoing ? 'Your RSVP is saved.' : 'Your RSVP was removed.')
    }
  }

  const saveRidePlan = async (kind: 'request' | 'offer', pickupArea: string, seats: number | null): Promise<boolean> => {
    if (!supabaseClient || !user || !selectedEvent) {
      openSignIn()
      return false
    }
    setEventBusy(true)
    const event = selectedEvent
    const isCommunity = event.source === 'community' && Boolean(event.communityEventId)
    const result = isCommunity
      ? await supabaseClient.from('ride_posts').upsert({ event_id: event.communityEventId!, user_id: user.id, kind, pickup_area: pickupArea, seats_available: seats }, { onConflict: 'event_id,user_id' }).select('*').single()
      : await supabaseClient.from('external_ride_posts').upsert({ event_source: event.source as Exclude<EventSource, 'community'>, source_event_id: event.sourceId, user_id: user.id, kind, pickup_area: pickupArea, seats_available: seats }, { onConflict: 'event_source,source_event_id,user_id' }).select('*').single()
    setEventBusy(false)
    if (result.error || !result.data) {
      notify(result.error?.message ?? 'We could not save your ride plan.')
      return false
    }
    await loadEventSocial()
    notify('Your ride plan is saved.')
    return true
  }

  const connectFromRidePlan = async (memberId: string) => {
    if (!supabaseClient || !user) return openSignIn()
    const existing = friendships.find((item) =>
      (item.requester_id === user.id && item.addressee_id === memberId)
      || (item.addressee_id === user.id && item.requester_id === memberId))
    if (existing) return
    const { error } = await supabaseClient.from('friendships').insert({ requester_id: user.id, addressee_id: memberId })
    if (error) notify(error.message)
    else {
      notify('Your hello is on its way.')
      await loadEventSocial()
    }
  }

  const acceptRideConnection = async (friendshipId: string) => {
    await acceptConnectionRequest(friendshipId)
    await loadEventSocial()
  }

  const openEventComposer = () => {
    if (!user || !supabaseClient) {
      openSignIn()
      return
    }
    if (!location) {
      notify('Choose a town or ZIP code before hosting a gathering.')
      return
    }
    setEventComposerOpen(true)
  }

  const onEventCreated = (event: CommunityEvent) => {
    setEvents((current) => sortNearby([...current, event]))
    setEventComposerOpen(false)
    setSelectedEvent(event)
    setPage('event')
    notify('Your public gathering is live.')
  }

  const signOut = async () => {
    if (!supabaseClient) return
    const { error } = await supabaseClient.auth.signOut()
    if (error) notify(error.message)
    else {
      setPage('explore')
      notify('You have signed out.')
    }
  }

  if (authLoading) {
    return <div className="greet-app-loading" role="status"><span className="greet-loading-mark">✦</span><span>LocalLoops is getting ready…</span></div>
  }

  const userName = profile?.display_name ?? (user?.email ? user.email.split('@')[0] : null)
  const isMessagePage = page === 'messages'
  const threadMessageList = threadMessages
  const eventModalClient = supabaseClient

  return (
    <div className="greet-app-shell">
      {!isMessagePage && <Header page={page} userName={userName} onNavigate={navigate} onSignIn={openSignIn} onSignOut={() => void signOut()} />}
      <TranslationNotice />
      <main className={'greet-app-main greet-app-main--' + page}>
        {page === 'explore' && <ExplorePage
          location={location}
          events={events}
          loading={feedLoading}
          sources={feedSources}
          errors={feedErrors}
          query={locationQuery}
          radius={radius}
          onQueryChange={setLocationQuery}
          onSearch={submitLocation}
          onRadiusChange={setRadius}
          onOpenEvent={openEvent}
          onCreateEvent={openEventComposer}
          canCreateEvent={Boolean(user)}
          onSignIn={openSignIn}
        />}
        {page === 'event' && selectedEvent && <EventDetail
          event={selectedEvent}
          going={going}
          ridePost={ridePost}
          ridePosts={ridePosts}
          friendships={friendships}
          userId={user?.id ?? null}
          signedIn={Boolean(user)}
          busy={eventBusy}
          onBack={() => setPage('explore')}
          onRsvp={toggleRsvp}
          onRide={saveRidePlan}
          onSayHello={(memberId) => void connectFromRidePlan(memberId)}
          onAcceptConnection={(friendshipId) => void acceptRideConnection(friendshipId)}
          onMessage={openThread}
          onSignIn={openSignIn}
        />}
        {page === 'community' && <CommunityPage
          profiles={discoverableProfiles}
          friendships={friendships}
          userId={user?.id ?? null}
          stateCode={location?.stateCode ?? null}
          loading={socialLoading}
          onRequest={(profileId) => void sendConnectionRequest(profileId)}
          onAccept={(friendshipId) => void acceptConnectionRequest(friendshipId)}
          onMessage={openThread}
          onSignIn={openSignIn}
        />}
        {page === 'inbox' && <InboxPage
          userId={user?.id ?? null}
          friendships={friendships}
          messages={messages}
          profilesById={profilesById}
          loading={socialLoading}
          onOpenMessage={openThread}
          onAccept={(friendshipId) => void acceptConnectionRequest(friendshipId)}
          onDismiss={(friendshipId) => void dismissConnectionRequest(friendshipId)}
          onSignIn={openSignIn}
        />}
        {page === 'messages' && selectedThread && user && <MessagesPage
          name={threadProfileName}
          userId={user.id}
          messages={threadMessageList}
          sending={messageSending}
          onBack={() => setPage('inbox')}
          onSend={sendMessage}
        />}
        {page === 'account' && user && <AccountPage
          client={supabaseClient}
          userId={user.id}
          profile={profile}
          onSave={(nextProfile) => { setProfile(nextProfile); setProfileRefresh((value) => value + 1) }}
        />}
      </main>
      {!isMessagePage && <BottomNav page={page} userName={userName} onNavigate={navigate} onSignIn={openSignIn} />}
      {toast && <div className="greet-toast" role="status">{toast}</div>}
      {authOpen && <AuthModal client={supabaseClient} onClose={() => setAuthOpen(false)} />}
      {eventComposerOpen && eventModalClient && user && <CreateEventModal client={eventModalClient} userId={user.id} profile={profile} location={location} onClose={() => setEventComposerOpen(false)} onCreated={onEventCreated} />}
    </div>
  )
}

export default App
