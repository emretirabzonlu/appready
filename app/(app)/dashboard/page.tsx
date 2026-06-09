import Link from 'next/link'
import { Ship } from 'lucide-react'
import {
  getShipCount,
  getDetentionCount12M,
  getLastInspectionDate,
  getRecentShips,
} from '@/lib/ships'
import { MetricCard } from '@/app/_components/ui/MetricCard'
import { SectionHeader } from '@/app/_components/ui/SectionHeader'
import { RiskBadge } from '@/app/_components/ui/RiskBadge'
import { Card } from '@/app/_components/ui/Card'
import { ShipSearchForm } from '@/app/(app)/ship/_components/ShipSearchForm'
import { t } from '@/lib/i18n'

export default async function DashboardPage() {
  const [shipCount, detained12m, lastDate, recentShips] = await Promise.all([
    getShipCount(),
    getDetentionCount12M(),
    getLastInspectionDate(),
    getRecentShips(5),
  ])

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <h1 className="text-lg font-medium text-text mb-6">{t('nav.dashboard')}</h1>

      {/* Summary metrics */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <MetricCard
          label={t('dashboard.totalShips')}
          value={shipCount}
          variant="navy"
        />
        <MetricCard
          label={t('dashboard.detained12m')}
          value={detained12m}
          variant={detained12m > 0 ? 'danger' : 'success'}
        />
        <MetricCard
          label={t('dashboard.lastInspection')}
          value={lastDate ?? '—'}
          variant="navy"
        />
      </div>

      {/* Recent ships */}
      <SectionHeader
        step={1}
        title={t('dashboard.recentShips')}
        description={t('dashboard.recentShips.desc')}
      />

      {recentShips.length === 0 ? (
        <div className="flex items-center gap-3 py-6 px-4 rounded-card border border-border bg-surface mb-8">
          <Ship size={24} className="text-border shrink-0" />
          <p className="text-sm text-text-muted">{t('ship.list.empty')}</p>
        </div>
      ) : (
        <div className="space-y-2 mb-8">
          {recentShips.map((ship) => (
            <Link
              key={ship.id}
              href={`/ship/${encodeURIComponent(ship.imo)}`}
              className="flex items-center gap-3 px-4 py-3 bg-surface border border-border rounded-card hover:border-accent/40 transition-colors group"
            >
              <Ship size={15} className="text-text-muted shrink-0" />
              <span className="text-sm font-medium text-text flex-1 truncate group-hover:text-navy-700">
                {ship.name}
              </span>
              <span className="text-xs text-text-muted font-mono shrink-0">{ship.imo}</span>
              {ship.flag && (
                <span className="text-xs text-text-muted shrink-0 hidden sm:inline">{ship.flag}</span>
              )}
              {ship.ship_type && (
                <RiskBadge level="neutral" className="shrink-0 hidden sm:inline-flex">
                  {ship.ship_type}
                </RiskBadge>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Add ship shortcut */}
      <SectionHeader
        step={2}
        title={t('dashboard.addShip')}
        description={t('dashboard.addShip.desc')}
      />
      <Card className="p-5">
        <ShipSearchForm />
      </Card>
    </div>
  )
}
