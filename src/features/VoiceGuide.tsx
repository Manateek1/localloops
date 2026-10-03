import { useCallback, useState } from 'react'
import { ConversationProvider, useConversation } from '@elevenlabs/react'
import { AudioLines, Mic, MicOff, Sparkles, Trees } from 'lucide-react'
import { supabaseClient } from '../lib/supabase/client'

type VoiceGuideProps = {
  signedIn: boolean
  onSignIn: () => void
}

type VoiceTokenResponse = { token?: string; code?: string; message?: string }

function explainVoiceError(error: unknown) {
  const name = error instanceof DOMException ? error.name : ''
  const detail = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  if (name === 'NotAllowedError' || /permission|notallowed|denied/.test(detail)) {
    return 'Allow microphone access for this site in your browser settings, then try again.'
  }
  if (name === 'NotFoundError' || /notfound|no microphone/.test(detail)) {
    return 'No microphone was found. Connect a microphone and try again.'
  }
  if (name === 'NotReadableError' || /notreadable|device is in use/.test(detail)) {
    return 'Your microphone is busy or unavailable. Close other apps using it, then try again.'
  }
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    return 'Microphone access needs a secure HTTPS connection and a supported browser.'
  }
  return 'The voice chat could not start. Check your connection and try again.'
}

function VoiceGuideControls({ signedIn, onSignIn }: VoiceGuideProps) {
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const handleVoiceError = useCallback((reason: unknown) => setError(explainVoiceError(reason)), [])
  const conversation = useConversation({ onError: handleVoiceError })

  const startOrEnd = async () => {
    setError('')
    if (!signedIn) {
      onSignIn()
      return
    }
    if (conversation.status === 'connected') {
      await conversation.endSession()
      return
    }
    if (starting || conversation.status === 'connecting') return
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('Microphone access needs a secure HTTPS connection and a supported browser.')
      return
    }

    setStarting(true)
    try {
      const { data, error: sessionError } = await supabaseClient?.auth.getSession() ?? { data: { session: null }, error: new Error('Supabase is not configured.') }
      if (sessionError || !data.session?.access_token) {
        setError('Your sign-in has expired. Sign in again to talk with the guide.')
        return
      }

      const response = await fetch('/api/voice-token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      })
      const payload = await response.json().catch(() => ({})) as VoiceTokenResponse
      if (!response.ok) {
        if (payload.code === 'voice_not_configured') {
          setError('The voice guide is waiting for the ElevenLabs API key and agent ID in Vercel.')
        } else {
          setError(payload.message ?? 'The voice guide could not connect just now. Please try again.')
        }
        return
      }
      if (!payload.token) {
        setError('The voice guide returned an invalid session. Please try again.')
        return
      }
      await conversation.startSession({ conversationToken: payload.token })
    } catch (reason) {
      setError(explainVoiceError(reason))
    } finally {
      setStarting(false)
    }
  }

  const active = conversation.status === 'connected'
  const busy = starting || conversation.status === 'connecting'
  const statusText = active
    ? conversation.isSpeaking ? 'Your guide is speaking…' : conversation.isListening ? 'Listening — go ahead.' : 'You’re connected to your guide.'
    : busy ? 'Connecting…' : signedIn ? 'Your mic turns on only when you start.' : 'Sign in to have a voice chat.'

  return (
    <aside className="greet-guide-card" aria-label="GreetMe voice guide">
      <div className="greet-guide-card__copy">
        <span className="greet-guide-card__kicker"><Trees size={15} />Your GreetMe guide</span>
        <h2>A friendly face for finding your people.</h2>
        <p>Ask out loud about local plans and getting connected. Your microphone is used only during a voice chat.</p>
        <div className="greet-guide-controls">
          <button className="greet-button greet-button--primary" type="button" onClick={() => void startOrEnd()} disabled={busy} aria-pressed={active}>
            {active ? <><AudioLines size={16} />End voice chat</> : <><Mic size={16} />{busy ? 'Connecting…' : signedIn ? 'Talk with your guide' : 'Sign in to talk'}</>}
          </button>
          {active && <button className="greet-button greet-button--quiet" type="button" onClick={() => conversation.setMuted(!conversation.isMuted)} aria-pressed={conversation.isMuted}>
            {conversation.isMuted ? <><Mic size={15} />Unmute</> : <><MicOff size={15} />Mute</>}
          </button>}
        </div>
        <p className="greet-guide-status" role="status" aria-live="polite">{error || statusText}</p>
      </div>
      <img src="/images/greetme-sprout.png" alt="A small smiling sprout character with open arms" />
      <span className="greet-guide-card__sparkle" aria-hidden="true"><Sparkles size={22} /></span>
    </aside>
  )
}

export function VoiceGuide(props: VoiceGuideProps) {
  return <ConversationProvider><VoiceGuideControls {...props} /></ConversationProvider>
}
