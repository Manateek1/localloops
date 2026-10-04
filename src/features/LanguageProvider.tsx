import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Globe2 } from 'lucide-react'
import { FALLBACK_LANGUAGES, nativeLanguageName, type TranslationLanguage } from '../lib/languages'
import { translateOfflineText } from '../lib/offlineTranslations'

type LanguageContextValue = {
  language: string
  setLanguage: (code: string) => void
  languages: TranslationLanguage[]
}

type TranslationContextProps = { children: ReactNode }
type TextRecord = { source: string; rendered: string; language: string | null; translated: string | null }
type AttributeRecord = { source: string; rendered: string; language: string | null; translated: string | null }

const LanguageContext = createContext<LanguageContextValue | null>(null)
const supportedCodes = new Set(FALLBACK_LANGUAGES.map(({ code }) => code))
const ignoredTextSelector = 'script,style,noscript,textarea,input,[contenteditable="true"],[translate="no"],[data-translation-ignore],.maplibregl-ctrl-attrib,.greet-language-picker option'
const ignoredAttributeSelector = 'script,style,noscript,[contenteditable="true"],[translate="no"],[data-translation-ignore],.maplibregl-ctrl-attrib,.greet-language-picker option'
const translatableAttributes = ['placeholder', 'aria-label', 'title', 'alt'] as const

function initialLanguage() {
  try {
    const saved = window.localStorage.getItem('localloops.language')
    return saved && supportedCodes.has(saved) ? saved : 'en'
  } catch {
    return 'en'
  }
}

function preserveWhitespace(source: string, translated: string) {
  const leading = source.match(/^\s*/)?.[0] ?? ''
  const trailing = source.match(/\s*$/)?.[0] ?? ''
  return leading + translated.trim() + trailing
}

function decodedAttribute(value: string) {
  const element = document.createElement('textarea')
  element.innerHTML = value
  return element.value
}

