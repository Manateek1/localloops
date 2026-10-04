import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Send } from 'lucide-react'
import type { MessageRow } from '../lib/supabase/database.types'
import { LanguagePicker } from './LanguageProvider'
import { useLanguage } from './LanguageProvider'

type MessagesPageProps = {
  name: string
  userId: string
  messages: MessageRow[]
  sending: boolean
  onBack: () => void
  onSend: (text: string) => Promise<boolean>
}

export function MessagesPage({ name, userId, messages, sending, onBack, onSend }: MessagesPageProps) {
  const { language } = useLanguage()
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [messages])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const clean = text.trim()
    if (!clean || sending) return
    if (await onSend(clean)) setText('')
  }

  return (
    <div className="greet-message-page">
      <header className="greet-message-header"><button className="greet-back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> Inbox</button><div className="greet-message-header__member"><span className="greet-member-avatar greet-member-avatar--initials" aria-hidden="true">{name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'N'}</span><strong translate="no">{name}</strong></div><LanguagePicker /></header>
      <div className="greet-message-list" aria-live="polite">
        {messages.length ? messages.map((message) => <article key={message.id} className={`greet-message-bubble ${message.sender_id === userId ? 'is-mine' : ''}`}><p translate="no">{message.body}</p><time>{new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(message.created_at))}</time></article>) : <div className="greet-empty-inbox"><span className="greet-member-avatar greet-member-avatar--initials" aria-hidden="true">{name[0]}</span><h2>Start with a simple hello.</h2><p>Your messages are private to this accepted connection.</p></div>}
        <div ref={bottomRef} />
      </div>
      <form className="greet-message-compose" onSubmit={submit}><label className="sr-only" htmlFor="message-text">Write a message</label><textarea id="message-text" rows={2} maxLength={2000} value={text} onChange={(event) => setText(event.target.value)} placeholder={`Write ${name} a message…`} /><button className="greet-button greet-button--primary" type="submit" disabled={sending || !text.trim()}><Send size={16} />{sending ? 'Sending…' : 'Send'}</button></form>
    </div>
  )
}
