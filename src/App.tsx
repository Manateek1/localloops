import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { MessageCircle } from 'lucide-react'
import { BottomNav, Header, type Page } from './components/Navigation'
import { AccountPage } from './features/AccountPage'
import { AgentPage } from './features/AgentPage'
import { AuthModal } from './features/AuthModal'
import { CommunityPage } from './features/CommunityPage'
import { CreateEventModal } from './features/CreateEventModal'
import { EventDetail } from './features/EventDetail'
import { ExplorePage } from './features/ExplorePage'
import { InboxPage } from './features/InboxPage'
import { MessagesPage } from './features/MessagesPage'
import { getCommunityEvents, getSourcedEvents, getUserEventHistoryCategories, sortNearby, type EventFeedState } from './lib/events'
import { searchLocation } from './lib/location'
import type { CommunityEvent, EventAttendee, EventSource, LocationResult, Profile } from './data/models'
import type { FriendshipRow, MessageRow, ProfileRow } from './lib/supabase/database.types'
import { supabaseClient } from './lib/supabase/client'
import { TranslationNotice } from './features/LanguageProvider'
import { EVENT_SEARCH_RADIUS_MILES } from './data/constants'

const noSources: EventFeedState = {
  ticketmaster: 'not_configured',
  nps: 'not_configured',
  ticketfairy: 'not_configured',
  community: 'not_configured',
}

