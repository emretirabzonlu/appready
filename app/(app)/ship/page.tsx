import { Suspense } from 'react'
import { ShipSearchForm } from './_components/ShipSearchForm'
import { RegionSelect } from './_components/RegionSelect'
import { getShipByImo, getInspectionsByShip, getDeficiencies } from '@/lib/ships'
import type { Inspection, Deficiency } from '@/lib/ships'
import { getMouRegions } from '@/lib/mou'
import { getBaselines } from '@/lib/baselines'
import { ShipHero } from '@/app/_components/ui/ShipHero'
import { MetricCard } from '@/app/_components/ui/MetricCard'
import { SectionHeader } from '@/app/_components/ui/SectionHeader'
import { Card } from '@/app/_components/ui/Card'
import { RiskBadge } from '@/app/_components/ui/RiskBadge'
import type { RiskLevel } from '@/app/_components/ui/RiskBadge'
import { cn } from '@/lib/utils'
import { t } from '@/lib/i18n'

type InspectionRow = { inspection: Inspection; deficiencies: Deficiency[] }

export default async function ShipPage({
  searchParams,
}: {
  searchParams: Promise<{ imo?: string; mou?: string }>
}) {
  const { imo, mou } = await searchParams

  const regions = await getMouRegions()

  let ship = null
  let rows: InspectionRow[] = []

  if (imo) {
    ship = await getShipByImo(imo)
    if (ship) {
      const inspections = await getInspectionsByShip(ship.id)
      rows = await Promise.all(
        inspections.map(async (inspection) => ({
          inspection,
          deficiencies: await getDeficiencies(inspection.id),
        })),
      )
    }
  }

  const baselines = mou && ship?.ship_type
    ? await getBaselines(mou, ship.ship_type)
    : []

  // Category counts across all inspections
  const catCounts = new Map<string, number>()
  for (const { deficiencies } of rows) {
    for (const d of deficiencies) {
      if (d.category) catCounts.set(d.category, (catCounts.get(d.category) ?? 0) + 1)
    }
  }
  const sortedShipCats = [...catCounts.entries()].sort(([, a], [, b]) => b - a)
  const baselineCatSet = new Set(baselines.map((b) => b.category))
  const overlapping = new Set([...baselineCatSet].filter((c) => catCounts.has(c)))

  // Metrics
  const inspectionCount = rows.length
  const detentionCount = rows.filter((r) => r.inspection.detention).length
  let longestGapDays = 0
  if (rows.length >= 2) {
    const sorted = rows
      .map((r) => new Date(r.inspection.report_date).getTime())
      .sort((a, b) => a - b)
    for (let i = 1; i < sorted.length; i++) {
      const gap = Math.floor((sorted[i] - sorted[i - 1]) / 86_400_000)
      if (gap > longestGapDays) longestGapDays = gap
    }
  }
  const selectedRegionName = regions.find((r) => r.id === mou)?.name

  // Risk level for ShipHero badge
  const riskLevel: RiskLevel =
    inspectionCount === 0 ? 'neutral' :
    detentionCount >= 2 ? 'danger' :
    detentionCount === 1 ? 'warning' : 'success'
  const riskLabel =
    inspectionCount === 0 ? undefined :
    detentionCount >= 2 ? t('risk.high') :
    detentionCount === 1 ? t('risk.medium') :
    t('risk.low')

  // MetricCard variants
  const detentionVariant = detentionCount > 0 ? 'danger' : 'success'
  const gapVariant = longestGapDays > 180 ? 'warning' : 'navy'

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <h1 className="text-lg font-medium text-text mb-5">{t('ship.title')}</h1>

      <Suspense>
        <ShipSearchForm />
      </Suspense>

      {imo && !ship && (
        <p className="text-sm text-danger-text mt-1">
          {t('ship.notFound', { imo })}
        </p>
      )}

      {ship && imo && (
        <div className="space-y-6">
          {/* Hero */}
          <ShipHero
            ship={ship}
            riskLevel={riskLevel}
            riskLabel={riskLabel}
            selectedRegionName={selectedRegionName}
          />

          {/* Metrics */}
          <div className="grid grid-cols-4 gap-3">
            <MetricCard
              label={t('metric.inspections')}
              value={inspectionCount}
              variant="navy"
            />
            <MetricCard
              label={t('metric.detentions')}
              value={detentionCount}
              sub={inspectionCount > 0 ? `${Math.round((detentionCount / inspectionCount) * 100)}%` : undefined}
              variant={detentionVariant}
            />
            <MetricCard
              label={t('metric.longestGap')}
              value={longestGapDays > 0 ? longestGapDays : '—'}
              sub={longestGapDays > 0 ? t('metric.longestGapUnit') : undefined}
              variant={gapVariant}
            />
            <MetricCard
              label={t('metric.targetRegion')}
              value={selectedRegionName ?? '—'}
              variant="navy"
            />
          </div>

          {/* Region selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-text">{t('analysis.targetRegion')}:</span>
            <RegionSelect regions={regions} imo={imo} currentMou={mou ?? ''} />
          </div>

          {/* Gap analysis */}
          {mou && (
            <div>
              <SectionHeader
                step={1}
                title={t('section.analysis.title')}
                description={t('section.analysis.desc')}
              />

              {!ship.ship_type ? (
                <p className="text-sm text-text-muted">{t('analysis.noShipType')}</p>
              ) : (
                <>
                  {overlapping.size > 0 && (
                    <div className="mb-4 flex items-center gap-2">
                      <RiskBadge level="danger">{overlapping.size} risk</RiskBadge>
                      <p className="text-sm text-danger-text">
                        {t('analysis.riskAlert', { count: overlapping.size })}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {/* Left: region baseline */}
                    <Card className="p-4">
                      <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                        {t('analysis.regionProfile')}
                        {selectedRegionName && (
                          <span className="ml-2 normal-case font-normal">{selectedRegionName}</span>
                        )}
                      </h4>
                      {baselines.length === 0 ? (
                        <p className="text-xs text-text-muted">{t('analysis.noBaseline')}</p>
                      ) : (
                        <ol className="space-y-1.5">
                          {baselines.map((b) => {
                            const isOverlap = overlapping.has(b.category)
                            return (
                              <li key={b.id} className="flex items-center gap-2">
                                <span className="text-xs text-text-muted w-4 shrink-0 tabular-nums text-right">
                                  {b.rank}
                                </span>
                                <span
                                  className={cn(
                                    'rounded-full px-3 py-0.5 text-xs flex-1 truncate',
                                    isOverlap
                                      ? 'bg-danger-bg text-danger-text font-medium'
                                      : 'bg-border text-text-muted',
                                  )}
                                >
                                  {b.category}
                                </span>
                                {b.pct != null && (
                                  <span className="text-xs text-text-muted tabular-nums shrink-0">
                                    {Number(b.pct).toFixed(1)}%
                                  </span>
                                )}
                              </li>
                            )
                          })}
                        </ol>
                      )}
                    </Card>

                    {/* Right: ship weaknesses */}
                    <Card className="p-4">
                      <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                        {t('analysis.shipWeaknesses')}
                        <span className="ml-2 normal-case font-normal">
                          {t('analysis.allInspections')}
                        </span>
                      </h4>
                      {sortedShipCats.length === 0 ? (
                        <p className="text-xs text-text-muted">{t('analysis.noDeficiencies')}</p>
                      ) : (
                        <ol className="space-y-1.5">
                          {sortedShipCats.map(([category, count]) => {
                            const isOverlap = overlapping.has(category)
                            return (
                              <li key={category} className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    'rounded-full px-3 py-0.5 text-xs flex-1 truncate',
                                    isOverlap
                                      ? 'bg-danger-bg text-danger-text font-medium'
                                      : 'bg-warning-bg text-warning-text',
                                  )}
                                >
                                  {category}
                                </span>
                                <span
                                  className={cn(
                                    'text-xs tabular-nums shrink-0 font-medium',
                                    isOverlap ? 'text-danger-text' : 'text-warning-text',
                                  )}
                                >
                                  {count}×
                                </span>
                              </li>
                            )
                          })}
                        </ol>
                      )}
                    </Card>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Inspections */}
          <div>
            <SectionHeader
              step={2}
              title={t('section.inspections.title')}
              description={t('section.inspections.desc')}
            />

            {rows.length === 0 ? (
              <p className="text-sm text-text-muted">{t('inspection.noRecord')}</p>
            ) : (
              <div className="space-y-3">
                {rows.map(({ inspection, deficiencies }) => (
                  <Card key={inspection.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-text">
                          {inspection.report_date}
                        </span>
                        {inspection.inspection_type && (
                          <span className="text-xs text-text-muted">
                            {inspection.inspection_type}
                          </span>
                        )}
                      </div>
                      {inspection.detention && (
                        <RiskBadge level="danger">{t('inspection.detention')}</RiskBadge>
                      )}
                    </div>

                    <dl className="grid grid-cols-3 gap-x-6 gap-y-1 text-sm mb-3">
                      <dt className="text-text-muted">{t('inspection.authority')}</dt>
                      <dd className="text-text col-span-2">{inspection.authority ?? '—'}</dd>
                      <dt className="text-text-muted">{t('inspection.region')}</dt>
                      <dd className="text-text col-span-2">{inspection.mou_regions?.name ?? '—'}</dd>
                      <dt className="text-text-muted">{t('inspection.deficiencies')}</dt>
                      <dd className="text-text col-span-2">
                        {inspection.num_deficiencies ?? deficiencies.length}
                      </dd>
                    </dl>

                    {deficiencies.length > 0 && (
                      <ul className="border-t border-border pt-3 space-y-1.5">
                        {deficiencies.map((d) => (
                          <li key={d.id} className="rounded-sm bg-page-bg px-3 py-2 text-sm">
                            <div className="flex items-center gap-2 mb-0.5">
                              {d.code && (
                                <span className="font-mono text-xs text-accent">{d.code}</span>
                              )}
                              {d.category && (
                                <span className="text-xs text-text-muted">{d.category}</span>
                              )}
                              {d.sub_category && (
                                <span className="text-xs text-text-muted">/ {d.sub_category}</span>
                              )}
                            </div>
                            {d.deficiency_text && <p className="text-text">{d.deficiency_text}</p>}
                            {d.defect_text && (
                              <p className="mt-0.5 text-xs text-text-muted">{d.defect_text}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
