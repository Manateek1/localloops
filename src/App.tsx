import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { BottomNav, Header } from './components/Navigation'
import { AiGuide, type GuideMessage } from './features/AiGuide'
import { EventDetail, type RideChoice } from './features/EventDetail'
import { ExplorePage } from './features/ExplorePage'
import { InboxPage, type InboxTab } from './features/InboxPage'
import { MessagesPage, type ChatMessage } from './features/MessagesPage'
import { Onboarding } from './features/Onboarding'
import { PeoplePage, type FriendStatus } from './features/PeoplePage'
import {
  cityEvents,
  incomingRequests,
  people,
  ruralEvents,
  type CommunityMode,
  type MeetEvent,
  type Page,
} from './data/demo'

const initialGuideMessages: GuideMessage[] = [{
  role: 'guide',
  text: 'Hi! I can help you find local events, spot shared interests, or coordinate a ride to a public gathering. What sounds good this week?',
}]

const initialMessages: Record<string, ChatMessage[]> = {
  jamie: [
    { sender: 'them', text: 'Hey! Are you still going to the Saturday hike?', time: '9:42 AM' },
    { sender: 'you', text: 'Yes! I’m looking forward to it.', time: '9:54 AM' },
    { sender: 'them', text: "Thanks for the ride offer! Looking forward to Saturday's hike.", time: '10:24 AM' },
  ],
  alex: [
    { sender: 'them', text: 'Are you going to the Riverton Harvest Market?', time: 'Yesterday' },
    { sender: 'you', text: 'I think so. Want to meet by the flower stall?', time: 'Yesterday' },
  ],
}