export function LanguageProvider({ children }: TranslationContextProps) {
  const [language, setLanguageState] = useState(initialLanguage)
  const textRecords = useRef(new WeakMap<Text, TextRecord>())
  const attributeRecords = useRef(new WeakMap<Element, Map<string, AttributeRecord>>())

  const setLanguage = (code: string) => {
    if (!supportedCodes.has(code)) return
    setLanguageState(code)
    try {
      window.localStorage.setItem('localloops.language', code)
    } catch {
      // The selection still applies for this visit when browser storage is unavailable.
    }
  }

  useEffect(() => {
    const root = document.getElementById('root')
    document.documentElement.lang = language
    if (!root) return

    const textState = textRecords.current
    const attributeState = attributeRecords.current

    const restoreEnglish = () => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let node: Node | null
      while ((node = walker.nextNode())) {
        const text = node as Text
        const record = textState.get(text)
        if (!record) continue
        if (text.data !== record.rendered) record.source = text.data
        if (record.translated !== null && text.data === record.rendered) text.data = record.source
        record.rendered = text.data
        record.language = null
        record.translated = null
      }

      root.querySelectorAll('*').forEach((element) => {
        const records = attributeState.get(element)
        if (!records) return
        records.forEach((record, attribute) => {
          const current = element.getAttribute(attribute) ?? ''
          if (current !== record.rendered) record.source = current
          if (record.translated !== null && element.getAttribute(attribute) === record.rendered) {
            element.setAttribute(attribute, record.source)
          }
          record.rendered = element.getAttribute(attribute) ?? ''
          record.language = null
          record.translated = null
        })
      })
    }

    restoreEnglish()

    const isIgnoredText = (element: Element | null) => Boolean(element?.closest(ignoredTextSelector))
    const isIgnoredAttribute = (element: Element | null) => Boolean(element?.closest(ignoredAttributeSelector))

    const translateText = (text: Text) => {
      if (isIgnoredText(text.parentElement)) return
      let record = textState.get(text)
      if (!record) {
        record = { source: text.data, rendered: text.data, language: null, translated: null }
        textState.set(text, record)
      } else if (text.data !== record.rendered) {
        record.source = text.data
        record.rendered = text.data
        record.language = null
        record.translated = null
      }
      if (record.language === language) return

      const translated = language === 'en' ? null : translateOfflineText(record.source, language)
      const value = translated === null ? record.source : preserveWhitespace(record.source, translated)
      if (text.data !== value) text.data = value
      record.rendered = value
      record.language = language
      record.translated = translated === null ? null : value
    }

    const translateAttribute = (element: Element, attribute: typeof translatableAttributes[number]) => {
      if (isIgnoredAttribute(element)) return
      const current = element.getAttribute(attribute)
      if (current === null) return
      let records = attributeState.get(element)
      if (!records) {
        records = new Map()
        attributeState.set(element, records)
      }
      let record = records.get(attribute)
      if (!record) {
        record = { source: current, rendered: current, language: null, translated: null }
        records.set(attribute, record)
      } else if (current !== record.rendered) {
        record.source = current
        record.rendered = current
        record.language = null
        record.translated = null
      }
      if (record.language === language) return

      const translated = language === 'en' ? null : translateOfflineText(record.source, language)
      const value = translated === null ? record.source : decodedAttribute(translated)
      if (current !== value) element.setAttribute(attribute, value)
      record.rendered = value
      record.language = language
      record.translated = translated === null ? null : value
    }

    const translateTree = () => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let node: Node | null
      while ((node = walker.nextNode())) translateText(node as Text)
      root.querySelectorAll('*').forEach((element) => {
        for (const attribute of translatableAttributes) translateAttribute(element, attribute)
      })
    }

    translateTree()
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') translateText(mutation.target as Text)
        if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          for (const attribute of translatableAttributes) translateAttribute(mutation.target, attribute)
        }
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((added) => {
            if (added.nodeType === Node.TEXT_NODE) translateText(added as Text)
            else if (added instanceof Element) {
              const walker = document.createTreeWalker(added, NodeFilter.SHOW_TEXT)
              let node: Node | null
              while ((node = walker.nextNode())) translateText(node as Text)
              for (const attribute of translatableAttributes) translateAttribute(added, attribute)
              added.querySelectorAll('*').forEach((element) => {
                for (const attribute of translatableAttributes) translateAttribute(element, attribute)
              })
            }
          })
        }
      }
    })
    observer.observe(root, {
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...translatableAttributes],
      subtree: true,
    })
    return () => observer.disconnect()
  }, [language])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, languages: FALLBACK_LANGUAGES }}>
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
  const { language, setLanguage, languages } = useLanguage()

  return (
    <label className="greet-language-picker">
      <Globe2 size={16} aria-hidden="true" />
      <span className="sr-only">Choose site language</span>
      <select aria-label="Site language" value={language} onChange={(event) => setLanguage(event.target.value)}>
        {languages.map((item) => (
          <option key={item.code} value={item.code}>{item.code === 'en' ? 'English' : `${nativeLanguageName(item)} — ${item.name}`}</option>
        ))}
      </select>
    </label>
  )
}

const noticeCopy: Record<string, string> = {
  en: 'Site controls use built-in translations. Event details, member names, and messages stay in their original language.',
  es: 'Los controles del sitio usan traducciones integradas. Los detalles de eventos, nombres y mensajes conservan su idioma original.',
  fr: 'Les commandes du site utilisent des traductions intégrées. Les événements, noms et messages restent dans leur langue d’origine.',
  pt: 'Os controles do site usam traduções incluídas. Detalhes dos eventos, nomes e mensagens permanecem no idioma original.',
  'zh-CN': '网站控件使用内置翻译。活动详情、成员姓名和消息保留原始语言。',
  hi: 'साइट के नियंत्रण अंतर्निहित अनुवादों का उपयोग करते हैं। कार्यक्रम का विवरण, सदस्य के नाम और संदेश मूल भाषा में रहते हैं।',
  vi: 'Các điều khiển trang web dùng bản dịch tích hợp. Chi tiết sự kiện, tên thành viên và tin nhắn vẫn giữ ngôn ngữ gốc.',
}

export function TranslationNotice() {
  const { language } = useLanguage()
  if (language === 'en') return null

  return (
    <div className="greet-translation-notice" data-translation-ignore role="status" aria-live="polite">
      {noticeCopy[language] ?? noticeCopy.en}
    </div>
  )
}
