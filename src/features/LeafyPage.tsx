import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { ArrowUp, Leaf, MapPin, Mic, MicOff, Search, Sparkles, Volume2 } from 'lucide-react'
import type { CommunityEvent, LocationResult } from '../data/models'
import { US_STATES } from '../data/models'
import { EventCard } from '../components/EventCard'
import { sortNearby } from '../lib/events'
import { useLanguage } from './LanguageProvider'
import { useCommunityGuideVoice, type GuideVoiceState } from './useCommunityGuideVoice'

type ChatMessage = { id: number; role: 'user' | 'model'; text: string }
type LeafyPageProps = {
  events: CommunityEvent[]
  location: LocationResult | null
  locationQuery: string
  interests: string[]
  loading: boolean
  locationError: string
  onSearchLocation: (query: string) => Promise<LocationResult | null>
  onOpenEvent: (event: CommunityEvent) => void
}

const statePattern = US_STATES.map(([, name]) => name).join('|')

function extractLocation(text: string) {
  const zip = text.match(/\b\d{5}(?:-\d{4})?\b/)
  if (zip) return zip[0].slice(0, 5)
  const pattern = new RegExp(`(?:^|\\b(?:near|around|in|by|from)\\s+)([A-Z][A-Za-z.' -]{1,55},\\s*(?:[A-Z]{2}|${statePattern}))(?=$|[.!?])`, 'i')
  return text.trim().match(pattern)?.[1]?.trim() ?? ''
}

function initialGreeting(location: LocationResult | null) {
  return location
    ? `Hi, I’m Leafy. What sounds good near ${location.label}? I can look through real LocalLoops gatherings and public event listings.`
    : 'Hi, I’m Leafy. What town or ZIP should I look around? I’ll check real LocalLoops gatherings and public event listings.'
}

