import Link from 'next/link'
import { ChevronLeft, AlertTriangle, Square, Info } from 'lucide-react'
import { PortSelect } from '../_components/PortSelect'
import { FadeUp } from '@/app/_components/ui/motion'
import { getShipByImo, getInspectionsByShip, getDeficiencies } from '@/lib/ships'
import type { Inspection, Deficiency } from '@/lib/ships'
import { getPorts } from '@/lib/ports'
import { getBaselines, getBaselinesFallback } from '@/lib/baselines'
import { getCertificates } from '@/lib/certificates'
import type { CertWithStatus } from '@/lib/certificates'
import { getActiveCampaign } from '@/lib/cic'
import type { CicCampaign } from '@/lib/cic'
import { ShipHero } from '@/app/_components/ui/ShipHero'
import { MetricCard } from '@/app/_components/ui/MetricCard'
import { SectionHeader } from '@/app/_components/ui/SectionHeader'
import { Card } from '@/app/_components/ui/Card'
import { RiskBadge } from '@/app/_components/ui/RiskBadge'
import type { RiskLevel } from '@/app/_components/ui/RiskBadge'
import { computeRisk, isCriticalCert } from '@/lib/fleet'
import { cn } from '@/lib/utils'
import { getT } from '@/lib/locale'
import { TermChip } from '@/app/_components/ui/TermChip'
import { PdfDownloadButton } from '../_components/PdfDownloadButton'
import { PortLoadingProvider } from '../_components/PortLoadingContext'
import { PortSectionsWrapper } from '../_components/PortSectionsWrapper'

type InspectionRow = { inspection: Inspection; deficiencies: Deficiency[] }

type RedFlag = {
  displayText: string
  occurrences: number
  dates: string[]
}

type ChecklistItem = {
  label: string
  priority: 'high' | 'medium' | 'regional'
  tag: 'cic' | 'overlap' | 'baseline' | 'ship'
  subItems: string[]
}

function computeRedFlags(rows: InspectionRow[]): RedFlag[] {
  const map = new Map<string, { displayText: string; inspIds: Set<string>; dates: Set<string> }>()

  for (const { inspection, deficiencies } of rows) {
    for (const d of deficiencies) {
      const raw = d.deficiency_text?.trim() ?? d.category ?? null
      if (!raw) continue
      const key = raw.toLowerCase()
      if (!map.has(key)) {
        map.set(key, { displayText: raw, inspIds: new Set(), dates: new Set() })
      }
      const entry = map.get(key)!
      entry.inspIds.add(inspection.id)
      entry.dates.add(inspection.report_date)
    }
  }

  return [...map.entries()]
    .filter(([, v]) => v.inspIds.size >= 2)
    .map(([, v]) => ({
      displayText: v.displayText,
      occurrences: v.inspIds.size,
      dates: [...v.dates].sort().reverse(),
    }))
    .sort((a, b) => b.occurrences - a.occurrences)
}

