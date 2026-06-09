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
    const mou = e.target.value
    const qs = mou ? `?mou=${encodeURIComponent(mou)}` : ''
    router.push(`/ship/${encodeURIComponent(imo)}${qs}`)
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