export function LeafyPage({ events, location, locationQuery, interests, loading, locationError, onSearchLocation, onOpenEvent }: LeafyPageProps) {
  const { language } = useLanguage()
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 0, role: 'model', text: initialGreeting(location) }])
  const [draft, setDraft] = useState('')
  const [place, setPlace] = useState(location?.label ?? locationQuery)
  const [placeBusy, setPlaceBusy] = useState(false)
  const [replyError, setReplyError] = useState('')
  const [voiceState, setVoiceState] = useState<GuideVoiceState>('ready')
  const sortedEvents = useMemo(() => sortNearby(events, interests), [events, interests])
  const guideEvents = useMemo(() => sortedEvents.slice(0, 8), [sortedEvents])
  const onVoiceTurn = useCallback((turn: { role: 'user' | 'model'; text: string }) => {
    if (turn.role === 'user') {
      setMessages((current) => [...current, { id: Date.now() + Math.random(), ...turn }])
      const detectedLocation = extractLocation(turn.text)
      if (detectedLocation) void findPlace(detectedLocation)
    } else {
      setMessages((current) => [...current, { id: Date.now() + Math.random(), ...turn }])
    }
  // findPlace is stable for this page lifetime; the voice hook stores this callback in a ref.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const voice = useCommunityGuideVoice({ events: guideEvents, location, language, onTurn: onVoiceTurn })
  const activeVoiceState = voiceState !== 'ready' ? voiceState : voice.voiceState
  const isListening = activeVoiceState === 'listening'
  const isSpeaking = activeVoiceState === 'speaking'
  const isThinking = activeVoiceState === 'thinking'

  async function findPlace(query: string) {
    setPlace(query)
    setPlaceBusy(true)
    setReplyError('')
    const found = await onSearchLocation(query)
    setPlaceBusy(false)
    if (found) {
      setMessages((current) => [...current, {
        id: Date.now() + Math.random(),
        role: 'model',
        text: `I’m checking LocalLoops gatherings and public event listings near ${found.label}. I’ll show the listings below as they come back.`,
      }])
    }
    return found
  }

  async function submitLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!place.trim() || placeBusy) return
    const query = place.trim()
    setMessages((current) => [...current, { id: Date.now() + Math.random(), role: 'user', text: `Look around ${query}` }])
    await findPlace(query)
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || isThinking || isListening) return
    setDraft('')
    setReplyError('')
    const detectedLocation = extractLocation(text)
    const id = Date.now() + Math.random()
    setMessages((current) => [...current, { id, role: 'user', text }])
    if (detectedLocation && detectedLocation.toLowerCase() !== location?.label.toLowerCase()) {
      await findPlace(detectedLocation)
      return
    }
    try {
      const reply = await voice.sendText(text)
      setVoiceState('ready')
      if (reply) setMessages((current) => [...current, { id: Date.now() + Math.random(), role: 'model', text: reply }])
    } catch (error) {
      setVoiceState('error')
      setReplyError(error instanceof Error ? error.message : 'Leafy could not answer just now. Please try again.')
    }
  }

  const handleVoiceButton = () => {
    setVoiceState('ready')
    voice.onMainButton()
  }

  return (
    <div className="greet-page greet-leafy-page">
      <section className="greet-leafy-heading">
        <div>
          <p className="greet-eyebrow">Your LocalLoops guide</p>
          <h1>Ask Leafy</h1>
          <p>Tell me what you enjoy and I’ll look through nearby plans.</p>
        </div>
        <div className="greet-leafy-current-place"><MapPin size={16} /><span>{location?.label ?? 'Choose a town or ZIP to begin'}</span></div>
      </section>

      <section className="greet-leafy-workspace" aria-label="Talk with Leafy">
        <aside className={`greet-leafy-character ${isSpeaking ? 'is-speaking' : ''} ${isThinking ? 'is-thinking' : ''}`}>
          <span className="greet-leafy-character__halo" aria-hidden="true" />
          <span className="greet-leafy-character__sparkle greet-leafy-character__sparkle--one" aria-hidden="true"><Sparkles size={18} /></span>
          <img src="/images/localloops-sprout.png" alt="Leafy, your LocalLoops guide" />
          <div className="greet-leafy-character__caption"><strong>Leafy</strong><span>{isListening ? 'Listening to you' : isThinking ? 'Finding a helpful answer' : isSpeaking ? 'Speaking' : 'Here to help you find a plan'}</span></div>
          <span className="greet-leafy-audio-mark" aria-hidden="true"><i /><i /><i /><i /><i /></span>
        </aside>

        <div className="greet-leafy-conversation">
          <div className="greet-leafy-messages" aria-live="polite" aria-relevant="additions text">
            {messages.map((message) => (
              <article className={`greet-chat-message greet-chat-message--${message.role}`} key={message.id}>
                {message.role === 'model' && <span className="greet-chat-message__avatar"><Leaf size={15} /></span>}
                <div className="greet-chat-message__body"><span>{message.role === 'model' ? 'Leafy' : 'You'}</span><p>{message.text}</p></div>
              </article>
            ))}
            {isThinking && <div className="greet-chat-thinking" role="status"><span className="greet-chat-message__avatar"><Leaf size={15} /></span><span>Leafy is thinking <i /><i /><i /></span></div>}
          </div>

          <form className="greet-leafy-location" onSubmit={(event) => void submitLocation(event)}>
            <label htmlFor="greet-leafy-place">Town or ZIP code</label>
            <div><MapPin size={16} /><input id="greet-leafy-place" value={place} onChange={(event) => setPlace(event.target.value)} placeholder="For example, McCook, Nebraska" minLength={3} required /><button className="greet-button greet-button--soft" type="submit" disabled={placeBusy}>{placeBusy ? 'Searching…' : 'Search this area'}<Search size={14} /></button></div>
            {locationError && <p className="greet-form-message is-error" role="alert">{locationError}</p>}
          </form>

          <form className="greet-leafy-compose" onSubmit={(event) => void sendMessage(event)}>
            <label className="sr-only" htmlFor="greet-leafy-message">Ask Leafy about nearby plans</label>
            <textarea id="greet-leafy-message" rows={1} maxLength={1000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask Leafy anything about nearby plans" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} />
            <button className={`greet-leafy-mic ${isListening ? 'is-listening' : ''} ${isSpeaking ? 'is-speaking' : ''}`} type="button" onClick={handleVoiceButton} aria-label={isListening ? 'Finish speaking' : isSpeaking ? 'Stop Leafy speaking' : 'Talk to Leafy'} aria-pressed={isListening} disabled={isThinking}>{isListening ? <MicOff size={18} /> : isSpeaking ? <Volume2 size={18} /> : <Mic size={18} />}</button>
            <button className="greet-leafy-send" type="submit" aria-label="Send message" disabled={!draft.trim() || isThinking || isListening}><ArrowUp size={20} /></button>
          </form>
          <p className={`greet-leafy-status ${replyError ? 'is-error' : ''}`} role={replyError ? 'alert' : 'status'}>{replyError || (isListening ? voice.statusText : isSpeaking ? voice.statusText : 'Your conversation stays in this browser session.')}</p>
        </div>
      </section>

      <section className="greet-leafy-results" aria-labelledby="leafy-results-title">
        <div className="greet-leafy-results__heading"><div><p className="greet-eyebrow">Live listings</p><h2 id="leafy-results-title">{location ? `Plans near ${location.label}` : 'Plans near you'}</h2></div><span>{location ? 'Public listings and LocalLoops gatherings' : 'Choose a town or ZIP to search'}</span></div>
        {loading ? <div className="greet-loading" role="status">Checking the real listings…</div> : sortedEvents.length ? <div className="greet-leafy-event-list">{sortedEvents.slice(0, 6).map((event) => <EventCard key={event.id} event={event} onOpen={() => onOpenEvent(event)} compact />)}</div> : <div className="greet-leafy-empty"><span className="greet-leafy-empty__icon"><Leaf size={18} /></span><p>{location ? 'No listings came back for this area yet. Try a wider town or ZIP search, or check again later.' : 'Choose a town or ZIP and Leafy will look for real nearby listings.'}</p></div>}
      </section>
    </div>
  )
}
