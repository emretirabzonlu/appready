'use client'
import { useRouter } from 'next/navigation'
import { t } from '@/lib/i18n'
import type { MouRegion } from '@/lib/mou'

type Props = {
  regions: MouRegion[]
  imo: string
  currentMou: string
}

export function RegionSelect({ regions, imo, currentMou }: Props) {
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams()
    if (imo) params.set('imo', imo)
    if (e.target.value) params.set('mou', e.target.value)
    router.push(`/ship?${params.toString()}`)
  }

  return (
    <select
      value={currentMou}
      onChange={handleChange}
      className="rounded border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:ring-1 focus:ring-accent"
    >
      <option value="">{t('analysis.selectRegion')}</option>
      {regions.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </select>
  )
}