function App() {
  const [page, setPage] = useState<Page>('explore')
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [eventHistoryCategories, setEventHistoryCategories] = useState<string[]>([])
  const [profileRefresh, setProfileRefresh] = useState(0)
  const [authOpen, setAuthOpen] = useState(false)
  const [eventComposerOpen, setEventComposerOpen] = useState(false)
  const [eventCommunityId, setEventCommunityId] = useState<string | null>(null)
  const [location, setLocation] = useState<LocationResult | null>(null)
  const [locationQuery, setLocationQuery] = useState('')
  const [radius, setRadius] = useState(EVENT_SEARCH_RADIUS_MILES)
  const [events, setEvents] = useState<CommunityEvent[]>([])
  const [feedSources, setFeedSources] = useState<EventFeedState>(noSources)
  const [feedErrors, setFeedErrors] = useState<string[]>([])
  const [locationError, setLocationError] = useState('')
  const [feedLoading, setFeedLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState(false)
  const [socialError, setSocialError] = useState('')
  const [socialRefresh, setSocialRefresh] = useState(0)
  const [discoverableProfiles, setDiscoverableProfiles] = useState<Profile[]>([])
  const [friendships, setFriendships] = useState<FriendshipRow[]>([])
  const [previewRequestProfileIds, setPreviewRequestProfileIds] = useState<string[]>([])
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [demoMessagesByProfile, setDemoMessagesByProfile] = useState<Record<string, MessageRow[]>>({})
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [selectedDemoProfileId, setSelectedDemoProfileId] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(null)
  const [going, setGoing] = useState(false)
  const [attendees, setAttendees] = useState<EventAttendee[]>([])
  const [eventBusy, setEventBusy] = useState(false)
  const [messageSending, setMessageSending] = useState(false)
  const messageSendingRef = useRef(false)
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
    }).catch(() => {
      if (active) {
        setUser(null)
        setAuthLoading(false)
        setToast('Your session could not be checked. You can still try signing in.')
      }
    })
    const { data } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
      if (!session) {
        setProfile(null)
        setFriendships([])
        setMessages([])
        setDiscoverableProfiles([])
        setSelectedThreadId(null)
        setSelectedDemoProfileId(null)
        setDemoMessagesByProfile({})
        setPreviewRequestProfileIds([])
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
    void (async () => {
      const displayName = user.user_metadata?.localloops_display_name
      const { error: ensureError } = await supabaseClient.rpc('localloops_ensure_profile', {
        p_display_name: typeof displayName === 'string' ? displayName : null,
      })
      if (ensureError) throw ensureError
      const { data, error } = await supabaseClient.schema('localloops').from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (error) throw error
      if (active) setProfile((data as Profile | null) ?? null)
    })().catch(() => {
      if (active) {
        setProfile(null)
        setToast('Your LocalLoops profile could not load. Please try refreshing the page.')
      }
    })
    return () => { active = false }
  }, [user?.id, profileRefresh])

  useEffect(() => {
    if (!supabaseClient || !user) {
      setEventHistoryCategories([])
      return
    }
    let active = true
    void getUserEventHistoryCategories(supabaseClient, user.id)
      .then((categories) => { if (active) setEventHistoryCategories(categories) })
      .catch(() => { if (active) setEventHistoryCategories([]) })
    return () => { active = false }
  }, [user?.id])

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
      setEvents([...feed.events, ...community.events])
      setFeedSources({ ...feed.sources, community: community.status })
      setFeedErrors([...feed.errors, ...(community.error ? [community.error] : [])])
    }).catch(() => {
      if (!active) return
      setEvents([])
      setFeedErrors(['Event search could not connect. Try again in a moment.'])
    }).finally(() => { if (active) setFeedLoading(false) })
    return () => { active = false }
  }, [location, radius])

  useEffect(() => {
    if (!supabaseClient || !user) {
      setSocialLoading(false)
      setSocialError('')
      setDiscoverableProfiles([])
      setFriendships([])
      setMessages([])
      return
    }
    if (!['community', 'inbox', 'messages'].includes(page)) {
      setSocialLoading(false)
      return
    }
    let active = true
    setSocialLoading(true)
    setSocialError('')
    const client = supabaseClient
    const load = async () => {
      let profileQuery = client.schema('localloops').from('profiles').select('*').eq('discoverable', true).neq('id', user.id)
      if (location?.stateCode) profileQuery = profileQuery.eq('state_code', location.stateCode)
      const [profileResult, friendshipResult] = await Promise.all([
        profileQuery.order('created_at', { ascending: false }).limit(100),
        client.from('localloops_friendships').select('*').or('requester_id.eq.' + user.id + ',addressee_id.eq.' + user.id).order('created_at', { ascending: false }),
      ])
      if (profileResult.error) throw profileResult.error
      if (friendshipResult.error) throw friendshipResult.error
      if (!active) return
      const realProfiles = (profileResult.data ?? []) as ProfileRow[]
      const relationRows = (friendshipResult.data ?? []) as FriendshipRow[]
      setFriendships(relationRows)
      const linkedProfileIds = [...new Set(relationRows.flatMap((row) => [row.requester_id, row.addressee_id]).filter((id) => id !== user.id))]
      const linkedProfileResult = linkedProfileIds.length
        ? await client.schema('localloops').from('profiles').select('*').in('id', linkedProfileIds)
        : { data: [], error: null }
      if (linkedProfileResult.error) throw linkedProfileResult.error
      if (!active) return
      const profilesById = new Map<string, ProfileRow>()
      ;[...realProfiles, ...((linkedProfileResult.data ?? []) as ProfileRow[])].forEach((item) => profilesById.set(item.id, item))
      setDiscoverableProfiles([...profilesById.values()])
      const threadIds = relationRows.filter((row) => row.status === 'accepted').map((row) => row.id)
      if (!threadIds.length) {
        setMessages([])
        return
      }
      const { data: messageRows, error: messageError } = await client.from('localloops_messages').select('*')
        .in('friendship_id', threadIds)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(500)
      if (messageError) throw messageError
      if (active) setMessages(((messageRows ?? []) as MessageRow[]).reverse())
    }
    void load().catch(() => {
      if (active) setSocialError('Your people, requests, and messages could not load. Check your connection and try again.')
    }).finally(() => { if (active) setSocialLoading(false) })
    return () => { active = false }
  }, [user?.id, page, socialRefresh, location?.stateCode])

  useEffect(() => {
    if (!supabaseClient || !user || !['community', 'inbox', 'messages'].includes(page)) return
    const client = supabaseClient
    const refreshRelationships = () => setSocialRefresh((value) => value + 1)
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshRelationships()
    }
    const channel = client.channel('localloops-social:' + user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'localloops_friendships' }, refreshRelationships)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'localloops_friendships' }, refreshRelationships)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'localloops_messages' }, (payload) => {
        const message = payload.new as MessageRow
        if (!message.id || !message.friendship_id) return
        setMessages((current) => {
          const next = [...current.filter((item) => item.id !== message.id), message]
            .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
          return next.slice(-500)
        })
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setSocialRefresh((value) => value + 1)
      })
    window.addEventListener('focus', refreshRelationships)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.removeEventListener('focus', refreshRelationships)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      void client.removeChannel(channel)
    }
  }, [user?.id, page])

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

  const recommendationInterests = useMemo(() => [...new Set([
    ...(profile?.interests ?? []),
    ...eventHistoryCategories,
  ])], [profile?.interests, eventHistoryCategories])

  const selectedThread = friendships.find((friendship) => friendship.id === selectedThreadId) ?? null
  const selectedDemoProfile = selectedDemoProfileId ? profilesById.get(selectedDemoProfileId) ?? null : null
  const threadUserId = selectedThread && user
    ? (selectedThread.requester_id === user.id ? selectedThread.addressee_id : selectedThread.requester_id)
    : null
  const threadProfileName = selectedDemoProfile?.display_name ?? (threadUserId ? profilesById.get(threadUserId)?.display_name ?? 'LocalLoops neighbor' : 'LocalLoops neighbor')
  const threadMessages = selectedDemoProfileId
    ? demoMessagesByProfile[selectedDemoProfileId] ?? []
    : selectedThreadId ? messages.filter((message) => message.friendship_id === selectedThreadId) : []

  const notify = (message: string) => setToast(message)

  const openSignIn = () => setAuthOpen(true)
  const navigate = (nextPage: Page) => setPage(nextPage === 'messages' && !selectedThreadId ? 'inbox' : nextPage)

  const submitLocation = async (query: string) => {
    setLocationQuery(query)
    setLocationError('')
    try {
      const nextLocation = await searchLocation(query)
      setLocation(nextLocation)
      notify('Showing real events near ' + nextLocation.label + '.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'We could not find that place.'
      setLocationError(message)
      notify(message)
    }
  }

  const openEvent = (event: CommunityEvent) => {
    setSelectedEvent(event)
    setPage('event')
  }

  const refreshSocial = () => setSocialRefresh((value) => value + 1)

  const sendConnectionRequest = async (profileId: string) => {
    setPreviewRequestProfileIds((current) => current.includes(profileId) ? current : [...current, profileId])
    if (!supabaseClient || !user) {
      notify('Friend request sent (demo). It may not have reached them.')
      return
    }
    const existing = friendships.find((item) =>
      (item.requester_id === user.id && item.addressee_id === profileId)
      || (item.requester_id === profileId && item.addressee_id === user.id))
    if (existing) {
      notify('Friend request sent.')
      return
    }
    try {
      const { data, error } = await supabaseClient.rpc('localloops_send_connection_request', { p_addressee_id: profileId })
      if (error || !data) {
        notify('Friend request sent in this demo, but delivery could not be confirmed.')
        refreshSocial()
        return
      }
      notify('Friend request sent.')
      refreshSocial()
    } catch {
      notify('Friend request sent in this demo, but delivery could not be confirmed.')
    }
  }

  const acceptConnectionRequest = async (friendshipId: string) => {
    if (!supabaseClient || !user) return
    try {
      const { data, error } = await supabaseClient.from('localloops_friendships')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', friendshipId).eq('addressee_id', user.id).select('id').maybeSingle()
      if (error || !data) {
        notify('That connection request could not be accepted. Refresh and try again.')
        refreshSocial()
        return
      }
      notify('You’re connected. A conversation is ready when you are.')
      refreshSocial()
    } catch {
      notify('That connection request could not be accepted. Please try again.')
    }
  }

  const dismissConnectionRequest = async (friendshipId: string) => {
    if (!supabaseClient || !user) return
    try {
      const { data, error } = await supabaseClient.from('localloops_friendships').delete().eq('id', friendshipId).select('id').maybeSingle()
      if (error || !data) {
        notify('That connection request could not be dismissed. Please try again.')
        return
      }
      refreshSocial()
    } catch {
      notify('That connection request could not be dismissed. Please try again.')
    }
  }

  const openThread = (friendshipId: string) => {
    setSelectedDemoProfileId(null)
    setSelectedThreadId(friendshipId)
    setPage('messages')
  }

  const openProfileMessage = (profileId: string) => {
    if (!user) return openSignIn()
    const relationship = friendships.find((item) =>
      (item.requester_id === user.id && item.addressee_id === profileId)
      || (item.requester_id === profileId && item.addressee_id === user.id))
    if (relationship?.status === 'accepted') return openThread(relationship.id)
    setSelectedThreadId(null)
    setSelectedDemoProfileId(profileId)
    setPage('messages')
  }

  const sendMessage = async (text: string): Promise<boolean> => {
    if (selectedDemoProfileId && user) {
      const createdAt = new Date().toISOString()
      const message: MessageRow = {
        id: 'demo-' + createdAt + '-' + Math.random().toString(36).slice(2),
        friendship_id: 'demo:' + selectedDemoProfileId,
        sender_id: user.id,
        body: text.trim(),
        created_at: createdAt,
      }
      setDemoMessagesByProfile((current) => ({
        ...current,
        [selectedDemoProfileId]: [...(current[selectedDemoProfileId] ?? []), message],
      }))
      notify('Message added to this demo. It has not been delivered.')
      return true
    }
    if (!supabaseClient || !user || !selectedThreadId || messageSendingRef.current) return false
    messageSendingRef.current = true
    setMessageSending(true)
    try {
      const { data, error } = await supabaseClient.from('localloops_messages')
        .insert({ friendship_id: selectedThreadId, sender_id: user.id, body: text.trim() })
        .select('*').single()
      if (error || !data) {
        notify('Your message could not be sent. Please try again.')
        return false
      }
      setMessages((current) => {
        const next = [...current.filter((item) => item.id !== data.id), data]
          .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
        return next.slice(-500)
      })
      return true
    } catch {
      notify('Your message could not be sent. Please try again.')
      return false
    } finally {
      messageSendingRef.current = false
      setMessageSending(false)
    }
  }

  const loadEventSocial = useCallback(async () => {
    if (!supabaseClient || !selectedEvent || !user) {
      setGoing(false)
      setAttendees([])
      return
    }
    const event = selectedEvent
    const isCommunity = event.source === 'community' && Boolean(event.communityEventId)
    const [rsvpResult, attendanceResult, friendshipResult] = await Promise.all([
      isCommunity
        ? supabaseClient.from('localloops_event_rsvps').select('event_id,user_id,status,created_at').eq('event_id', event.communityEventId!).eq('user_id', user.id).maybeSingle()
        : supabaseClient.from('localloops_external_event_rsvps').select('event_source,source_event_id,user_id,status,created_at').eq('event_source', event.source as Exclude<EventSource, 'community'>).eq('source_event_id', event.sourceId).eq('user_id', user.id).maybeSingle(),
      isCommunity
        ? supabaseClient.from('localloops_event_rsvps').select('user_id,status').eq('event_id', event.communityEventId!).eq('status', 'going').limit(1000)
        : supabaseClient.from('localloops_external_event_rsvps').select('user_id,status').eq('event_source', event.source as Exclude<EventSource, 'community'>).eq('source_event_id', event.sourceId).eq('status', 'going').limit(1000),
      supabaseClient.from('localloops_friendships').select('*').or('requester_id.eq.' + user.id + ',addressee_id.eq.' + user.id).order('created_at', { ascending: false }),
    ])
    setGoing(rsvpResult.data?.status === 'going')
    if (rsvpResult.error || attendanceResult.error) notify('Event attendance is temporarily unavailable. Please try again.')
    const attendanceRows = attendanceResult.data ?? []
    const memberIds = [...new Set(attendanceRows.map((row) => row.user_id))]
    const { data: memberProfiles } = memberIds.length
      ? await supabaseClient.schema('localloops').from('profiles').select('id,display_name').in('id', memberIds)
      : { data: [] }
    const namesById = new Map(((memberProfiles ?? []) as Pick<ProfileRow, 'id' | 'display_name'>[]).map((row) => [row.id, row.display_name]))
    setAttendees(attendanceRows.map((row) => ({
      userId: row.user_id,
      displayName: row.user_id === user.id ? 'You' : namesById.get(row.user_id),
    })))
    setFriendships((friendshipResult.data ?? []) as FriendshipRow[])
  }, [selectedEvent, user?.id])

  useEffect(() => {
    if (page !== 'event') return
    void loadEventSocial().catch(() => {
      setGoing(false)
    })
  }, [page, loadEventSocial])

  const toggleRsvp = async () => {
    if (!supabaseClient || !user || !selectedEvent) return openSignIn()
    setEventBusy(true)
    const event = selectedEvent
    const nextGoing = !going
    const result = event.source === 'community' && event.communityEventId
      ? nextGoing
        ? await supabaseClient.from('localloops_event_rsvps').upsert({ event_id: event.communityEventId, user_id: user.id, status: 'going' }, { onConflict: 'event_id,user_id' })
        : await supabaseClient.from('localloops_event_rsvps').delete().eq('event_id', event.communityEventId).eq('user_id', user.id)
      : nextGoing
        ? await supabaseClient.from('localloops_external_event_rsvps').upsert({ event_source: event.source as Exclude<EventSource, 'community'>, source_event_id: event.sourceId, user_id: user.id, status: 'going' }, { onConflict: 'event_source,source_event_id,user_id' })
        : await supabaseClient.from('localloops_external_event_rsvps').delete().eq('event_source', event.source as Exclude<EventSource, 'community'>).eq('source_event_id', event.sourceId).eq('user_id', user.id)
    setEventBusy(false)
    if (result.error) notify('Your attendance could not be updated. Please try again.')
    else {
      setGoing(nextGoing)
      await loadEventSocial()
      if (event.source === 'community') {
        void getUserEventHistoryCategories(supabaseClient, user.id)
          .then(setEventHistoryCategories)
          .catch(() => setEventHistoryCategories([]))
      }
      notify(nextGoing ? 'You’re marked as going.' : 'You’re no longer marked as going.')
    }
  }

  const connectFromEventAttendee = async (memberId: string) => {
    if (!supabaseClient || !user) return openSignIn()
    const existing = friendships.find((item) =>
      (item.requester_id === user.id && item.addressee_id === memberId)
      || (item.addressee_id === user.id && item.requester_id === memberId))
    if (existing) return
    try {
      const { data, error } = await supabaseClient.rpc('localloops_send_connection_request', { p_addressee_id: memberId })
      if (error || !data) {
        notify('Your connection request could not be sent. Please try again.')
        return
      }
      notify('Your connection is updated.')
      await loadEventSocial()
      refreshSocial()
    } catch {
      notify('Your connection request could not be sent. Please try again.')
    }
  }

  const acceptEventAttendeeConnection = async (friendshipId: string) => {
    await acceptConnectionRequest(friendshipId)
    await loadEventSocial()
  }

  const openEventComposer = (communityId: string | null = null) => {
    if (!user || !supabaseClient) {
      openSignIn()
      return
    }
    setEventCommunityId(communityId)
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
  const isMessagePage = page === 'messages' && Boolean(user && (selectedThread || selectedDemoProfile))
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
          locationError={locationError}
          communityAvailable={Boolean(supabaseClient)}
          query={locationQuery}
          radius={radius}
          interests={recommendationInterests}
          onQueryChange={(value) => { setLocationQuery(value); setLocationError('') }}
          onSearch={submitLocation}
          onRadiusChange={setRadius}
          onOpenEvent={openEvent}
          onOpenAgent={() => setPage('agent')}
          onCreateEvent={openEventComposer}
          canCreateEvent={Boolean(user)}
          onSignIn={openSignIn}
        />}
        {page === 'event' && selectedEvent && <EventDetail
          event={selectedEvent}
          going={going}
          attendees={attendees}
          friendships={friendships}
          userId={user?.id ?? null}
          signedIn={Boolean(user)}
          busy={eventBusy}
          onBack={() => setPage('explore')}
          onRsvp={toggleRsvp}
          onSayHello={(memberId) => void connectFromEventAttendee(memberId)}
          onAcceptConnection={(friendshipId) => void acceptEventAttendeeConnection(friendshipId)}
          onSignIn={openSignIn}
        />}
        {page === 'community' && <CommunityPage
          client={supabaseClient}
          profiles={discoverableProfiles}
          friendships={friendships}
          previewRequestProfileIds={previewRequestProfileIds}
          userId={user?.id ?? null}
          stateCode={location?.stateCode ?? null}
          loading={socialLoading}
          error={socialError}
          onRetry={refreshSocial}
          profile={profile}
          onRequest={sendConnectionRequest}
          onAccept={(friendshipId) => void acceptConnectionRequest(friendshipId)}
          onMessage={openThread}
          onStartMessage={openProfileMessage}
          onCreateEvent={(communityId) => openEventComposer(communityId)}
          onOpenEvent={openEvent}
          onSignIn={openSignIn}
        />}
        {page === 'agent' && (
          <AgentPage
            events={events}
            errors={feedErrors}
            loading={feedLoading}
            location={location}
            onOpenEvent={openEvent}
            onOpenExplore={() => setPage('explore')}
          />
        )}
        {page === 'inbox' && <InboxPage
          userId={user?.id ?? null}
          friendships={friendships}
          messages={messages}
          profilesById={profilesById}
          loading={socialLoading}
          error={socialError}
          onRetry={refreshSocial}
          onOpenMessage={openThread}
          onAccept={(friendshipId) => void acceptConnectionRequest(friendshipId)}
          onDismiss={(friendshipId) => void dismissConnectionRequest(friendshipId)}
          onSignIn={openSignIn}
        />}
        {page === 'messages' && (selectedThread || selectedDemoProfile) && user && <MessagesPage
          name={threadProfileName}
          userId={user.id}
          messages={threadMessageList}
          sending={messageSending}
          demoOnly={Boolean(selectedDemoProfile)}
          backLabel={selectedDemoProfile ? 'People' : 'Inbox'}
          onBack={() => setPage(selectedDemoProfile ? 'community' : 'inbox')}
          onSend={sendMessage}
        />}
        {page === 'messages' && !isMessagePage && <section className="greet-page">
          <div className="greet-empty-card"><div className="greet-empty-card__icon"><MessageCircle size={21} /></div><h2>That conversation is unavailable.</h2><p>Choose an accepted connection from your inbox to open a private conversation.</p><button className="greet-button greet-button--outline" type="button" onClick={() => setPage('inbox')}>Back to inbox</button></div>
        </section>}
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
      {eventComposerOpen && eventModalClient && user && <CreateEventModal client={eventModalClient} userId={user.id} profile={profile} location={location} communityId={eventCommunityId} onClose={() => setEventComposerOpen(false)} onCreated={onEventCreated} />}
    </div>
  )
}

export default App