function App() {
  const [page, setPage] = useState<Page>('onboarding')
  const [mode, setMode] = useState<CommunityMode>('rural')
  const [interests, setInterests] = useState(['Hiking', 'Biking'])
  const [selectedEventId, setSelectedEventId] = useState('foothill-hike')
  const [rsvps, setRsvps] = useState<Record<string, boolean>>({})
  const [rideChoices, setRideChoices] = useState<Record<string, RideChoice>>({})
  const [friendStatuses, setFriendStatuses] = useState<Record<string, FriendStatus>>({
    lena: 'none', mark: 'none', olivia: 'none', ben: 'none',
    tessa: 'incoming', jamie: 'accepted', alex: 'accepted',
  })
  const [inboxTab, setInboxTab] = useState<InboxTab>('messages')
  const [selectedThreadId, setSelectedThreadId] = useState('jamie')
  const [messagesByFriend, setMessagesByFriend] = useState<Record<string, ChatMessage[]>>(initialMessages)
  const [readNotifications, setReadNotifications] = useState<string[]>([])
  const [readThreads, setReadThreads] = useState<string[]>([])
  const [guideMessages, setGuideMessages] = useState<GuideMessage[]>(initialGuideMessages)
  const [listening, setListening] = useState(false)
  const [toast, setToast] = useState('')
  const voiceTimer = useRef<number | undefined>(undefined)

  const events = (mode === 'rural' ? ruralEvents : cityEvents).map((event) => rsvps[event.id]
    ? { ...event, attendees: event.attendees + 1 }
    : event)
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? events[0]
  const acceptedRequests = incomingRequests.filter((request) => friendStatuses[request.id] === 'incoming').length
  const unreadCount = acceptedRequests + (readThreads.includes('jamie') ? 0 : 1) + Math.max(0, 3 - readNotifications.length)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => () => {
    if (voiceTimer.current) window.clearTimeout(voiceTimer.current)
  }, [])

  const notify = (message: string) => setToast(message)

  const changeMode = (nextMode: CommunityMode) => {
    setMode(nextMode)
    const nextEvents = nextMode === 'rural' ? ruralEvents : cityEvents
    setSelectedEventId(nextEvents[0].id)
  }

  const openEvent = (eventId: string) => {
    const currentEvent = events.find((event) => event.id === eventId)
    if (currentEvent) setSelectedEventId(currentEvent.id)
    else setSelectedEventId(events[0].id)
    setPage('event')
  }

  const sendFriendRequest = (personId: string) => {
    setFriendStatuses((current) => ({ ...current, [personId]: 'pending' }))
    notify('Friend request sent. You can message after they accept.')
  }

  const acceptFriendRequest = (personId: string) => {
    setFriendStatuses((current) => ({ ...current, [personId]: 'accepted' }))
    setMessagesByFriend((current) => current[personId] ? current : {
      ...current,
      [personId]: [{ sender: 'them', text: 'Thanks for connecting! I’m glad we’ll both be at the market.', time: 'Just now' }],
    })
    notify('You’re connected. Messaging is now open.')
  }

  const declineFriendRequest = (personId: string) => {
    setFriendStatuses((current) => ({ ...current, [personId]: 'none' }))
    notify('Request dismissed.')
  }

  const openMessage = (personId: string) => {
    if (friendStatuses[personId] !== 'accepted') {
      setPage('inbox')
      setInboxTab('requests')
      notify('Accept the friend request before messaging.')
      return
    }
    setSelectedThreadId(personId)
    setReadThreads((current) => current.includes(personId) ? current : [...current, personId])
    setPage('messages')
  }

  const sendMessage = (text: string) => {
    setMessagesByFriend((current) => ({
      ...current,
      [selectedThreadId]: [...(current[selectedThreadId] ?? []), { sender: 'you', text, time: 'Now' }],
    }))
  }

  const toggleRsvp = () => {
    const going = !rsvps[selectedEvent.id]
    setRsvps((current) => ({ ...current, [selectedEvent.id]: going }))
    notify(going ? `You’re going to ${selectedEvent.shortTitle}.` : 'Your RSVP was removed.')
  }

  const toggleRide = (choice: Exclude<RideChoice, 'none'>) => {
    const nextChoice = rideChoices[selectedEvent.id] === choice ? 'none' : choice
    setRideChoices((current) => ({ ...current, [selectedEvent.id]: nextChoice }))
    if (nextChoice !== 'none') notify(nextChoice === 'need' ? 'Ride interest added for this public event.' : 'Your offer to share a seat is listed.')
  }

  const changeInboxTab = (nextTab: InboxTab) => {
    setInboxTab(nextTab)
    if (nextTab === 'alerts') setReadNotifications(['alert-hike', 'request-tessa', 'alert-market'])
  }

  const navigate = (nextPage: Page) => {
    setPage(nextPage)
    if (nextPage === 'inbox') setInboxTab('messages')
  }

  const askGuide = (question: string) => {
    const normalized = question.toLowerCase()
    let suggestions: MeetEvent[]
    let reply: string
    if (normalized.includes('ride') || normalized.includes('drive') || normalized.includes('seat')) {
      suggestions = events.filter((event) => event.publicEvent).slice(0, 3)
      reply = 'These public events have ride-interest and seat-offer controls on their detail pages. You can coordinate around a broad public pickup area.'
    } else if (normalized.includes('people') || normalized.includes('friend') || normalized.includes('interest')) {
      suggestions = events.filter((event) => event.attendees >= 18).slice(0, 3)
      reply = 'I found a few events with friendly groups and shared interests. Open People to see who else is going.'
    } else {
      suggestions = events.filter((event) => ['Hiking', 'Kayaking', 'Food'].includes(event.category)).slice(0, 3)
      reply = mode === 'rural'
        ? 'Here are some public events from local calendars, the library, and Parks & Rec across nearby towns.'
        : 'Here are a few public events with open spots across San Francisco and Oakland.'
    }
    setGuideMessages((current) => [
      ...current,
      { role: 'you', text: question },
      { role: 'guide', text: reply, eventIds: suggestions.map((event) => event.id) },
    ])
  }

  const toggleVoice = () => {
    if (listening) {
      if (voiceTimer.current) window.clearTimeout(voiceTimer.current)
      setListening(false)
      askGuide('Find outdoor events near me this weekend')
      return
    }
    setListening(true)
    voiceTimer.current = window.setTimeout(() => {
      setListening(false)
      askGuide('Find outdoor events near me this weekend')
    }, 1900)
  }

  if (page === 'onboarding') {
    return (
      <>
        <Onboarding
          mode={mode}
          interests={interests}
          onModeChange={changeMode}
          onInterestToggle={(interest) => setInterests((current) => current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest])}
          onContinue={() => setPage('explore')}
        />
        {toast && <Toast message={toast} />}
      </>
    )
  }

  const hideChrome = page === 'event' || page === 'messages'

  return (
    <div className="app-shell">
      {!hideChrome && <Header page={page} unreadCount={unreadCount} onNavigate={navigate} onNotifications={() => { setPage('inbox'); changeInboxTab('alerts') }} />}
      <main className={`app-main app-main--${page}`}>
        {page === 'explore' && <ExplorePage mode={mode} events={events} onModeChange={changeMode} onOpenEvent={openEvent} />}
        {page === 'event' && selectedEvent && <EventDetail
          event={selectedEvent}
          going={Boolean(rsvps[selectedEvent.id])}
          rideChoice={rideChoices[selectedEvent.id] ?? 'none'}
          onBack={() => setPage('explore')}
          onRsvp={toggleRsvp}
          onRide={toggleRide}
        />}
        {page === 'people' && <PeoplePage
          mode={mode}
          people={people}
          events={events}
          friendStatuses={friendStatuses}
          onSendRequest={sendFriendRequest}
          onAcceptRequest={acceptFriendRequest}
          onOpenMessage={openMessage}
        />}
        {page === 'inbox' && <InboxPage
          tab={inboxTab}
          mode={mode}
          events={events}
          friendStatuses={friendStatuses}
          messagesByFriend={messagesByFriend}
          readThreads={readThreads}
          readNotifications={readNotifications}
          onTabChange={changeInboxTab}
          onAcceptRequest={acceptFriendRequest}
          onDeclineRequest={declineFriendRequest}
          onOpenMessage={openMessage}
          onOpenEvent={openEvent}
        />}
        {page === 'messages' && <MessagesPage
          person={people.find((person) => person.id === selectedThreadId)}
          friendStatus={friendStatuses[selectedThreadId] ?? 'none'}
          messages={messagesByFriend[selectedThreadId] ?? []}
          onSend={sendMessage}
          onBack={() => setPage('inbox')}
        />}
        {page === 'ai' && <AiGuide
          events={events}
          messages={guideMessages}
          listening={listening}
          onAsk={askGuide}
          onVoiceToggle={toggleVoice}
          onOpenEvent={openEvent}
        />}
      </main>
      {!hideChrome && <BottomNav page={page} onNavigate={navigate} unreadCount={unreadCount} />}
      {toast && <Toast message={toast} />}
    </div>
  )
}

function Toast({ message }: { message: string }) {
  return <div className="toast" role="status"><span><Check size={17} /></span>{message}</div>
}

export default App
