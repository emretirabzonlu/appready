'use client'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createT } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'

type LocaleCtx = {
  locale: Locale
  setLocale: (l: Locale) => void
}

const LocaleContext = createContext<LocaleCtx>({ locale: 'tr', setLocale: () => {} })

export function LocaleProvider({
  children,
  initial,
}: {
  children: React.ReactNode
  initial: Locale
}) {
  const router = useRouter()
  const mounted = useRef(false)

  // Prefer localStorage on first mount (survives hard refresh without cookie)
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('locale')
      if (stored === 'en' || stored === 'tr') return stored
    }
    return initial
  })

  // Sync if server sends a different initial value after router.refresh()
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    setLocaleState(initial)
  }, [initial])

  function setLocale(l: Locale) {
    setLocaleState(l)
    localStorage.setItem('locale', l)
    document.cookie = `locale=${l};path=/;max-age=${365 * 24 * 60 * 60}`
    router.refresh()
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}

export function useT() {
  const { locale } = useLocale()
  return createT(locale)
}
