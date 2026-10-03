import { useState, type FormEvent } from 'react'
import { ArrowLeft, Send, ShieldCheck } from 'lucide-react'
import type { DemoPerson } from '../data/demo'
import { inboxThreads } from '../data/demo'
import type { FriendStatus } from './PeoplePage'
import { Avatar } from '../components/Avatar'

export type ChatMessage = { sender: 'you' | 'them'; text: string; time: string }

type MessagesPageProps = {
  person: DemoPerson | undefined
  friendStatus: FriendStatus
  messages: ChatMessage[]
  onSend: (text: string) => void
  onBack: () => void
}

export function MessagesPage({ person, friendStatus, messages, onSend, onBack }: MessagesPageProps) {
  const [draft, setDraft] = useState('')
  const fallback = inboxThreads.find((thread) => thread.id === person?.id)
  const displayPerson = person ?? (fallback ? {
    id: fallback.id,
    name: fallback.name,
    initials: fallback.initials,
    color: fallback.color,
    town: 'Nearby',
    travel: '',
    interests: [],
    sharedEventId: '',
    bio: '',
  } : undefined)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = draft.trim()
    if (!message) return
    onSend(message)
    setDraft('')
  }

  if (!displayPerson || friendStatus !== 'accepted') {
    return (
      <div className="page-content message-locked">
        <button className="back-link" type="button" onClick={onBack}><ArrowLeft size={17} /> Back to Inbox</button>
        <div className="locked-message-card"><ShieldCheck size={28} /><h1>Connect before messaging</h1><p>Direct messages open after a friend request is accepted.</p><button className="button button--primary" type="button" onClick={onBack}>Return to Inbox</button></div>
      </div>
    )
  }

  return (
    <div className="page-content messages-page">
      <button className="back-link" type="button" onClick={onBack}><ArrowLeft size={17} /> Back to Inbox</button>
      <section className="chat-panel">
        <header className="chat-header"><Avatar initials={displayPerson.initials} color={displayPerson.color} size="large" /><span><strong>{displayPerson.name}</strong><small>{displayPerson.town} · Friend</small></span><span className="chat-secure"><ShieldCheck size={15} /> Friends only</span></header>
        <div className="chat-history" aria-live="polite">
          <div className="chat-day-divider"><span>Today</span></div>
          {messages.map((message, index) => (
            <div className={`chat-message ${message.sender === 'you' ? 'chat-message--you' : ''}`} key={`${message.time}-${index}`}>
              {message.sender === 'them' && <Avatar initials={displayPerson.initials} color={displayPerson.color} size="small" />}
              <div className="chat-message__body"><p>{message.text}</p><small>{message.time}</small></div>
            </div>
          ))}
        </div>
        <form className="chat-compose" onSubmit={handleSubmit}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Say hello to ${displayPerson.name.split(' ')[0]}…`} aria-label="Message" />
          <button className="send-button" type="submit" aria-label="Send message" disabled={!draft.trim()}><Send size={18} /></button>
        </form>
        <p className="chat-footer-note"><ShieldCheck size={14} /> You’re connected. Keep it kind and meet in public places.</p>
      </section>
    </div>
  )
}
