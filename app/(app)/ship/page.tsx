import Link from 'next/link'
import { Ship } from 'lucide-react'
import { getFleetOverview } from '@/lib/fleet'
import type { ShipWithStats, RiskLevel } from '@/lib/fleet'
import { ShipSearchForm } from './_components/ShipSearchForm'
import { RiskBadge } from '@/app/_components/ui/RiskBadge'
import type { RiskLevel as BadgeLevel } from '@/app/_components/ui/RiskBadge'
import { StaggerList, StaggerItem, FadeUp } from '@/app/_components/ui/motion'
import { getT } from '@/lib/locale'

const riskToLevel: Record<RiskLevel, BadgeLevel> = {
  high: 'danger',
  medium: 'warning',
  low: 'success',
}

export default async function ShipListPage() {
  const { t } = await getT()
  const ships = await getFleetOverview()

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <FadeUp>
        <h1 className="text-lg font-medium text-text mb-5">{t('nav.ships')}</h1>
        <ShipSearchForm className="mb-6" />
      </FadeUp>

      {ships.length === 0 ? (
        <FadeUp delay={0.1}>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Ship size={48} className="text-border mb-4" />
            <p className="text-sm text-text-muted">{t('ship.list.empty')}</p>
          </div>
        </FadeUp>
      ) : (
        <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ships.map((ship: ShipWithStats) => (
            <StaggerItem key={ship.id}>
              <Link
                href={`/ship/${encodeURIComponent(ship.imo)}`}
                className="block bg-surface border border-border rounded-card p-4 group
                           hover:border-accent/40 hover:-translate-y-0.5 hover:shadow-md
                           transition-all duration-150"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text truncate group-hover:text-navy-700 transition-colors">
                      {ship.name}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5 font-mono">{ship.imo}</p>
                  </div>
                  <RiskBadge level={riskToLevel[ship.risk]} className="shrink-0 mt-0.5">
                    {ship.risk === 'high' ? t('risk.high') : ship.risk === 'medium' ? t('risk.medium') : t('risk.low')}
                  </RiskBadge>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {ship.ship_type && (
                    <span className="text-[11px] text-text-muted bg-border/60 rounded px-2 py-0.5">
                      {ship.ship_type}
                    </span>
                  )}
                  {ship.flag && (
                    <span className="text-[11px] text-text-muted">{ship.flag}</span>
                  )}
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  )
}
