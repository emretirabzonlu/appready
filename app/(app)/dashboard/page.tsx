import Link from 'next/link'
import { Ship, Clock, ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react'
import {
  getShipCount,
  getTotalDetentionCount,
  getLastInspectionDate,
  getRecentShips,
} from '@/lib/ships'
import type { ShipSummary } from '@/lib/ships'
import { getDashboardAlerts } from '@/lib/fleet'
import type { CertAlert, HighRiskShipAlert, ChronicShipAlert } from '@/lib/fleet'
import { MetricCard } from '@/app/_components/ui/MetricCard'
import { SectionHeader } from '@/app/_components/ui/SectionHeader'
import { RiskBadge } from '@/app/_components/ui/RiskBadge'
import { Card } from '@/app/_components/ui/Card'
import { FadeUp, StaggerList, StaggerItem } from '@/app/_components/ui/motion'
import { ShipSearchForm } from '@/app/(app)/ship/_components/ShipSearchForm'
import { getT } from '@/lib/locale'

export default async function DashboardPage() {
  const { t } = await getT()
  const [[shipCount, totalDetentions, lastDate, recentShips], { certAlerts, highRiskShips, chronicShips }] =
    await Promise.all([
      Promise.all([getShipCount(), getTotalDetentionCount(), getLastInspectionDate(), getRecentShips(5)]),
      getDashboardAlerts(),
    ])

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <FadeUp>
        <h1 className="text-lg font-medium text-text mb-6">{t('nav.dashboard')}</h1>

        {/* Summary metrics */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <MetricCard label={t('dashboard.totalShips')} value={shipCount} variant="navy" />
          <MetricCard
            label={t('dashboard.totalDetentions')}
            value={totalDetentions}
            variant={totalDetentions > 0 ? 'danger' : 'success'}
          />
          <MetricCard label={t('dashboard.lastInspection')} value={lastDate ?? '—'} variant="navy" />
        </div>
      </FadeUp>

      {/* Attention required */}
      <FadeUp delay={0.06}>
        <SectionHeader
          step="!"
          title={t('dashboard.attention')}
          description={t('dashboard.attention.desc')}
        />
        <Card className="p-0 overflow-hidden mb-8">
          {/* Certs */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={13} className="text-warning-text shrink-0" />
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                {t('dashboard.attention.certs')}
              </span>
              {certAlerts.length > 0 && (
                <span className="ml-auto text-xs font-medium tabular-nums text-text-muted">
                  {certAlerts.length}
                </span>
              )}
            </div>
            {certAlerts.length === 0 ? (
              <p className="flex items-center gap-1.5 text-xs text-success-text">
                <CheckCircle2 size={12} />
                {t('dashboard.attention.clean')}
              </p>
            ) : (
              <div className="space-y-0.5">
                {certAlerts.map((cert: CertAlert) => (
                  <Link
                    key={`${cert.ship_id}-${cert.cert_type}-${cert.expiry_date}`}
                    href={`/ship/${encodeURIComponent(cert.ship_imo)}`}
                    className="flex items-center gap-3 py-2 -mx-1 px-1 rounded hover:bg-navy-700/5 transition-colors text-sm"
                  >
                    <span className="font-medium text-text flex-1 min-w-0 truncate">{cert.ship_name}</span>
                    <span className="text-text-muted text-xs flex-1 min-w-0 truncate hidden sm:block">{cert.cert_type}</span>
                    <span className="text-text-muted font-mono text-xs shrink-0">{cert.expiry_date}</span>
                    <RiskBadge level={cert.status === 'expired' ? 'danger' : 'warning'} className="shrink-0">
                      {cert.status === 'expired' ? t('cert.expired') : t('cert.expiring')}
                    </RiskBadge>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* High-risk ships */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert size={13} className="text-danger-text shrink-0" />
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                {t('dashboard.attention.highRisk')}
              </span>
              {highRiskShips.length > 0 && (
                <span className="ml-auto text-xs font-medium tabular-nums text-text-muted">
                  {highRiskShips.length}
                </span>
              )}
            </div>
            {highRiskShips.length === 0 ? (
              <p className="flex items-center gap-1.5 text-xs text-success-text">
                <CheckCircle2 size={12} />
                {t('dashboard.attention.clean')}
              </p>
            ) : (
              <div className="space-y-0.5">
                {highRiskShips.map((ship: HighRiskShipAlert) => (
                  <Link
                    key={ship.id}
                    href={`/ship/${encodeURIComponent(ship.imo)}`}
                    className="flex items-center gap-3 py-2 -mx-1 px-1 rounded hover:bg-navy-700/5 transition-colors text-sm"
                  >
                    <span className="font-medium text-text flex-1 min-w-0 truncate">{ship.name}</span>
                    <RiskBadge level="danger" className="shrink-0">{t('risk.high')}</RiskBadge>
                    <span className="text-text-muted text-xs shrink-0">
                      {t('dashboard.attention.detentions', { count: ship.detention_count })}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Chronic issues */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={13} className="text-warning-text shrink-0" />
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                {t('dashboard.attention.chronic')}
              </span>
              {chronicShips.length > 0 && (
                <span className="ml-auto text-xs font-medium tabular-nums text-text-muted">
                  {chronicShips.length}
                </span>
              )}
            </div>
            {chronicShips.length === 0 ? (
              <p className="flex items-center gap-1.5 text-xs text-success-text">
                <CheckCircle2 size={12} />
                {t('dashboard.attention.clean')}
              </p>
            ) : (
              <div className="space-y-0.5">
                {chronicShips.map((ship: ChronicShipAlert) => (
                  <Link
                    key={ship.id}
                    href={`/ship/${encodeURIComponent(ship.imo)}`}
                    className="flex items-center gap-3 py-2 -mx-1 px-1 rounded hover:bg-navy-700/5 transition-colors text-sm"
                  >
                    <span className="font-medium text-text flex-1 min-w-0 truncate">{ship.name}</span>
                    <span className="text-text-muted text-xs shrink-0">
                      {t('dashboard.attention.chronicCount', { count: ship.chronic_count })}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>
      </FadeUp>

      {/* Recent ships */}
      <FadeUp delay={0.14}>
        <SectionHeader
          step={1}
          title={t('dashboard.recentShips')}
          description={t('dashboard.recentShips.desc')}
        />
      </FadeUp>

      {recentShips.length === 0 ? (
        <FadeUp delay={0.18}>
          <div className="flex items-center gap-3 py-6 px-4 rounded-card border border-border bg-surface mb-8">
            <Ship size={24} className="text-border shrink-0" />
            <p className="text-sm text-text-muted">{t('ship.list.empty')}</p>
          </div>
        </FadeUp>
      ) : (
        <StaggerList className="space-y-2 mb-8">
          {recentShips.map((ship: ShipSummary) => (
            <StaggerItem key={ship.id}>
              <Link
                href={`/ship/${encodeURIComponent(ship.imo)}`}
                className="flex items-center gap-3 px-4 py-3 bg-surface border border-border rounded-card
                           hover:border-accent/40 hover:-translate-y-0.5 hover:shadow-md
                           transition-all duration-150 group"
              >
                <Ship size={15} className="text-text-muted shrink-0" />
                <span className="text-sm font-medium text-text flex-1 truncate group-hover:text-navy-700 transition-colors">
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
            </StaggerItem>
          ))}
        </StaggerList>
      )}

      {/* Add ship shortcut */}
      <FadeUp delay={0.16}>
        <SectionHeader
          step={2}
          title={t('dashboard.addShip')}
          description={t('dashboard.addShip.desc')}
        />
        <Card className="p-5">
          <ShipSearchForm />
        </Card>
      </FadeUp>
    </div>
  )
}
