import { cookies } from 'next/headers'
import { createT } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'

export async function getServerLocale(): Promise<Locale> {
  const store = await cookies()
  return store.get('locale')?.value === 'en' ? 'en' : 'tr'
}

export async function getT() {
  const locale = await getServerLocale()
  return { t: createT(locale), locale }
}
