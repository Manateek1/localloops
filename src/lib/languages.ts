export type TranslationLanguage = { code: string; name: string }

// These are the locales with bundled translations, available without a network service.
export const FALLBACK_LANGUAGES: TranslationLanguage[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'hi', name: 'Hindi' },
  { code: 'vi', name: 'Vietnamese' },
]

export function nativeLanguageName(language: TranslationLanguage) {
  try {
    return new Intl.DisplayNames([language.code], { type: 'language' }).of(language.code) ?? language.name
  } catch {
    return language.name
  }
}
