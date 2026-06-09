'use client'
import { useState } from 'react'
import { t } from '@/lib/i18n'
import { CheckCircle2 } from 'lucide-react'

const valueProps = [
  t('app.valueProp1'),
  t('app.valueProp2'),
  t('app.valueProp3'),
] as const

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // TODO: Supabase auth
  }

  return (
    <div className="flex min-h-screen">
      {/* Left: brand panel */}
      <div className="hidden lg:flex w-[420px] shrink-0 flex-col justify-between bg-navy-900 px-12 py-16">
        <div>
          <div className="flex items-center gap-2 mb-12">
            <span className="text-white font-semibold text-xl tracking-tight">
              {t('app.name')}
            </span>
            <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          </div>
          <h1 className="text-white text-2xl font-medium leading-snug mb-4">
            {t('app.tagline')}
          </h1>
          <ul className="space-y-3 mt-8">
            {valueProps.map((prop) => (
              <li key={prop} className="flex items-start gap-3 text-white/70 text-sm">
                <CheckCircle2 size={16} className="text-accent mt-0.5 shrink-0" />
                {prop}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-white/30 text-xs">© 2026 PortReady</p>
      </div>

      {/* Right: form */}
      <div className="flex flex-1 items-center justify-center bg-surface px-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <span className="text-text font-semibold text-xl">{t('app.name')}</span>
            <span className="h-2 w-2 rounded-full bg-accent" />
          </div>
          <h2 className="text-text text-xl font-medium mb-6">{t('login.title')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                {t('login.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.emailPlaceholder')}
                className="w-full rounded border border-border px-3 py-2 text-sm text-text placeholder:text-text-muted outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                {t('login.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-border px-3 py-2 text-sm text-text outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded bg-navy-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-700 transition-colors"
            >
              {t('login.submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
