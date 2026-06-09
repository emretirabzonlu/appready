import tr from '@/locales/tr.json'
import en from '@/locales/en.json'

const dictionaries = { tr, en } as const
export type Locale = keyof typeof dictionaries
export type TranslationKey = keyof typeof tr

export const defaultLocale: Locale = 'tr'

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  return tl('tr', key, params)
}

export function tl(
  locale: Locale,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const dict = dictionaries[locale] as Record<string, string>
  let str = dict[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, String(v))
    }
  }
  return str
}

export function createT(locale: Locale) {
  return (key: TranslationKey, params?: Record<string, string | number>): string =>
    tl(locale, key, params)
}
