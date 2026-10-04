import { AudioLines, LoaderCircle, Mic, MicOff, Sparkles, Trees, Volume2 } from 'lucide-react'
import type { CommunityEvent, LocationResult } from '../data/models'
import { useLanguage } from './LanguageProvider'
import { useCommunityGuideVoice } from './useCommunityGuideVoice'

type VoiceGuideProps = {
  events: CommunityEvent[]
  location: LocationResult | null
}

export function VoiceGuide({ events, location }: VoiceGuideProps) {
  const { language } = useLanguage()
  const { voiceState, statusText, connectionNote, onMainButton } = useCommunityGuideVoice({ events, location, language })
  const isListening = voiceState === 'listening'
  const isSpeaking = voiceState === 'speaking'
  const isThinking = voiceState === 'thinking'
  const Icon = isListening ? MicOff : isSpeaking ? Volume2 : isThinking ? LoaderCircle : Mic
  const label = isListening
    ? 'Finish speaking'
    : isSpeaking
      ? 'Interrupt Sprout'
      : isThinking
        ? 'Interrupt Sprout'
        : voiceState === 'error'
          ? 'Try again'
          : 'Talk to Sprout'

  return (
    <aside className={'greet-guide-card greet-guide-card--' + voiceState} aria-label="Voice guide">
      <div className="greet-guide-card__copy">
        <span className="greet-guide-card__kicker"><Trees size={15} />Your LocalLoops guide</span>
        <h2>Let’s find a good local plan.</h2>
        <p>Ask about live public events and LocalLoops gatherings near your chosen location.</p>
        <div className="greet-guide-controls">
          <button
            className="greet-button greet-button--primary greet-guide-talk-button"
            type="button"
            onClick={onMainButton}
            aria-label={label}
            aria-pressed={isListening}
          >
            <Icon size={17} className={isThinking ? 'greet-guide-spinner' : undefined} />
            <span>{label}</span>
          </button>
          {isListening && <span className="greet-guide-live-indicator" aria-label="Microphone is active" />}
          {isSpeaking && <AudioLines size={18} className="greet-guide-speaking-indicator" aria-hidden="true" />}
        </div>
        {isThinking && <div className="greet-guide-thinking-bar" aria-hidden="true"><span /></div>}
        <p className="greet-guide-status" role="status" aria-live="polite">{statusText}</p>
        <p className="greet-guide-language-note"><Sparkles size={13} aria-hidden="true" />{connectionNote}</p>
        <p className="greet-guide-privacy">Your browser’s speech service may process microphone audio. Azure receives your transcript and selected area/event context; LocalLoops doesn’t save transcripts.</p>
      </div>
      <img src="/images/localloops-sprout.png" alt="Sprout, your friendly LocalLoops guide" />
      <span className="greet-guide-card__sparkle" aria-hidden="true"><Sparkles size={22} /></span>
      <span className="greet-guide-wave" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></span>
    </aside>
  )
}
