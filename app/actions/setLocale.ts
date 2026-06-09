'use server'
import { cookies } from 'next/headers'
import type { Locale } from '@/lib/i18n'

export async function setLocaleCookie(locale: Locale) {
  const store = await cookies()
  store.set('locale', locale, { path: '/', maxAge: 365 * 24 * 60 * 60 })
}
