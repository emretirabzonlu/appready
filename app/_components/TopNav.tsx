'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { t } from '@/lib/i18n'

export function TopNav() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q) router.push(`/ship?imo=${encodeURIComponent(q)}`)
  }

  return (
    <header className="h-14 bg-navy-900 flex items-center gap-4 px-4 shrink-0">
      <div className="flex items-center gap-2 w-56 shrink-0">
        <span className="text-white font-semibold text-[15px] tracking-tight">
          {t('app.name')}
        </span>
        <span className="h-2 w-2 rounded-full bg-accent shrink-0" />
      </div>

      <form onSubmit={handleSearch} className="flex-1 max-w-sm">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search.placeholder')}
          className="w-full rounded-sm bg-navy-700 px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none focus:ring-1 focus:ring-accent"
        />
      </form>

      <div className="flex items-center gap-3 ml-auto">
        <button
          type="button"
          aria-label="Bildirimler"
          className="text-white/60 hover:text-white transition-colors"
        >
          <Bell size={18} />
        </button>
        <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-semibold select-none">
          DP
        </div>
      </div>
    </header>
  )
}
