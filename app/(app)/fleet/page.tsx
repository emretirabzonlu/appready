import { getFleetOverview } from '@/lib/fleet'
import { MetricCard } from '@/app/_components/ui/MetricCard'
import { SectionHeader } from '@/app/_components/ui/SectionHeader'
import { FadeUp } from '@/app/_components/ui/motion'
import { FleetTable } from './_components/FleetTable'
import { getT } from '@/lib/locale'

export default async function FleetPage() {
  const { t } = await getT()
  const ships = await getFleetOverview()

  const since12m = new Date()
  since12m.setFullYear(since12m.getFullYear() - 1)
  const since12mStr = since12m.toISOString().split('T')[0]

  const totalShips = ships.length
  const highRiskCount = ships.filter((s) => s.risk === 'high').length
  const totalDetentions = ships.reduce((sum, s) => sum + s.detention_count, 0)
  const recentlyInspected = ships.filter(
    (s) => s.last_inspection_date !== null && s.last_inspection_date >= since12mStr,
  ).length

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <FadeUp>
        <div className="mb-6">
          <h1 className="text-lg font-medium text-text">{t('fleet.title')}</h1>
          <p className="text-sm text-text-muted mt-0.5">{t('fleet.subtitle')}</p>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-8">
          <MetricCard label={t('fleet.totalShips')} value={totalShips} variant="navy" />
          <MetricCard
            label={t('fleet.highRisk')}
            value={highRiskCount}
            sub={totalShips > 0 ? `${Math.round((highRiskCount / totalShips) * 100)}%` : undefined}
            variant={highRiskCount > 0 ? 'danger' : 'success'}
          />
          <MetricCard
            label={t('fleet.totalDetentions')}
            value={totalDetentions}
            variant={totalDetentions > 0 ? 'danger' : 'success'}
          />
          <MetricCard
            label={t('fleet.recentlyInspected')}
            value={recentlyInspected}
            variant="navy"
          />
        </div>
      </FadeUp>

      <FadeUp delay={0.08}>
        <SectionHeader
          step={1}
          title={t('fleet.table.title')}
          description={t('fleet.table.desc')}
          className="mb-4"
        />
        <FleetTable ships={ships} />
      </FadeUp>
    </div>
  )
}
