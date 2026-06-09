'use client'
import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { t } from '@/lib/i18n'

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
      <div className="hidden lg:flex w-110 shrink-0 flex-col justify-between bg-linear-to-br from-navy-900 to-navy-700 px-12 py-16">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2 mb-14">
            <span className="text-white font-semibold text-xl tracking-tight">
              {t('app.name')}
            </span>
            <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          </div>

          {/* Headline */}
          <h1 className="text-white text-2xl font-medium leading-snug mb-10">
            {t('app.tagline')}
          </h1>

          {/* Value props */}
          <ul className="space-y-5">
            {valueProps.map((prop) => (
              <li key={prop} className="flex items-start gap-3.5">
                <CheckCircle2 size={18} className="text-accent mt-0.5 shrink-0" />
                <span className="text-white/75 text-sm leading-relaxed">{prop}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-white/30 text-xs">{t('login.copyright')}</p>
      </div>

      {/* Right: form panel */}
      <div className="flex flex-1 items-center justify-center bg-page-bg px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile-only logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <span className="text-text font-semibold text-xl">{t('app.name')}</span>
            <span className="h-2 w-2 rounded-full bg-accent" />
          </div>

          {/* Form card */}
          <div className="bg-surface border border-border rounded-card p-8">
            <h2 className="text-text text-xl font-medium mb-6">{t('login.title')}</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">
                  {t('login.email')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('login.emailPlaceholder')}
                  className="w-full rounded-sm border border-border bg-page-bg px-3 py-2.5 text-sm text-text placeholder:text-text-muted outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">
                  {t('login.password')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-sm border border-border bg-page-bg px-3 py-2.5 text-sm text-text outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-card bg-navy-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-700 transition-colors mt-1"
              >
                {t('login.submit')}
              </button>
            </form>

            <p className="text-xs text-text-muted text-center mt-5">
              {t('login.noAccount')}{' '}
              <button
                type="button"
                className="text-accent font-medium hover:underline"
              >
                {t('login.requestAccess')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
