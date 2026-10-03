import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Globe2 } from 'lucide-react'
import { FALLBACK_LANGUAGES, nativeLanguageName, type TranslationLanguage } from '../lib/languages'

type LanguageContextValue = {
  language: string
  setLanguage: (code: string) => void
  languages: TranslationLanguage[]
  loadLanguages: () => void
  translationStatus: string
}

type TranslationContextProps = { children: ReactNode }
type TextRecord = { source: string; lastValue: string | null; language: string | null }
type AttributeRecord = { source: string; lastValue: string | null; language: string | null }
type TranslationResponse = { translations?: Array<{ translatedText?: string }>; code?: string }
type TranslationLanguageResponse = { languages?: TranslationLanguage[] }

const LanguageContext = createContext<LanguageContextValue | null>(null)
const ignoredSelector = 'script,style,noscript,textarea,input,[contenteditable="true"],[translate="no"],[data-translation-ignore],.greet-language-picker,.greet-translation-notice,.greet-map,.maplibregl-ctrl-attrib'
const translatableAttributes = ['placeholder', 'aria-label', 'title'] as const
const cacheStorageKey = 'greetme.google-translations.v1'

function initialLanguage() {
  try {
    return window.localStorage.getItem('greetme.language') ?? 'en'
  } catch {
    return 'en'
  }
}

function loadCache() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(cacheStorageKey) ?? '{}') as Record<string, string>
    return new Map(Object.entries(saved))
  } catch {
    return new Map<string, string>()
  }
}

function saveCache(cache: Map<string, string>) {
  try {
    const entries = [...cache.entries()].slice(-1200)
    window.localStorage.setItem(cacheStorageKey, JSON.stringify(Object.fromEntries(entries)))
  } catch {
    // The translator still works when browser storage is full or disabled.
  }
}

function cacheKey(language: string, source: string) {
  return `${language}\u0000${source}`
}

function decodeTranslatedText(text: string) {
  const element = document.createElement('textarea')
  element.innerHTML = text
  return element.value
}

function preserveWhitespace(source: string, translated: string) {
  const leading = source.match(/^\s*/)?.[0] ?? ''
  const trailing = source.match(/\s*$/)?.[0] ?? ''
  return leading + translated.trim() + trailing
}

function canTranslate(text: string) {
  const length = text.trim().length
  return length > 1 && length <= 4200 && /[a-z]{2}/i.test(text)
}

