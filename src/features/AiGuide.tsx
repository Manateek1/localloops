import { useState, type FormEvent } from 'react'
import { ArrowUp, Mic, Sparkles, Volume2 } from 'lucide-react'
import type { MeetEvent } from '../data/demo'
import { EventCard } from '../components/EventCard'

export type GuideMessage = { role: 'guide' | 'you'; text: string; eventIds?: string[] }

type AiGuideProps = {
  events: MeetEvent[]
  messages: GuideMessage[]
  listening: boolean
  onAsk: (question: string) => void
  onVoiceToggle: () => void
  onOpenEvent: (eventId: string) => void
}

const quickPrompts = ['Find outdoor events', 'Meet people near me', 'Can someone share a ride?']

export function AiGuide({ events, messages, listening, onAsk, onVoiceToggle, onOpenEvent }: AiGuideProps) {
  const [draft, setDraft] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const question = draft.trim()
    if (!question) return
    onAsk(question)
    setDraft('')
  }

  return (
    <div className="page-content guide-page">
      <div className="guide-heading"><p className="page-eyebrow">A friendly nudge toward a good plan</p><h1>Your community guide</h1><p>Ask about nearby events, shared interests, or getting there together.</p></div>
      <section className="guide-layout">
        <aside className={`guide-presence ${listening ? 'is-listening' : ''}`}>
          <div className="guide-character-wrap"><span className="guide-orbit guide-orbit--one" /><span className="guide-orbit guide-orbit--two" /><img src="/images/leaf-guide.png" alt="A friendly leaf-inspired community guide" className="guide-character" /></div>
          <div className="guide-presence__copy"><Sparkles size={16} /><span>{listening ? 'Listening for a little while…' : 'Here to help you find your people.'}</span></div>
          <button className={`voice-button ${listening ? 'is-listening' : ''}`} type="button" onClick={onVoiceToggle} aria-pressed={listening}>
            <Mic size={19} /> <span>{listening ? 'Finish listening' : 'Talk it out'}</span>
          </button>
          <p className="voice-note">Voice is simulated in this preview. No microphone permission is needed.</p>
        </aside>
        <section className="guide-chat" aria-label="Community guide conversation">
          <div className="guide-chat__top"><div><h2>Let’s find a good fit.</h2><p>Tell me what sounds fun this week.</p></div><Volume2 size={18} /></div>
          <div className="guide-messages" aria-live="polite">
            {messages.map((message, index) => (
              <div className={`guide-message guide-message--${message.role}`} key={`${message.role}-${index}`}>
                <p>{message.text}</p>
                {message.eventIds?.length ? <div className="guide-event-results">{message.eventIds.map((id) => {
                  const event = events.find((item) => item.id === id)
                  return event ? <EventCard key={event.id} event={event} compact onOpen={() => onOpenEvent(event.id)} /> : null
                })}</div> : null}
              </div>
            ))}
          </div>
          {messages.length <= 1 && <div className="guide-prompts">{quickPrompts.map((prompt) => <button type="button" key={prompt} onClick={() => onAsk(prompt)}>{prompt}<ArrowUp size={13} /></button>)}</div>}
          <form className="guide-compose" onSubmit={handleSubmit}>
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask about events or people nearby…" aria-label="Ask the community guide" />
            <button type="submit" disabled={!draft.trim()} aria-label="Send question"><ArrowUp size={19} /></button>
          </form>
          <p className="guide-demo-note">Suggestions are local sample data for this prototype.</p>
        </section>
      </section>
    </div>
  )
}
