'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { t } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/browser'

const valueProps = [
  t('app.valueProp1'),
  t('app.valueProp2'),
  t('app.valueProp3'),
] as const

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    let valid = true
    if (!trimmedEmail) {
      setEmailError(t('login.error.emailRequired'))
      valid = false
    } else if (!EMAIL_RE.test(trimmedEmail)) {
      setEmailError(t('login.error.emailInvalid'))
      valid = false
    } else {
      setEmailError(null)
    }

    if (!trimmedPassword) {
      setPasswordError(t('login.error.passwordRequired'))
      valid = false
    } else {
      setPasswordError(null)
    }

    if (!valid) return

    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password: trimmedPassword })

    if (authError) {
      setError(t('login.error.credentials'))
      setLoading(false)
      return
    }

    // Refresh server component cache so layout/middleware see the new session
    router.refresh()
    router.push('/dashboard')
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
                  onChange={(e) => { setEmail(e.target.value); setEmailError(null) }}
                  placeholder={t('login.emailPlaceholder')}
                  disabled={loading}
                  className="w-full rounded-sm border border-border bg-page-bg px-3 py-2.5 text-sm text-text placeholder:text-text-muted outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors disabled:opacity-50"
                />
                {emailError && <p className="mt-1 text-xs text-danger-text">{emailError}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">
                  {t('login.password')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(null) }}
                  disabled={loading}
                  className="w-full rounded-sm border border-border bg-page-bg px-3 py-2.5 text-sm text-text outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors disabled:opacity-50"
                />
                {passwordError && <p className="mt-1 text-xs text-danger-text">{passwordError}</p>}
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-sm border border-danger-text/30 bg-danger-bg px-3 py-2.5 text-sm text-danger-text">
                  <AlertCircle size={14} className="shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-card bg-navy-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-700 transition-colors mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? t('login.submitting') : t('login.submit')}
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
