'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { t } from '@/lib/i18n'

export function ShipSearchForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [imo, setImo] = useState(searchParams.get('imo') ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = imo.trim()
    if (trimmed) router.push(`/ship?imo=${encodeURIComponent(trimmed)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
      <div className="relative flex-1 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        <input
          type="text"
          value={imo}
          onChange={(e) => setImo(e.target.value)}
          placeholder={t('ship.imoPlaceholder')}
          className="w-full rounded border border-border bg-surface pl-8 pr-3 py-2 text-sm text-text placeholder:text-text-muted outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      <button
        type="submit"
        className="rounded bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-700 transition-colors"
      >
        {t('ship.fetch')}
      </button>
    </form>
  )
}
