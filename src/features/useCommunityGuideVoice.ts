import { useCallback, useEffect, useRef, useState } from 'react'
import type { CommunityEvent, LocationResult } from '../data/models'

export type GuideVoiceState = 'ready' | 'listening' | 'thinking' | 'speaking' | 'error'

type GuideTurn = { role: 'user' | 'model'; text: string }
type ProviderStatus = { gemini: boolean; elevenLabs: boolean }
type VoiceInput = { audio: string; mimeType: string }

const MAX_RECORDING_MS = 15_000
const MAX_AUDIO_BYTES = 750_000
const MAX_HISTORY_TURNS = 6

export function useCommunityGuideVoice({ events, location, language }: {
  events: CommunityEvent[]
  location: LocationResult | null
  language: string
}) {
  const [voiceState, setVoiceStateValue] = useState<GuideVoiceState>('ready')
  const [statusText, setStatusText] = useState('Ready when you are.')
  const [providers, setProviders] = useState<ProviderStatus>({ gemini: false, elevenLabs: false })
  const voiceStateRef = useRef<GuideVoiceState>('ready')
  const activationRef = useRef(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])
  const recordingTimerRef = useRef<number | undefined>(undefined)
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

  const stopRecordingTracks = useCallback(() => {
    if (recordingTimerRef.current !== undefined) window.clearTimeout(recordingTimerRef.current)
    recordingTimerRef.current = undefined
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const submitToGuide = useCallback(async ({ audio, mimeType }: VoiceInput) => {
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
          audio,
          mimeType,
          history: conversationRef.current.slice(-MAX_HISTORY_TURNS),
          context: { location: location?.label ?? '', language, events: eventContext },
        }),
        signal: AbortSignal.timeout(30_000),
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

      const voiceName = result.voiceProvider === 'elevenlabs' ? 'ElevenLabs' : 'your browser’s voice'
      await speakReply(result.reply, result.audioBase64, `Sprout is answering with ${voiceName}. Tap the button to interrupt.`)
    } catch (error) {
      setVoiceState('error')
      setStatusText(error instanceof Error ? error.message : 'The guide could not answer just now. Please try again.')
    }
  }, [events, language, location, setVoiceState, speakReply])

  const startListening = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceState('error')
      setStatusText('This browser cannot use a microphone. Try an up-to-date browser over HTTPS.')
      return
    }

    const activation = ++activationRef.current
    setVoiceState('listening')
    setStatusText('Connecting to your microphone…')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (activation !== activationRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream

      const supportedTypes = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus']
      const mimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported(type))
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 48_000 })
        : new MediaRecorder(stream, { audioBitsPerSecond: 48_000 })
      recorderRef.current = recorder
      audioChunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size) audioChunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        stopRecordingTracks()
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        audioChunksRef.current = []
        if (!blob.size) {
          setVoiceState('error')
          setStatusText('I didn’t hear anything. Move a little closer to the microphone and try again.')
          return
        }
        if (blob.size > MAX_AUDIO_BYTES) {
          setVoiceState('error')
          setStatusText('That recording was too long. Please try a shorter question.')
          return
        }

        const reader = new FileReader()
        reader.onerror = () => {
          setVoiceState('error')
          setStatusText('I couldn’t read that recording. Please try again.')
        }
        reader.onload = () => {
          const dataUrl = typeof reader.result === 'string' ? reader.result : ''
          const audio = dataUrl.split(',')[1]
          if (!audio) {
            setVoiceState('error')
            setStatusText('I couldn’t read that recording. Please try again.')
            return
          }
          void submitToGuide({ audio, mimeType: blob.type.split(';')[0] || 'audio/webm' })
        }
        reader.readAsDataURL(blob)
      }
      recorder.start()
      setStatusText('I’m listening. Tap to finish, or speak for up to 15 seconds.')
      recordingTimerRef.current = window.setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop()
      }, MAX_RECORDING_MS)
    } catch (error) {
      stopRecordingTracks()
      setVoiceState('error')
      setStatusText(error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Microphone access is off. Allow it in your browser, then try again.'
        : 'The microphone could not start. Check browser permission and try again.')
    }
  }, [setVoiceState, stopRecordingTracks, submitToGuide])

  const interrupt = useCallback(() => {
    activationRef.current += 1
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.onstop = null
      recorderRef.current.stop()
      audioChunksRef.current = []
    }
    audioSourceRef.current?.stop()
    audioSourceRef.current = null
    audioRef.current?.pause()
    audioRef.current = null
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    audioUrlRef.current = undefined
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    stopRecordingTracks()
    setVoiceState('ready')
    setStatusText('Ready when you are.')
  }, [setVoiceState, stopRecordingTracks])

  const onMainButton = useCallback(() => {
    if (voiceStateRef.current === 'thinking') return
    if (voiceStateRef.current === 'listening') {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
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
  }, [interrupt, primeAudioPlayback, startListening])

  useEffect(() => {
    let active = true
    void fetch('/api/guide')
      .then((response) => response.json() as Promise<ProviderStatus>)
      .then((status) => {
        if (active) setProviders({ gemini: Boolean(status.gemini), elevenLabs: Boolean(status.elevenLabs) })
      })
      .catch(() => undefined)

    return () => {
      active = false
      voiceStateRef.current = 'ready'
      activationRef.current += 1
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.onstop = null
        recorderRef.current.stop()
      }
      streamRef.current?.getTracks().forEach((track) => track.stop())
      if (recordingTimerRef.current !== undefined) window.clearTimeout(recordingTimerRef.current)
      try { audioSourceRef.current?.stop() } catch { /* Already stopped. */ }
      audioRef.current?.pause()
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') void audioContextRef.current.close()
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [])

  const connectionNote = providers.gemini && providers.elevenLabs
    ? 'Gemini AI · ElevenLabs voice'
    : providers.gemini
      ? 'Gemini AI · browser voice backup'
      : 'The voice guide is connecting'

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
