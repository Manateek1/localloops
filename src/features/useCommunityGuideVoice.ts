import { useCallback, useEffect, useRef, useState } from 'react'
import type { CommunityEvent, LocationResult } from '../data/models'

export type GuideVoiceState = 'ready' | 'listening' | 'thinking' | 'speaking' | 'error'

type GuideTurn = { role: 'user' | 'model'; text: string }
type ProviderStatus = { grok: boolean; elevenLabs: boolean }
type VoiceInput = { transcript: string }
type GuideRecognitionEvent = {
  resultIndex: number
  results: ArrayLike<{ isFinal: boolean; 0?: { transcript: string } }>
}
type GuideRecognitionErrorEvent = { error: string }
type GuideRecognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: GuideRecognitionEvent) => void) | null
  onerror: ((event: GuideRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type GuideRecognitionConstructor = new () => GuideRecognition
type SpeechRecognitionWindow = {
  SpeechRecognition?: GuideRecognitionConstructor
  webkitSpeechRecognition?: GuideRecognitionConstructor
}

const MAX_LISTENING_MS = 15_000
const MAX_GUIDE_RESPONSE_MS = 48_000
const MAX_HISTORY_TURNS = 6

export function useCommunityGuideVoice({ events, location, language }: {
  events: CommunityEvent[]
  location: LocationResult | null
  language: string
}) {
  const [voiceState, setVoiceStateValue] = useState<GuideVoiceState>('ready')
  const [statusText, setStatusText] = useState('Ready when you are.')
  const [providers, setProviders] = useState<ProviderStatus>({ grok: false, elevenLabs: false })
  const voiceStateRef = useRef<GuideVoiceState>('ready')
  const activationRef = useRef(0)
  const recognitionRef = useRef<GuideRecognition | null>(null)
  const listeningTimerRef = useRef<number | undefined>(undefined)
  const guideRequestRef = useRef<AbortController | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | undefined>(undefined)
  const conversationRef = useRef<GuideTurn[]>([])

  const setVoiceState = useCallback((nextState: GuideVoiceState) => {
    voiceStateRef.current = nextState
    setVoiceStateValue(nextState)
  }, [])

  const primeAudioPlayback = useCallback(() => {
    if (typeof AudioContext === 'undefined') return
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext()
      }
      void audioContextRef.current.resume().catch(() => undefined)
    } catch {
      // The HTML audio and browser speech fallbacks remain available.
    }
  }, [])

  const finishSpeaking = useCallback(() => {
    audioSourceRef.current = null
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    audioUrlRef.current = undefined
    setVoiceState('ready')
    setStatusText('Ready when you are.')
  }, [setVoiceState])

  const speakWithBrowser = useCallback((text: string, speakingStatus: string) => {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setVoiceState('error')
      setStatusText('Voice playback is not supported in this browser. Try an up-to-date browser.')
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = speechLocale(language)
    utterance.rate = 1
    utterance.pitch = 1.02
    utterance.onend = finishSpeaking
    utterance.onerror = finishSpeaking
    setStatusText(speakingStatus)
    window.speechSynthesis.speak(utterance)
  }, [finishSpeaking, language, setVoiceState])

  const speakReply = useCallback(async (text: string, audioBase64: string | undefined, speakingStatus: string) => {
    setVoiceState('speaking')
    setStatusText(speakingStatus)

    if (audioBase64) {
      try {
        const context = audioContextRef.current
        if (context && context.state !== 'closed') {
          await context.resume()
          const binary = window.atob(audioBase64)
          const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
          const buffer = await context.decodeAudioData(bytes.buffer)
          const source = context.createBufferSource()
          source.buffer = buffer
          source.connect(context.destination)
          source.onended = finishSpeaking
          audioSourceRef.current = source
          source.start()
          return
        }

        const binary = window.atob(audioBase64)
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
        const audioUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }))
        const audio = new Audio(audioUrl)
        audioUrlRef.current = audioUrl
        audioRef.current = audio
        audio.onended = finishSpeaking
        audio.onerror = () => speakWithBrowser(text, speakingStatus)
        await audio.play()
        return
      } catch {
        speakWithBrowser(text, speakingStatus)
        return
      }
    }

    speakWithBrowser(text, speakingStatus)
  }, [finishSpeaking, setVoiceState, speakWithBrowser])

  const stopListeningTimer = useCallback(() => {
    if (listeningTimerRef.current !== undefined) window.clearTimeout(listeningTimerRef.current)
    listeningTimerRef.current = undefined
  }, [])

  const submitToGuide = useCallback(async ({ transcript }: VoiceInput) => {
    const controller = new AbortController()
    guideRequestRef.current = controller
    const timeoutId = window.setTimeout(() => controller.abort('timeout'), MAX_GUIDE_RESPONSE_MS)
    setVoiceState('thinking')
    setStatusText('Thinking of a good local plan…')

    const eventContext = events.slice(0, 8).map((event) => ({
      title: event.title,
      city: event.city,
      state: event.state,
      startsAt: event.startsAt,
      timeLabel: event.timeLabel,
      category: event.category,
      description: event.description,
      sourceName: event.sourceName,
      isFree: event.isFree,
      distanceMiles: event.distanceMiles,
    }))

    try {
      const response = await fetch('/api/guide', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          transcript,
          history: conversationRef.current.slice(-MAX_HISTORY_TURNS),
          context: { location: location?.label ?? '', language, events: eventContext },
        }),
        signal: controller.signal,
      })
      const result = await response.json() as {
        heard?: string
        reply?: string
        audioBase64?: string
        voiceProvider?: 'elevenlabs' | 'browser'
        error?: string
      }
      if (!response.ok || !result.reply) throw new Error(result.error || 'The guide could not answer just now. Please try again.')

      if (result.heard) conversationRef.current.push({ role: 'user', text: result.heard })
      conversationRef.current.push({ role: 'model', text: result.reply })
      conversationRef.current = conversationRef.current.slice(-MAX_HISTORY_TURNS)

      await speakReply(result.reply, result.audioBase64, 'Sprout is answering. Tap the button to interrupt.')
    } catch (error) {
      if (controller.signal.reason === 'cancelled') return
      setVoiceState('error')
      setStatusText(controller.signal.reason === 'timeout'
        ? 'The guide could not answer just now. Please try again.'
        : error instanceof Error && error.name !== 'TypeError' && error.name !== 'SyntaxError'
          ? error.message
          : 'The guide could not answer just now. Please try again.')
    } finally {
      window.clearTimeout(timeoutId)
      if (guideRequestRef.current === controller) guideRequestRef.current = null
    }
  }, [events, language, location, setVoiceState, speakReply])

  const startListening = useCallback(() => {
    const speechWindow = window as unknown as SpeechRecognitionWindow
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    if (!Recognition) {
      setVoiceState('error')
      setStatusText('Speech recognition is not supported in this browser. Try an up-to-date browser.')
      return
    }

    const activation = ++activationRef.current
    const recognition = new Recognition()
    let transcript = ''
    let recognitionFailed = false
    recognition.lang = speechLocale(language)
    recognition.continuous = true
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition
    setVoiceState('listening')
    setStatusText('I’m listening. Tap to finish, or speak for up to 15 seconds.')

    recognition.onresult = (event) => {
      const finalParts: string[] = []
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        if (result.isFinal && result[0]?.transcript) finalParts.push(result[0].transcript)
      }
      transcript = `${transcript} ${finalParts.join(' ')}`.trim()
    }
    recognition.onerror = (event) => {
      if (activation !== activationRef.current) return
      recognitionFailed = true
      if (recognitionRef.current === recognition) recognitionRef.current = null
      stopListeningTimer()
      setVoiceState('error')
      setStatusText(event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Microphone or speech recognition access is off. Allow it in your browser, then try again.'
        : event.error === 'network'
          ? 'The browser speech service could not connect. Check your connection and try again.'
          : 'I couldn’t hear that clearly. Please try again.')
    }
    recognition.onend = () => {
      if (activation !== activationRef.current) return
      if (recognitionRef.current === recognition) recognitionRef.current = null
      stopListeningTimer()
      if (recognitionFailed) return
      if (!transcript) {
        setVoiceState('error')
        setStatusText('I didn’t hear a question. Move a little closer to the microphone and try again.')
        return
      }
      void submitToGuide({ transcript: transcript.slice(0, 1200) })
    }

    try {
      recognition.start()
      listeningTimerRef.current = window.setTimeout(() => {
        if (recognitionRef.current === recognition) recognition.stop()
      }, MAX_LISTENING_MS)
    } catch {
      recognitionRef.current = null
      stopListeningTimer()
      setVoiceState('error')
      setStatusText('Speech recognition could not start. Check browser permission and try again.')
    }
  }, [language, setVoiceState, stopListeningTimer, submitToGuide])

  const interrupt = useCallback(() => {
    activationRef.current += 1
    recognitionRef.current?.abort()
    recognitionRef.current = null
    audioSourceRef.current?.stop()
    audioSourceRef.current = null
    audioRef.current?.pause()
    audioRef.current = null
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    audioUrlRef.current = undefined
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    stopListeningTimer()
    setVoiceState('ready')
    setStatusText('Ready when you are.')
  }, [setVoiceState, stopListeningTimer])

  const onMainButton = useCallback(() => {
    if (voiceStateRef.current === 'thinking') {
      guideRequestRef.current?.abort('cancelled')
      guideRequestRef.current = null
      setVoiceState('ready')
      setStatusText('Ready when you are.')
      return
    }
    if (voiceStateRef.current === 'listening') {
      if (recognitionRef.current) recognitionRef.current.stop()
      else interrupt()
      return
    }
    if (voiceStateRef.current === 'speaking') {
      interrupt()
      return
    }
    if (voiceStateRef.current === 'error') setStatusText('Ready when you are.')
    primeAudioPlayback()
    void startListening()
  }, [interrupt, primeAudioPlayback, setStatusText, setVoiceState, startListening])

  useEffect(() => {
    let active = true
    void fetch('/api/guide')
      .then((response) => response.json() as Promise<ProviderStatus>)
      .then((status) => {
        if (active) setProviders({ grok: Boolean(status.grok), elevenLabs: Boolean(status.elevenLabs) })
      })
      .catch(() => undefined)

    return () => {
      active = false
      voiceStateRef.current = 'ready'
      activationRef.current += 1
      guideRequestRef.current?.abort('cancelled')
      guideRequestRef.current = null
      if (recognitionRef.current) {
        recognitionRef.current.onend = null
        recognitionRef.current.abort()
        recognitionRef.current = null
      }
      if (listeningTimerRef.current !== undefined) window.clearTimeout(listeningTimerRef.current)
      try { audioSourceRef.current?.stop() } catch { /* Already stopped. */ }
      audioRef.current?.pause()
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') void audioContextRef.current.close()
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [])

  const connectionNote = providers.grok && providers.elevenLabs
    ? 'Your voice guide is ready.'
    : providers.grok
      ? 'Your voice guide is ready with browser voice.'
      : 'Your voice guide is getting ready.'

  return { voiceState, statusText, connectionNote, onMainButton }
}

function speechLocale(language: string) {
  const exact: Record<string, string> = {
    en: 'en-US', es: 'es-US', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW',
    fr: 'fr-FR', ar: 'ar-SA', hi: 'hi-IN', pt: 'pt-BR', de: 'de-DE',
    ja: 'ja-JP', ko: 'ko-KR', vi: 'vi-VN', tl: 'fil-PH', ru: 'ru-RU',
    uk: 'uk-UA', sw: 'sw-KE', am: 'am-ET', so: 'so-SO', bn: 'bn-BD',
    ur: 'ur-PK', fa: 'fa-IR', it: 'it-IT', pl: 'pl-PL', tr: 'tr-TR',
    ht: 'ht-HT',
  }
  return exact[language] ?? language
}
