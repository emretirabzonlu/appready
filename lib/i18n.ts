import tr from '@/locales/tr.json'
import en from '@/locales/en.json'

const dictionaries = { tr, en } as const
export type Locale = keyof typeof dictionaries
export type TranslationKey = keyof typeof tr

export const defaultLocale: Locale = 'tr'

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  let str: string = tr[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, String(v))
    }
  }
  return str
}
