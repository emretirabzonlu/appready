import { cn } from '@/lib/utils'
import { RiskBadge } from './RiskBadge'
import type { RiskLevel } from './RiskBadge'
import type { Ship } from '@/lib/ships'

type Props = {
  ship: Ship
  riskLevel?: RiskLevel
  riskLabel?: string
  selectedRegionName?: string
  className?: string
}

export function ShipHero({ ship, riskLevel = 'neutral', riskLabel, selectedRegionName, className }: Props) {
  const meta = [ship.ship_type, ship.flag, ship.call_sign].filter(Boolean).join(' · ')

  const infoItems = [
    { label: 'IMO',    value: ship.imo },
    { label: 'İnşa',   value: ship.year_built?.toString() ?? null },
    { label: 'Bayrak', value: ship.flag },
    { label: 'Klas',   value: ship.class_society },
    { label: 'Bölge',  value: selectedRegionName ?? null },
  ]

  return (
    <div className={cn('rounded-card overflow-hidden bg-linear-to-r from-navy-900 to-navy-700', className)}>
      <div className="px-6 pt-6 pb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-medium text-white leading-tight truncate">{ship.name}</h2>
          {meta && <p className="text-sm mt-1.5 text-accent/70 truncate">{meta}</p>}
        </div>
        {riskLabel && (
          <RiskBadge level={riskLevel} className="text-sm px-3 py-1.5 shrink-0">
            {riskLabel}
          </RiskBadge>
        )}
      </div>

      <div className="mx-6 h-px bg-white/10" />

      <div className="px-6 py-4 grid grid-cols-5 gap-4">
        {infoItems.map(({ label, value }) => (
          <div key={label}>
            <p className="text-[10px] font-medium uppercase tracking-widest text-white/40 mb-0.5">
              {label}
            </p>
            <p className="text-sm font-medium text-white truncate">{value ?? '—'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
