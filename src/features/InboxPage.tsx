import { useMemo, useState } from 'react'
import { ArrowUpRight, Check, MessageCircle, UserRound } from 'lucide-react'
import type { MessageRow, FriendshipRow } from '../lib/supabase/database.types'
import type { Profile } from '../data/models'
import { useLanguage } from './LanguageProvider'

type InboxPageProps = {
  userId: string | null
  friendships: FriendshipRow[]
  messages: MessageRow[]
  profilesById: Map<string, Profile>
  loading: boolean
  error: string
  onRetry: () => void
  onOpenMessage: (friendshipId: string) => void
  onAccept: (friendshipId: string) => void
  onDismiss: (friendshipId: string) => void
  onSignIn: () => void
}

export function InboxPage({ userId, friendships, messages, profilesById, loading, error, onRetry, onOpenMessage, onAccept, onDismiss, onSignIn }: InboxPageProps) {
  const { language } = useLanguage()
  const [tab, setTab] = useState<'messages' | 'requests'>('messages')
  const accepted = friendships.filter((friendship) => friendship.status === 'accepted')
  const incoming = friendships.filter((friendship) => friendship.status === 'pending' && friendship.addressee_id === userId)
  const outgoing = friendships.filter((friendship) => friendship.status === 'pending' && friendship.requester_id === userId)
  const conversations = useMemo(() => accepted.map((friendship) => {
    const otherId = friendship.requester_id === userId ? friendship.addressee_id : friendship.requester_id
    const threadMessages = messages.filter((message) => message.friendship_id === friendship.id)
    const latest = threadMessages.at(-1)
    return { friendship, name: profilesById.get(otherId)?.display_name ?? 'LocalLoops neighbor', latest }
  }).sort((a, b) => (b.latest?.created_at ?? '').localeCompare(a.latest?.created_at ?? '')), [accepted, messages, profilesById, userId])

  return (
    <div className="greet-page greet-inbox-page">
      <div className="greet-page-heading">
        <p className="greet-eyebrow">The next hello is yours</p>
        <h1>Your conversations.</h1>
        <p>Messages open only after both neighbors accept a connection.</p>
      </div>
      {!userId ? <section className="greet-empty-card"><div className="greet-empty-card__icon"><MessageCircle size={21} /></div><h2>Sign in to see your inbox.</h2><p>Your conversations and requests are private to your account.</p><button className="greet-button greet-button--primary" type="button" onClick={onSignIn}>Sign in</button></section> : (
        <section className="greet-inbox-card">
          <div className="greet-inbox-tabs" role="tablist" aria-label="Inbox sections">
            <button type="button" role="tab" aria-selected={tab === 'messages'} className={tab === 'messages' ? 'is-active' : ''} onClick={() => setTab('messages')}>Messages <span>{accepted.length}</span></button>
            <button type="button" role="tab" aria-selected={tab === 'requests'} className={tab === 'requests' ? 'is-active' : ''} onClick={() => setTab('requests')}>Requests <span>{incoming.length}</span></button>
          </div>
          {loading ? <div className="greet-loading" role="status">Loading your inbox…</div> : error ? <div className="greet-empty-inbox" role="alert"><MessageCircle size={25} /><h2>Your inbox could not load.</h2><p>{error}</p><button className="greet-button greet-button--outline" type="button" onClick={onRetry}>Try again</button></div> : tab === 'messages' ? (
            conversations.length ? <div className="greet-conversation-list">{conversations.map(({ friendship, name, latest }) => (
              <button className="greet-conversation" type="button" key={friendship.id} onClick={() => onOpenMessage(friendship.id)}>
                <span className="greet-member-avatar greet-member-avatar--initials" aria-hidden="true">{name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'N'}</span>
                <span className="greet-conversation__body"><strong translate="no">{name}</strong><small translate={latest ? 'no' : undefined}>{latest ? `${latest.sender_id === userId ? 'You: ' : ''}${latest.body}` : 'Your conversation is ready when you are.'}</small></span>
                <span className="greet-conversation__meta">{latest ? new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric' }).format(new Date(latest.created_at)) : 'Say hello'}<ArrowUpRight size={16} /></span>
              </button>
            ))}</div> : <div className="greet-empty-inbox"><MessageCircle size={25} /><h2>No messages yet.</h2><p>When you accept a connection, you can send a private message here.</p></div>
          ) : (
            <div className="greet-request-list">
              {incoming.map((friendship) => {
                const name = profilesById.get(friendship.requester_id)?.display_name ?? 'LocalLoops neighbor'
                return <article className="greet-request" key={friendship.id}><span className="greet-member-avatar greet-member-avatar--initials"><UserRound size={18} /></span><div><strong translate="no">{name}</strong><small>Would like to connect with you.</small></div><div className="greet-request__actions"><button className="greet-button greet-button--soft" type="button" onClick={() => onAccept(friendship.id)}><Check size={14} />Accept</button><button className="greet-button greet-button--quiet" type="button" onClick={() => onDismiss(friendship.id)}>Dismiss</button></div></article>
              })}
              {outgoing.map((friendship) => {
                const name = profilesById.get(friendship.addressee_id)?.display_name ?? 'LocalLoops neighbor'
                return <article className="greet-request" key={friendship.id}><span className="greet-member-avatar greet-member-avatar--initials"><UserRound size={18} /></span><div><strong translate="no">{name}</strong><small>Your request is waiting for a reply.</small></div></article>
              })}
              {!incoming.length && !outgoing.length && <div className="greet-empty-inbox"><UserRound size={25} /><h2>No connection requests.</h2><p>When someone says hello, it will appear here.</p></div>}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