export default async function ShipDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ imo: string }>
  searchParams: Promise<{ port?: string }>
}) {
  const { t } = await getT()
  const { imo } = await params
  const { port } = await searchParams

  const [ship, ports] = await Promise.all([getShipByImo(imo), getPorts()])

  if (!ship) {
    return (
      <div className="px-6 py-8 max-w-5xl mx-auto">
        <Link
          href="/ship"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text mb-6 transition-colors"
        >
          <ChevronLeft size={15} />
          {t('ship.backToList')}
        </Link>
        <p className="text-sm text-danger-text">{t('ship.notFound', { imo })}</p>
      </div>
    )
  }

  const inspections = await getInspectionsByShip(ship.id)
  const [rowsRaw, certificates, activeCampaign] = await Promise.all([
    Promise.all(
      inspections.map(async (inspection) => ({
        inspection,
        deficiencies: await getDeficiencies(inspection.id),
      })),
    ),
    getCertificates(ship.id),
    getActiveCampaign(),
  ])
  const rows: InspectionRow[] = rowsRaw

  const selectedPort = port ? ports.find((p) => p.id === port) ?? null : null
  const mouRegionId = selectedPort?.mou_region_id ?? null
  const selectedMouName = selectedPort?.mou_regions?.name ?? null

  let baselines = mouRegionId && ship.ship_type
    ? await getBaselines(mouRegionId, ship.ship_type)
    : []
  let baselineIsFallback = false
  if (mouRegionId && baselines.length === 0) {
    baselines = await getBaselinesFallback(mouRegionId)
    baselineIsFallback = baselines.length > 0
  }

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

  // Sub-items per category: most frequent specific deficiencies in each category
  const catSubItemsRaw = new Map<string, Map<string, { display: string; count: number }>>()
  for (const { deficiencies } of rows) {
    for (const d of deficiencies) {
      if (!d.category) continue
      const raw = d.deficiency_text?.trim() || d.sub_category?.trim() || null
      if (!raw || raw.toLowerCase() === d.category.toLowerCase()) continue
      const norm = raw.toLowerCase()
      const sub = catSubItemsRaw.get(d.category) ?? new Map<string, { display: string; count: number }>()
      const entry = sub.get(norm)
      if (entry) { entry.count++ } else {
        sub.set(norm, { display: raw, count: 1 })
      }
      catSubItemsRaw.set(d.category, sub)
    }
  }
  const catSubItems = new Map<string, string[]>(
    [...catSubItemsRaw.entries()].map(([cat, sub]) => [
      cat,
      [...sub.values()].sort((a, b) => b.count - a.count).map((v) => v.display),
    ]),
  )

  // Red flags: deficiencies recurring across 2+ inspections
  const redFlags = computeRedFlags(rows)

  // Checklist items (only relevant when port is selected)
  const checklistItems: ChecklistItem[] = []
  if (mouRegionId) {
    if (activeCampaign) {
      checklistItems.push({ label: activeCampaign.topic, priority: 'high', tag: 'cic', subItems: [] })
    }
    // HIGH: in both baseline AND ship history
    for (const cat of overlapping) {
      checklistItems.push({ label: cat, priority: 'high', tag: 'overlap', subItems: catSubItems.get(cat) ?? [] })
    }
    // MEDIUM: in ship history only (not in baseline)
    for (const [cat] of sortedShipCats
      .filter(([c]) => !baselineCatSet.has(c))
      .slice(0, 3)) {
      if (!checklistItems.some((i) => i.label === cat)) {
        checklistItems.push({ label: cat, priority: 'medium', tag: 'ship', subItems: catSubItems.get(cat) ?? [] })
      }
    }
    // REGIONAL: in baseline only (ship has no history — regional focus, check anyway)
    for (const b of baselines.filter((b) => !overlapping.has(b.category))) {
      checklistItems.push({ label: b.category, priority: 'regional', tag: 'baseline', subItems: [] })
    }
  }
  const priorityOrder: Record<ChecklistItem['priority'], number> = { high: 0, medium: 1, regional: 2 }
  const sortedChecklistItems = [...checklistItems].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
  )

  // Metrics
  const inspectionCount = rows.length
  const detentionCount = rows.filter((r) => r.inspection.detention).length
  const longestDetentionDays = rows.reduce<number | null>((max, r) => {
    if (!r.inspection.detention || r.inspection.duration_days == null) return max
    return max === null || r.inspection.duration_days > max ? r.inspection.duration_days : max
  }, null)
  const totalDeficiencies = rows.reduce((sum, r) => sum + (r.inspection.num_deficiencies ?? 0), 0)
  const expiredCerts = certificates.filter((c) => c.status === 'expired')
  const shipRisk = inspectionCount === 0 ? null : computeRisk({
    detentionCount,
    yearBuilt: ship.year_built,
    totalDeficiencies,
    expiredCertCount: expiredCerts.length,
    hasCriticalExpiredCert: expiredCerts.some((c) => isCriticalCert(c.cert_type)),
    expiringCertCount: certificates.filter((c) => c.status === 'expiring').length,
    redFlagCount: redFlags.length,
    nonIacsClass: ship.class_society != null && !ship.class_society.includes('(IACS)'),
  })
  const riskLevel: RiskLevel =
    shipRisk === 'high' ? 'danger' :
    shipRisk === 'medium' ? 'warning' :
    shipRisk === 'low' ? 'success' : 'neutral'
  const riskLabel =
    shipRisk === 'high' ? t('risk.high') :
    shipRisk === 'medium' ? t('risk.medium') :
    shipRisk === 'low' ? t('risk.low') : undefined

  const detentionVariant = detentionCount > 0 ? 'danger' : 'success'
  const detentionDaysVariant = longestDetentionDays !== null ? 'warning' : 'navy'

  // rows are sorted newest-first; oldest is last
  const earliestInspYear = rows.length > 0
    ? rows[rows.length - 1].inspection.report_date.slice(0, 4)
    : null
  const shownInspRows = rows.slice(0, 10)

  // Dynamic step numbering
  let _step = 0
  const analysisStep = mouRegionId ? ++_step : null
  const redFlagStep = redFlags.length > 0 ? ++_step : null
  const certStep = certificates.length > 0 ? ++_step : null
  const checklistStep = mouRegionId && sortedChecklistItems.length > 0 ? ++_step : null
  const inspStep = ++_step

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      {/* Back link + PDF download */}
      <div className="flex items-center justify-between mb-5">
        <Link
          href="/ship"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors"
        >
          <ChevronLeft size={15} />
          {t('ship.backToList')}
        </Link>
        <PdfDownloadButton imo={imo} port={port} />
      </div>

      <FadeUp>
      <div className="space-y-6">
        {/* Hero */}
        <ShipHero
          ship={ship}
          riskLevel={riskLevel}
          riskLabel={riskLabel}
          selectedRegionName={selectedMouName ?? undefined}
        />

        {/* Low-inspection note */}
        {inspectionCount < 3 && (
          <div className="flex items-start gap-2.5 rounded-lg bg-accent/8 border border-accent/20 px-4 py-3">
            <Info size={15} className="text-accent shrink-0 mt-0.5" />
            <p className="text-sm text-accent/80">{t('note.fewInspections')}</p>
          </div>
        )}

        {/* CIC Banner */}
        {activeCampaign && (
          <div className="flex items-start gap-3 rounded-lg bg-danger-bg border border-danger-text/20 px-4 py-3">
            <AlertTriangle size={15} className="text-danger-text shrink-0 mt-0.5" />
            <p className="text-sm text-danger-text font-medium">
              {t('cic.banner', { topic: activeCampaign.topic })}
            </p>
          </div>
        )}

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
            sub={inspectionCount > 0 ? t('metric.detentionSub', { total: inspectionCount }) : undefined}
            variant={detentionVariant}
          />
          <MetricCard
            label={t('metric.longestDetention')}
            value={longestDetentionDays ?? '—'}
            sub={longestDetentionDays !== null ? t('metric.longestDetentionUnit') : undefined}
            variant={detentionDaysVariant}
          />
          <MetricCard
            label={t('metric.targetRegion')}
            value={selectedMouName ?? '—'}
            variant="navy"
          />
        </div>

        {/* Port selector + port-dependent sections */}
        <PortLoadingProvider>
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-text">{t('port.label')}:</span>
            <PortSelect ports={ports} imo={imo} currentPort={port ?? ''} />
          </div>
          {selectedPort && (
            <p className="text-xs text-text-muted pl-0.5">
              {selectedPort.name}
              {selectedPort.country ? ` · ${selectedPort.country}` : ''}
              {selectedMouName ? ` · ${selectedMouName}` : ''}
            </p>
          )}
        </div>

        {/* Gap analysis */}
        {analysisStep && (
          <PortSectionsWrapper><div>
            <SectionHeader
              step={analysisStep}
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
                  <Card className="p-4">
                    <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                      {t('analysis.regionProfile')}
                      <span className="ml-2 normal-case font-normal">
                        {baselineIsFallback
                          ? t('analysis.baselineFallback')
                          : (selectedMouName ?? '')}
                      </span>
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
                        {sortedShipCats.slice(0, 8).map(([category, count]) => {
                          const isOverlap = overlapping.has(category)
                          const subItems = catSubItems.get(category) ?? []
                          return (
                            <li key={category} className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <span
                                  className={cn(
                                    'rounded-full px-3 py-0.5 text-xs font-medium',
                                    isOverlap
                                      ? 'bg-danger-bg text-danger-text'
                                      : 'bg-warning-bg text-warning-text',
                                  )}
                                >
                                  {category}
                                </span>
                                {subItems.length > 0 && (
                                  <p className="text-[10px] text-text-muted mt-1 pl-1 leading-snug break-words">
                                    {subItems.join(', ')}
                                  </p>
                                )}
                              </div>
                              <span
                                className={cn(
                                  'text-xs tabular-nums shrink-0 font-medium pt-0.5',
                                  isOverlap ? 'text-danger-text' : 'text-warning-text',
                                )}
                              >
                                {count}×
                              </span>
                            </li>
                          )
                        })}
                        {sortedShipCats.length > 8 && (
                          <li className="text-xs text-text-muted pl-3 pt-0.5">
                            {t('analysis.moreCategories', { count: sortedShipCats.length - 8 })}
                          </li>
                        )}
                      </ol>
                    )}
                  </Card>
                </div>
              </>
            )}
          </div></PortSectionsWrapper>
        )}

        {/* Red Flags */}
        {redFlagStep && (
          <div>
            <SectionHeader
              step={redFlagStep}
              title={t('section.redflags.title')}
              description={t('section.redflags.desc')}
            />
            <div className="space-y-2">
              {redFlags.map((flag, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-md bg-danger-bg/40 border-l-2 border-danger-text/60 px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text">
                      <TermChip>{flag.displayText}</TermChip>
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs text-danger-text font-medium">
                        {t('redflag.occurrences', { count: flag.occurrences })}
                      </span>
                      {flag.dates.slice(0, 4).map((d) => (
                        <span
                          key={d}
                          className="text-[11px] text-text-muted bg-border/80 rounded px-1.5 py-0.5 tabular-nums"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certificates */}
        {certStep && (
          <div>
            <SectionHeader
              step={certStep}
              title={t('section.certificates.title')}
              description={t('section.certificates.desc')}
            />
            <Card className="overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-page-bg border-b border-border">
                    <th className="text-left text-xs text-text-muted font-medium px-4 py-2.5">
                      {t('cert.col.name')}
                    </th>
                    <th className="text-left text-xs text-text-muted font-medium px-4 py-2.5">
                      {t('cert.col.issuer')}
                    </th>
                    <th className="text-left text-xs text-text-muted font-medium px-4 py-2.5">
                      {t('cert.col.expiry')}
                    </th>
                    <th className="text-left text-xs text-text-muted font-medium px-4 py-2.5">
                      {t('cert.col.status')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {certificates.map((cert: CertWithStatus) => (
                    <tr key={cert.id} className="hover:bg-page-bg/50 transition-colors">
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-text">
                          <TermChip>{cert.cert_type}</TermChip>
                        </span>
                        {cert.is_interim && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-warning-bg text-warning-text font-semibold">
                            {t('cert.interim')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-text-muted">{cert.issuer ?? '—'}</td>
                      <td className="px-4 py-2.5 text-text-muted tabular-nums">
                        {cert.expiry_date ?? '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <RiskBadge
                          level={
                            cert.status === 'expired' ? 'danger' :
                            cert.status === 'expiring' ? 'warning' : 'success'
                          }
                        >
                          {cert.status === 'expired'
                            ? t('cert.expired')
                            : cert.status === 'expiring'
                            ? t('cert.expiring')
                            : t('cert.valid')}
                        </RiskBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* Pre-arrival Checklist */}
        {checklistStep && (
          <PortSectionsWrapper><div>
            <SectionHeader
              step={checklistStep}
              title={t('section.checklist.title')}
              description={t('section.checklist.desc')}
            />
            <div className="space-y-2">
              {sortedChecklistItems.map((item, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-md overflow-hidden',
                    item.priority === 'high'
                      ? 'bg-danger-bg/40'
                      : item.priority === 'medium'
                      ? 'bg-warning-bg/30'
                      : 'bg-page-bg',
                  )}
                >
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <Square
                      size={14}
                      className={cn(
                        'shrink-0',
                        item.priority === 'high'
                          ? 'text-danger-text'
                          : item.priority === 'medium'
                          ? 'text-warning-text'
                          : 'text-accent/40',
                      )}
                    />
                    <span
                      className={cn(
                        'flex-1 text-sm font-medium',
                        item.priority === 'high'
                          ? 'text-danger-text'
                          : item.priority === 'medium'
                          ? 'text-warning-text'
                          : 'text-text-muted',
                      )}
                    >
                      <TermChip>{item.label}</TermChip>
                    </span>
                    {item.tag === 'cic' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning-bg text-warning-text font-semibold">
                        CIC
                      </span>
                    )}
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded font-semibold leading-none',
                        item.priority === 'high'
                          ? 'bg-danger-text/15 text-danger-text'
                          : item.priority === 'medium'
                          ? 'bg-warning-text/15 text-warning-text'
                          : 'bg-accent/10 text-accent',
                      )}
                    >
                      {t(
                        item.priority === 'high'
                          ? 'checklist.priority.high'
                          : item.priority === 'medium'
                          ? 'checklist.priority.medium'
                          : 'checklist.priority.regional',
                      )}
                    </span>
                  </div>
                  {item.subItems.length > 0 && (
                    <div className="px-4 pb-3 space-y-1.5 pl-11">
                      {item.subItems.map((si, j) => (
                        <div key={j} className="flex items-start gap-2">
                          <Square
                            size={11}
                            className={cn(
                              'shrink-0 mt-0.5',
                              item.priority === 'high'
                                ? 'text-danger-text/70'
                                : item.priority === 'medium'
                                ? 'text-warning-text/70'
                                : 'text-accent/30',
                            )}
                          />
                          <span className="text-xs text-text leading-snug">{si}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div></PortSectionsWrapper>
        )}

        {/* Inspections */}
        <div>
          <SectionHeader
            step={inspStep}
            title={t('section.inspections.title')}
            description={t('section.inspections.desc')}
          />

          {rows.length === 0 ? (
            <p className="text-sm text-text-muted">{t('inspection.noRecord')}</p>
          ) : (
            <div className="space-y-3">
              {rows.length > 10 && (
                <p className="text-xs text-text-muted bg-border/40 rounded-md px-3 py-2">
                  Toplam <span className="font-medium text-text">{rows.length} denetim</span>
                  {earliestInspYear ? ` · en eskisi ${earliestInspYear}` : ''}
                  {' · '}Son {shownInspRows.length} denetim gösteriliyor (en yeni üstte)
                </p>
              )}
              {shownInspRows.map(({ inspection, deficiencies }) => (
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
        </PortLoadingProvider>

      </div>
      </FadeUp>
    </div>
  )
}
