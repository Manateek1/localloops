import { useMemo } from 'react'
import { Bell, CalendarDays, Check, CheckCheck, MessageCircle, UserRoundPlus } from 'lucide-react'
import type { CommunityMode, MeetEvent } from '../data/demo'
import { inboxThreads, incomingRequests, localNotifications, people } from '../data/demo'
import type { FriendStatus } from './PeoplePage'
import { Avatar } from '../components/Avatar'

export type InboxTab = 'messages' | 'requests' | 'alerts'

type InboxPageProps = {
  tab: InboxTab
  mode: CommunityMode
  events: MeetEvent[]
  friendStatuses: Record<string, FriendStatus>
  messagesByFriend: Record<string, Array<{ sender: 'you' | 'them'; text: string; time: string }>>
  readThreads: string[]
  readNotifications: string[]
  onTabChange: (tab: InboxTab) => void
  onAcceptRequest: (personId: string) => void
  onDeclineRequest: (personId: string) => void
  onOpenMessage: (personId: string) => void
  onOpenEvent: (eventId: string) => void
}

export function InboxPage({ tab, mode, events, friendStatuses, messagesByFriend, readThreads, readNotifications, onTabChange, onAcceptRequest, onDeclineRequest, onOpenMessage, onOpenEvent }: InboxPageProps) {
  const threads = useMemo(() => {
    const acceptedPeople = Object.entries(friendStatuses).filter(([, status]) => status === 'accepted').map(([id]) => id)
    const existing = inboxThreads.filter((thread) => acceptedPeople.includes(thread.id)).map((thread) => {
      const latestMessage = messagesByFriend[thread.id]?.at(-1)
      return {
        ...thread,
        preview: latestMessage ? `${latestMessage.sender === 'you' ? 'You: ' : ''}${latestMessage.text}` : thread.preview,
        time: latestMessage?.time ?? thread.time,
        unread: thread.unread && !readThreads.includes(thread.id),
      }
    })
    const acceptedDemoPeople = acceptedPeople
      .filter((id) => !existing.some((thread) => thread.id === id))
      .map((id) => {
        const person = people.find((item) => item.id === id)
        const latestMessage = messagesByFriend[id]?.at(-1)
        return person ? { id, name: person.name, initials: person.initials, color: person.color, preview: latestMessage ? `${latestMessage.sender === 'you' ? 'You: ' : ''}${latestMessage.text}` : 'You are connected — send a friendly hello.', time: latestMessage?.time ?? 'New', unread: false, accepted: true } : null
      })
      .filter((thread): thread is NonNullable<typeof thread> => thread !== null)
    return [...existing, ...acceptedDemoPeople]
  }, [friendStatuses, messagesByFriend, readThreads])

  const notifications = localNotifications.map((notification, index) => {
    const fallbackEvent = events[index % Math.max(events.length, 1)]
    const eventExists = notification.eventId && events.some((event) => event.id === notification.eventId)
    const connectionAccepted = notification.personId && friendStatuses[notification.personId] === 'accepted'
    return {
      ...notification,
      eventId: eventExists ? notification.eventId : fallbackEvent?.id,
      title: connectionAccepted
        ? 'You’re connected with Tessa W.'
        : mode === 'city' && notification.type === 'event_alert'
          ? `${index === 0 ? 'A new event' : 'A local plan'} near ${fallbackEvent?.town ?? 'you'}`
          : notification.title,
      detail: connectionAccepted
        ? 'Direct messaging is now open.'
        : mode === 'city' && notification.type === 'event_alert' && fallbackEvent
          ? `${fallbackEvent.shortTitle} · ${fallbackEvent.date} at ${fallbackEvent.time.split(' – ')[0]}`
          : notification.detail,
    }
  })

  return (
    <div className="page-content inbox-page">
      <div className="page-heading-row">
        <div><p className="page-eyebrow">Keep the conversation going</p><h1>Your inbox</h1><p className="page-heading-copy">Messages open after you accept a friend request.</p></div>
        <span className="inbox-welcome"><MessageCircle size={16} /> Friendly by design</span>
      </div>
      <div className="inbox-layout">
        <aside className="inbox-sidebar">
          <div className="inbox-tabs" role="tablist" aria-label="Inbox sections">
            <button type="button" className={tab === 'messages' ? 'is-active' : ''} onClick={() => onTabChange('messages')} role="tab" aria-selected={tab === 'messages'}><MessageCircle size={17} /> Messages{threads.some((thread) => thread.unread) && <span className="tab-count">1</span>}</button>
            <button type="button" className={tab === 'requests' ? 'is-active' : ''} onClick={() => onTabChange('requests')} role="tab" aria-selected={tab === 'requests'}><UserRoundPlus size={17} /> Friend requests{friendStatuses.tessa === 'incoming' && <span className="tab-count">1</span>}</button>
            <button type="button" className={tab === 'alerts' ? 'is-active' : ''} onClick={() => onTabChange('alerts')} role="tab" aria-selected={tab === 'alerts'}><Bell size={17} /> Event alerts{notifications.some((item) => !readNotifications.includes(item.id)) && <span className="tab-count">{notifications.filter((item) => !readNotifications.includes(item.id)).length}</span>}</button>
          </div>
          <div className="inbox-sidebar-note"><span className="small-sun" /> New people, familiar places.</div>
        </aside>

        <section className="inbox-panel" aria-live="polite">
          {tab === 'messages' && (
            <>
              <div className="inbox-panel__heading"><div><h2>Messages</h2><p>One-on-one chats with accepted friends</p></div><span>{threads.length} conversations</span></div>
              {threads.length ? <div className="thread-list">{threads.map((thread) => (
                <button className="thread-row" type="button" key={thread.id} onClick={() => onOpenMessage(thread.id)}>
                  <Avatar initials={thread.initials} color={thread.color} size="large" />
                  <span className="thread-row__main"><span className="thread-row__title"><strong>{thread.name}</strong><small>{thread.time}</small></span><span className="thread-row__preview">{thread.preview}</span></span>
                  {thread.unread && <span className="thread-unread" aria-label="Unread message" />}
                </button>
              ))}</div> : <div className="inbox-empty"><MessageCircle size={22} /><strong>Your conversations start here</strong><span>Accept a friend request, then send a hello.</span><button className="text-button" type="button" onClick={() => onTabChange('requests')}>View friend requests</button></div>}
            </>
          )}
          {tab === 'requests' && (
            <>
              <div className="inbox-panel__heading"><div><h2>Friend requests</h2><p>Connect first; direct messages unlock after acceptance.</p></div></div>
              {incomingRequests.filter((request) => friendStatuses[request.id] === 'incoming').length ? <div className="request-list">{incomingRequests.filter((request) => friendStatuses[request.id] === 'incoming').map((request) => (
                <article className="request-row" key={request.id}>
                  <Avatar initials={request.initials} color={request.color} size="large" />
                  <div className="request-row__main"><strong>{request.name}</strong><span><span className="request-location">{request.town}</span> · {request.shared}</span></div>
                  <div className="request-row__actions"><button className="button button--primary button--small" type="button" onClick={() => onAcceptRequest(request.id)}><Check size={15} /> Accept</button><button className="text-button" type="button" onClick={() => onDeclineRequest(request.id)}>Not now</button></div>
                </article>
              ))}</div> : <div className="inbox-empty"><CheckCheck size={22} /><strong>You’re all caught up</strong><span>New friend requests will appear here.</span></div>}
              <div className="request-note">Friend requests help keep conversations comfortable. You can connect before starting a DM.</div>
            </>
          )}
          {tab === 'alerts' && (
            <>
              <div className="inbox-panel__heading"><div><h2>Event alerts</h2><p>Public events and updates from local sources</p></div><span>{notifications.filter((item) => !readNotifications.includes(item.id)).length} new</span></div>
              <div className="notification-list">{notifications.map((notification) => (
                <button className={`notification-row ${readNotifications.includes(notification.id) ? 'is-read' : ''}`} key={notification.id} type="button" onClick={() => {
                  if (notification.type === 'event_alert' && notification.eventId) onOpenEvent(notification.eventId)
                  else if (notification.personId && friendStatuses[notification.personId] === 'accepted') onOpenMessage(notification.personId)
                  else onTabChange('requests')
                }}>
                  <span className={`notification-icon notification-icon--${notification.type}`}>
                    {notification.type === 'event_alert' ? <CalendarDays size={17} /> : <UserRoundPlus size={17} />}
                  </span>
                  <span className="notification-row__main"><strong>{notification.title}</strong><span>{notification.detail}</span><small>{notification.time}</small></span>
                  {!readNotifications.includes(notification.id) && <span className="thread-unread" aria-label="Unread alert" />}
                </button>
              ))}</div>
              <div className="notifications-privacy"><Bell size={16} /><span>Alerts are based on your interests and selected region.</span></div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export type { FriendStatus }