export function LanguageProvider({ children }: TranslationContextProps) {
  const [language, setLanguageState] = useState(initialLanguage)
  const [languages, setLanguages] = useState(FALLBACK_LANGUAGES)
  const [languagesLoaded, setLanguagesLoaded] = useState(false)
  const [translationStatus, setTranslationStatus] = useState('')
  const textRecords = useRef(new WeakMap<Text, TextRecord>())
  const attributeRecords = useRef(new WeakMap<Element, Map<string, AttributeRecord>>())
  const cache = useRef<Map<string, string> | null>(null)
  if (!cache.current) cache.current = loadCache()

  const setLanguage = useCallback((code: string) => {
    setLanguageState(code)
    setTranslationStatus('')
    try {
      window.localStorage.setItem('greetme.language', code)
    } catch {
      // Language selection remains available for this visit without storage.
    }
  }, [])

  const loadLanguages = useCallback(() => {
    if (languagesLoaded) return
    setLanguagesLoaded(true)
    void fetch('/api/translate?action=languages')
      .then(async (response) => {
        if (!response.ok) return null
        return await response.json() as TranslationLanguageResponse
      })
      .then((result) => {
        if (result?.languages?.length) {
          const fullList = result.languages.some((item) => item.code === 'en') ? result.languages : [{ code: 'en', name: 'English' }, ...result.languages]
          if (!fullList.some((item) => item.code === language)) {
            const selected = FALLBACK_LANGUAGES.find((item) => item.code === language)
            if (selected) fullList.push(selected)
          }
          setLanguages(fullList.sort((left, right) => left.code === 'en' ? -1 : right.code === 'en' ? 1 : left.name.localeCompare(right.name)))
        }
      })
      .catch(() => undefined)
  }, [language, languagesLoaded])

  useEffect(() => {
    const root = document.getElementById('root')
    document.documentElement.lang = language
    if (!root) return

    let stopped = false
    let failed = false
    let inFlight = false
    let pending = false
    let scheduled: number | undefined
    const textState = textRecords.current
    const attributeState = attributeRecords.current
    const translationCache = cache.current!

    const resetEnglish = () => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let node: Node | null
      while ((node = walker.nextNode())) {
        const textNode = node as Text
        const record = textState.get(textNode)
        if (record?.lastValue && textNode.data === record.lastValue) textNode.data = record.source
        if (record) {
          record.lastValue = null
          record.language = null
        }
      }
      root.querySelectorAll('*').forEach((element) => {
        const records = attributeState.get(element)
        if (!records) return
        for (const [attribute, record] of records) {
          if (record.lastValue && element.getAttribute(attribute) === record.lastValue) element.setAttribute(attribute, record.source)
          record.lastValue = null
          record.language = null
        }
      })
    }

    if (language === 'en') {
      resetEnglish()
      setTranslationStatus('')
    } else {
      setTranslationStatus('Translating page…')
    }

    const skipped = (element: Element | null) => Boolean(element?.closest(ignoredSelector))

    const getTextSource = (node: Text) => {
      const current = node.data
      const record = textState.get(node)
      if (!record) {
        const created = { source: current, lastValue: null, language: null }
        textState.set(node, created)
        return created.source
      }
      if (record.lastValue && current !== record.lastValue) {
        record.source = current
        record.lastValue = null
        record.language = null
      }
      return record.source
    }

    const getAttributeSource = (element: Element, attribute: string) => {
      let records = attributeState.get(element)
      if (!records) {
        records = new Map()
        attributeState.set(element, records)
      }
      const current = element.getAttribute(attribute) ?? ''
      let record = records.get(attribute)
      if (!record) {
        record = { source: current, lastValue: null, language: null }
        records.set(attribute, record)
      } else if (record.lastValue && current !== record.lastValue) {
        record.source = current
        record.lastValue = null
        record.language = null
      }
      return record
    }

    const collect = () => {
      const entries: Array<{ source: string; apply: (translated: string) => void }> = []
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let node: Node | null
      while ((node = walker.nextNode())) {
        const textNode = node as Text
        if (skipped(textNode.parentElement)) continue
        const source = getTextSource(textNode)
        if (!canTranslate(source)) continue
        const record = textState.get(textNode)!
        if (record.lastValue && record.language === language && textNode.data === record.lastValue) continue
        entries.push({
          source,
          apply: (translated) => {
            const currentRecord = textState.get(textNode)!
            const value = preserveWhitespace(source, translated)
            textNode.data = value
            currentRecord.lastValue = value
            currentRecord.language = language
          },
        })
      }

      root.querySelectorAll('*').forEach((element) => {
        if (skipped(element)) return
        for (const attribute of translatableAttributes) {
          if (!element.hasAttribute(attribute)) continue
          const record = getAttributeSource(element, attribute)
          if (!canTranslate(record.source)) continue
          if (record.lastValue && record.language === language && element.getAttribute(attribute) === record.lastValue) continue
          entries.push({
            source: record.source,
            apply: (translated) => {
              const value = decodeTranslatedText(translated)
              element.setAttribute(attribute, value)
              record.lastValue = value
              record.language = language
            },
          })
        }
      })
      return entries
    }

    const translate = async () => {
      if (stopped || failed || language === 'en') return
      if (inFlight) {
        pending = true
        return
      }
      inFlight = true
      try {
        do {
          pending = false
          const entries = collect()
          const uniqueTexts = [...new Set(entries.map((entry) => entry.source))]
          const needed = uniqueTexts.filter((source) => !translationCache.has(cacheKey(language, source)))
          for (let index = 0; index < needed.length;) {
            const batch: string[] = []
            let total = 0
            while (index < needed.length && batch.length < 40) {
              const next = needed[index]!
              if (batch.length && total + next.length > 4200) break
              batch.push(next)
              total += next.length
              index += 1
            }
            const response = await fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ texts: batch, target: language }),
            })
            const result = await response.json().catch(() => ({})) as TranslationResponse
            if (stopped) return
            if (!response.ok || !result.translations || result.translations.length !== batch.length) {
              failed = true
              resetEnglish()
              setTranslationStatus(result.code === 'translation_not_configured'
                ? 'Google Translation is not configured. Add GOOGLE_TRANSLATE_API_KEY to the server environment.'
                : 'Google Translation is unavailable right now. The page is shown in English.')
              return
            }
            batch.forEach((source, offset) => {
              const value = result.translations![offset]?.translatedText
              if (value) translationCache.set(cacheKey(language, source), decodeTranslatedText(value))
            })
            saveCache(translationCache)
          }
          if (stopped) return
          entries.forEach((entry) => {
            const value = translationCache.get(cacheKey(language, entry.source))
            if (value) entry.apply(value)
          })
        } while (pending && !stopped && !failed)
        if (!stopped && !failed) setTranslationStatus('')
      } catch {
        if (stopped) return
        failed = true
        resetEnglish()
        if (!stopped) setTranslationStatus('Google Translation is unavailable right now. The page is shown in English.')
      } finally {
        inFlight = false
      }
    }

    const observer = new MutationObserver(() => {
      if (language === 'en' || stopped || failed) return
      if (scheduled) window.clearTimeout(scheduled)
      scheduled = window.setTimeout(() => { void translate() }, 80)
    })
    observer.observe(root, { childList: true, characterData: true, attributes: true, attributeFilter: [...translatableAttributes], subtree: true })
    void translate()

    return () => {
      stopped = true
      observer.disconnect()
      if (scheduled) window.clearTimeout(scheduled)
    }
  }, [language])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, languages, loadLanguages, translationStatus }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider.')
  return value
}

export function LanguagePicker() {
  const { language, setLanguage, languages, loadLanguages } = useLanguage()

  return (
    <label className="greet-language-picker">
      <Globe2 size={16} aria-hidden="true" />
      <span className="sr-only">Choose site language</span>
      <select
        aria-label="Site language"
        value={language}
        onFocus={loadLanguages}
        onChange={(event) => {
          loadLanguages()
          setLanguage(event.target.value)
        }}
      >
        {languages.map((item) => (
          <option key={item.code} value={item.code}>{item.code === 'en' ? 'English' : `${nativeLanguageName(item)} — ${item.name}`}</option>
        ))}
      </select>
    </label>
  )
}

export function TranslationNotice() {
  const { language, translationStatus } = useLanguage()
  if (language === 'en' && !translationStatus) return null

  return (
    <div className="greet-translation-notice" role="status" aria-live="polite">
      {translationStatus || 'Google translates public page and event text. Member details, pickup notes, and private messages are not sent.'}
    </div>
  )
}
