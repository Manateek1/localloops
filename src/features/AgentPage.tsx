import { useEffect, useRef, useState } from 'react'
import {
  CalendarDays,
  Compass,
  Heart,
  MapPin,
  Mic,
  MicOff,
  RefreshCw,
  Sparkles,
  TreePine,
  UserRoundPlus,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react'
import type { CommunityEvent, Profile } from '../data/models'
import { INTEREST_OPTIONS } from '../data/models'
import { DEMO_EVENTS, DEMO_PROFILES } from '../data/mockData'

type AgentPageProps = {
  profile: Profile | null
  events: CommunityEvent[]
  neighbors: Profile[]
  onOpenEvent: (event: CommunityEvent) => void
  onConnectNeighbor: (neighborId: string) => void
  onUpdateInterests: (interests: string[]) => void
  onSignIn: () => void
}

type AgentState = 'idle' | 'listening' | 'thinking' | 'speaking'

type RecommendationMode = 'events' | 'neighbors' | 'interests' | 'all'

export function AgentPage({
  profile,
  events,
  neighbors,
  onOpenEvent,
  onConnectNeighbor,
  onUpdateInterests,
  onSignIn,
}: AgentPageProps) {
  const [state, setState] = useState<AgentState>('idle')
  const [userSpeech, setUserSpeech] = useState<string>('')
  const [agentSpeech, setAgentSpeech] = useState<string>(
    'Hello! I’m Sprout, your local voice companion. Speak out loud or tap a prompt to discover nearby plans, meet similar neighbors, or update what you love doing.'
  )
  const [activeRecommendation, setActiveRecommendation] = useState<RecommendationMode>('all')
  const [suggestedEvents, setSuggestedEvents] = useState<CommunityEvent[]>([])
  const [matchedNeighbors, setMatchedNeighbors] = useState<Profile[]>([])
  const [localInterests, setLocalInterests] = useState<string[]>(
    profile?.interests?.length ? profile.interests : ['Hiking', 'Gardening', 'Live music']
  )
  const [voiceMuted, setVoiceMuted] = useState(false)
  const [audioLevel, setAudioLevel] = useState<number>(0)
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  const recognitionRef = useRef<any>(null)

  // Fallback to demo items if real feed hasn't populated yet
  const availableEvents = events.length > 0 ? events : DEMO_EVENTS
  const availableNeighbors = neighbors.length > 0 ? neighbors : DEMO_PROFILES

  // Update local interests if profile changes
  useEffect(() => {
    if (profile?.interests && profile.interests.length > 0) {
      setLocalInterests(profile.interests)
    }
  }, [profile?.interests])

  // Initial recommendation generation
  useEffect(() => {
    recommendEvents(localInterests)
    matchNeighbors(localInterests)
  }, [localInterests])

  // Simulate audio reactive waveform when speaking or listening
  useEffect(() => {
    if (state === 'listening' || state === 'speaking') {
      const interval = setInterval(() => {
        setAudioLevel(Math.floor(Math.random() * 60) + 40)
      }, 120)
      return () => clearInterval(interval)
    } else {
      setAudioLevel(0)
    }
  }, [state])

  // Native Speech Synthesis (Speak out loud)
  const speakText = (text: string) => {
    if (voiceMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.05
    utterance.pitch = 1.05

    // Pick a natural friendly voice if available
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Karen'))
    )
    if (preferredVoice) utterance.voice = preferredVoice

    utterance.onstart = () => setState('speaking')
    utterance.onend = () => setState('idle')
    utterance.onerror = () => setState('idle')

    window.speechSynthesis.speak(utterance)
  }

  // Handle Voice Listening via Web Speech API
  const startListening = () => {
    if (typeof window === 'undefined') return

    // Stop speaking if Sprout was talking
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setState('thinking')
      setTimeout(() => {
        respondToQuery('Suggest events based on my profile')
      }, 600)
      return
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setState('listening')
        setUserSpeech('Listening to your voice...')
      }

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('')
        setUserSpeech(transcript)
      }

      recognition.onerror = () => {
        setState('idle')
        setUserSpeech('')
      }

      recognition.onend = () => {
        if (userSpeech && userSpeech !== 'Listening to your voice...') {
          setState('thinking')
          respondToQuery(userSpeech)
        } else {
          setState('idle')
        }
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch {
      setState('idle')
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    if (state === 'speaking' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setState('idle')
    }
  }

  // Intent Processing & Sprout Response
  const respondToQuery = (query: string) => {
    setState('thinking')
    const lower = query.toLowerCase()

    setTimeout(() => {
      // Intent 1: Interests Update / Edit
      if (
        lower.includes('add') ||
        lower.includes('interest') ||
        lower.includes('like') ||
        lower.includes('hobby')
      ) {
        const found = INTEREST_OPTIONS.filter((item) =>
          lower.includes(item.toLowerCase())
        )
        let updated = [...localInterests]
        if (found.length > 0) {
          found.forEach((item) => {
            if (!updated.includes(item)) updated.push(item)
          })
          setLocalInterests(updated)
          onUpdateInterests(updated)
          setActionNotice(`Updated your interests: Added ${found.join(', ')}`)
          const reply = `I've added ${found.join(' and ')} to your interests! I updated your recommendations to match.`
          setAgentSpeech(reply)
          setActiveRecommendation('interests')
          speakText(reply)
          return
        }
      }

      // Intent 2: Neighbor Matchmaking
      if (
        lower.includes('neighbor') ||
        lower.includes('people') ||
        lower.includes('friend') ||
        lower.includes('connect') ||
        lower.includes('similar')
      ) {
        matchNeighbors(localInterests)
        setActiveRecommendation('neighbors')
        const topNeighbor = matchedNeighbors[0] || availableNeighbors[0]
        const reply = `I found neighbors with similar passions! You and ${topNeighbor.display_name} share an interest in ${topNeighbor.interests.slice(0, 2).join(' and ')}.`
        setAgentSpeech(reply)
        setActionNotice(`Matched with ${topNeighbor.display_name} based on shared interests.`)
        speakText(reply)
        return
      }

      // Intent 3: Event Suggestion based on Profile
      recommendEvents(localInterests)
      setActiveRecommendation('events')
      const topEvent = suggestedEvents[0] || availableEvents[0]
      const reply = `Based on your profile, I recommend "${topEvent.title}". It takes place in ${topEvent.city} and matches your interest in ${topEvent.category}.`
      setAgentSpeech(reply)
      setActionNotice(`Recommended "${topEvent.title}" for your weekend plans.`)
      speakText(reply)
    }, 700)
  }

  // Event Recommendation logic
  const recommendEvents = (interests: string[]) => {
    const scored = availableEvents.map((evt) => {
      const text = `${evt.title} ${evt.description} ${evt.category}`.toLowerCase()
      let score = 0
      interests.forEach((interest) => {
        if (text.includes(interest.toLowerCase())) score += 2
      })
      return { event: evt, score }
    })
    scored.sort((a, b) => b.score - a.score)
    setSuggestedEvents(scored.slice(0, 3).map((s) => s.event))
  }

  // Neighbor Matchmaking logic
  const matchNeighbors = (interests: string[]) => {
    const scored = availableNeighbors.map((neighbor) => {
      const shared = neighbor.interests.filter((i) => interests.includes(i))
      return { neighbor, sharedCount: shared.length, shared }
    })
    scored.sort((a, b) => b.sharedCount - a.sharedCount)
    setMatchedNeighbors(scored.map((s) => s.neighbor))
  }

  const toggleInterest = (interest: string) => {
    let next: string[]
    if (localInterests.includes(interest)) {
      next = localInterests.filter((i) => i !== interest)
      setActionNotice(`Removed "${interest}" from your interests.`)
    } else {
      next = [...localInterests, interest]
      setActionNotice(`Added "${interest}" to your interests!`)
    }
    setLocalInterests(next)
    onUpdateInterests(next)
    recommendEvents(next)
    matchNeighbors(next)
  }

  return (
    <div className="greet-page greet-agent-page">
      {/* Header Info */}
      <div className="greet-page-heading">
        <p className="greet-eyebrow">
          <Sparkles size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: -1 }} />
          Voice Companion & Guide
        </p>
        <h1>Talk with Sprout</h1>
        <p>
          Your hands-free neighborhood guide. Speak out loud to discover nearby plans, connect with
          neighbors who share your passions, or refine what you love doing.
        </p>
      </div>

      {/* Hero Voice Visualizer Stage (NOT ChatGPT text chat) */}
      <section className="greet-agent-stage" aria-label="Voice conversation with Sprout">
        {/* Dynamic Rings & Avatar */}
        <div className={`greet-agent-orb greet-agent-orb--${state}`}>
          <div className="greet-agent-ring greet-agent-ring--1" />
          <div className="greet-agent-ring greet-agent-ring--2" />
          <div className="greet-agent-ring greet-agent-ring--3" />

          <div className="greet-agent-avatar">
            <img src="/images/localloops-sprout.png" alt="Sprout the friendly guide" />
          </div>

          {state === 'speaking' && (
            <div className="greet-agent-live-wave">
              {[40, 75, 55, 90, 60, 85, 45, 95, 70, 50].map((h, i) => (
                <span
                  key={i}
                  style={{
                    height: `${Math.min(100, (h * (audioLevel || 50)) / 50)}%`,
                    animationDelay: `${i * 0.08}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="greet-agent-status-badge">
          {state === 'listening' && (
            <span className="is-listening">
              <span className="greet-pulse-dot" /> Listening — go ahead and speak...
            </span>
          )}
          {state === 'thinking' && (
            <span className="is-thinking">
              <RefreshCw size={13} className="greet-spin" /> Matching with local plans & neighbors...
            </span>
          )}
          {state === 'speaking' && (
            <span className="is-speaking">
              <Volume2 size={14} /> Sprout is speaking...
            </span>
          )}
          {state === 'idle' && (
            <span className="is-idle">
              <TreePine size={14} /> Tap the mic or choose a prompt to begin
            </span>
          )}
        </div>

        {/* Live Speech Bubble Transcript */}
        <div className="greet-agent-dialogue" aria-live="polite">
          {userSpeech && (
            <div className="greet-agent-bubble greet-agent-bubble--user">
              <small>You said</small>
              <p>"{userSpeech}"</p>
            </div>
          )}
          <div className="greet-agent-bubble greet-agent-bubble--agent">
            <small>Sprout</small>
            <p>{agentSpeech}</p>
          </div>
        </div>

        {/* Primary Voice Controls */}
        <div className="greet-agent-controls">
          <button
            type="button"
            className={`greet-agent-mic-btn ${state === 'listening' ? 'is-active' : ''}`}
            onClick={state === 'listening' ? stopListening : startListening}
            aria-label={state === 'listening' ? 'Stop listening' : 'Start speaking with Sprout'}
          >
            {state === 'listening' ? <MicOff size={26} /> : <Mic size={26} />}
            <span className="greet-mic-ripple" />
          </button>

          <button
            type="button"
            className="greet-agent-mute-btn"
            onClick={() => {
              setVoiceMuted(!voiceMuted)
              if (!voiceMuted && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel()
              }
            }}
            title={voiceMuted ? 'Unmute voice' : 'Mute voice output'}
            aria-label={voiceMuted ? 'Unmute voice' : 'Mute voice output'}
          >
            {voiceMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
        </div>

        {/* Quick Voice Prompt Pills (For quick demoing / hands-free questions) */}
        <div className="greet-agent-prompts" role="group" aria-label="Quick voice questions">
          <span className="greet-agent-prompts-label">Try asking out loud:</span>
          <button
            type="button"
            className="greet-agent-pill"
            onClick={() => {
              setUserSpeech('Suggest events based on my profile')
              respondToQuery('Suggest events based on my profile')
            }}
          >
            🎙️ "Suggest events for my interests"
          </button>
          <button
            type="button"
            className="greet-agent-pill"
            onClick={() => {
              setUserSpeech('Introduce me to neighbors who like hiking')
              respondToQuery('Introduce me to neighbors who like hiking')
            }}
          >
            🎙️ "Find neighbors who like hiking"
          </button>
          <button
            type="button"
            className="greet-agent-pill"
            onClick={() => {
              setUserSpeech('Add Gardening and Live music to my interests')
              respondToQuery('Add Gardening and Live music to my interests')
            }}
          >
            🎙️ "Add Gardening & Live music"
          </button>
        </div>

        {/* Live Action Toast Banner */}
        {actionNotice && (
          <div className="greet-agent-toast" role="status">
            <Sparkles size={14} />
            <span>{actionNotice}</span>
          </div>
        )}
      </section>

      {/* Dynamic Results Panels Triggered by Voice */}
      <section className="greet-agent-results" aria-label="Sprout recommendations">
        <div className="greet-agent-tabs">
          <button
            type="button"
            className={activeRecommendation === 'all' || activeRecommendation === 'events' ? 'is-active' : ''}
            onClick={() => setActiveRecommendation('events')}
          >
            <CalendarDays size={15} /> Suggested Plans ({suggestedEvents.length})
          </button>
          <button
            type="button"
            className={activeRecommendation === 'neighbors' ? 'is-active' : ''}
            onClick={() => setActiveRecommendation('neighbors')}
          >
            <Users size={15} /> Neighbor Match ({matchedNeighbors.length})
          </button>
          <button
            type="button"
            className={activeRecommendation === 'interests' ? 'is-active' : ''}
            onClick={() => setActiveRecommendation('interests')}
          >
            <Heart size={15} /> Your Interests ({localInterests.length})
          </button>
        </div>

        {/* Suggested Events Cards */}
        {(activeRecommendation === 'all' || activeRecommendation === 'events') && (
          <div className="greet-agent-section">
            <div className="greet-agent-section-header">
              <h3>
                <Sparkles size={16} /> Recommended For Your Profile
              </h3>
              <p>Events matched based on your current passion tags.</p>
            </div>
            <div className="greet-agent-event-grid">
              {suggestedEvents.map((event) => (
                <article key={event.id} className="greet-agent-card greet-agent-card--event">
                  {event.imageUrl && (
                    <div className="greet-agent-card__image">
                      <img src={event.imageUrl} alt={event.title} />
                      <span className="greet-agent-match-badge">94% Profile Match</span>
                    </div>
                  )}
                  <div className="greet-agent-card__body">
                    <span className="greet-agent-card__tag">{event.category}</span>
                    <h4>{event.title}</h4>
                    <p className="greet-agent-card__location">
                      <MapPin size={13} /> {event.venue}, {event.city} · {event.timeLabel || 'Upcoming'}
                    </p>
                    <p className="greet-agent-card__desc">{event.description}</p>
                    <button
                      type="button"
                      className="greet-button greet-button--primary"
                      onClick={() => onOpenEvent(event)}
                    >
                      <Compass size={14} /> Open Event & RSVP
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* Neighbor Matchmaking Cards */}
        {(activeRecommendation === 'all' || activeRecommendation === 'neighbors') && (
          <div className="greet-agent-section">
            <div className="greet-agent-section-header">
              <h3>
                <Users size={16} /> Similar Neighbors
              </h3>
              <p>People in your area with overlapping interests and active public gatherings.</p>
            </div>
            <div className="greet-agent-neighbor-grid">
              {matchedNeighbors.slice(0, 3).map((neighbor) => {
                const shared = neighbor.interests.filter((i) => localInterests.includes(i))
                return (
                  <article key={neighbor.id} className="greet-agent-card greet-agent-card--neighbor">
                    <div className="greet-agent-neighbor-header">
                      {neighbor.avatar_url ? (
                        <img className="greet-member-avatar" src={neighbor.avatar_url} alt="" />
                      ) : (
                        <span className="greet-member-avatar greet-member-avatar--initials">
                          {neighbor.display_name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <div>
                        <h4>{neighbor.display_name}</h4>
                        <span className="greet-member-location">
                          <MapPin size={12} /> {neighbor.home_region || 'Local Neighbor'} · {shared.length} shared {shared.length === 1 ? 'passion' : 'passions'}
                        </span>
                      </div>
                    </div>
                    <p className="greet-member-bio">{neighbor.bio}</p>
                    <div className="greet-tag-list">
                      {neighbor.interests.map((tag) => (
                        <span
                          key={tag}
                          className={localInterests.includes(tag) ? 'is-shared' : ''}
                          title={localInterests.includes(tag) ? 'Shared interest!' : ''}
                        >
                          {localInterests.includes(tag) ? '✓ ' : ''}
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="greet-button greet-button--outline"
                      onClick={() => onConnectNeighbor(neighbor.id)}
                    >
                      <UserRoundPlus size={14} /> Connect & Say Hello
                    </button>
                  </article>
                )
              })}
            </div>
          </div>
        )}

        {/* Voice-Editable Interests Panel */}
        <div className="greet-agent-section greet-agent-interests-panel">
          <div className="greet-agent-section-header">
            <h3>
              <Heart size={16} /> Edit Profile Interests Through Voice
            </h3>
            <p>
              Say <em>"Add volunteering and local food"</em> or tap tags below to update your profile in real time.
            </p>
          </div>
          <div className="greet-interest-grid">
            {INTEREST_OPTIONS.map((interest) => {
              const selected = localInterests.includes(interest)
              return (
                <button
                  type="button"
                  key={interest}
                  className={selected ? 'is-selected' : ''}
                  onClick={() => toggleInterest(interest)}
                >
                  {selected && <Sparkles size={11} />}
                  {interest}
                </button>
              )
            })}
          </div>

          <div className="greet-agent-dev-note">
            <TreePine size={15} />
            <span>
              <strong>Note:</strong> Account profile backend is currently unlinked. Once your account
              system is connected, Sprout will automatically persist these voice-curated interests to
              your live profile database.{' '}
              {!profile && (
                <button
                  type="button"
                  className="greet-text-button"
                  onClick={onSignIn}
                  style={{ textDecoration: 'underline', marginLeft: 4 }}
                >
                  Sign in
                </button>
              )}
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
