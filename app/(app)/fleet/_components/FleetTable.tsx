'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronUp, ChevronDown, ChevronsUpDown, Ship } from 'lucide-react'
import type { ShipWithStats, RiskLevel } from '@/lib/fleet'
import { RiskBadge } from '@/app/_components/ui/RiskBadge'
import type { RiskLevel as BadgeLevel } from '@/app/_components/ui/RiskBadge'
import { cn } from '@/lib/utils'
import { useT } from '@/app/_components/LocaleProvider'

type Col = 'name' | 'imo' | 'ship_type' | 'flag' | 'risk' | 'inspection_count' | 'detention_count' | 'last_inspection_date'

const riskOrder: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 }
const riskToLevel: Record<RiskLevel, BadgeLevel> = { high: 'danger', medium: 'warning', low: 'success' }

function compareRows(a: ShipWithStats, b: ShipWithStats, col: Col, asc: boolean): number {
  let diff = 0
  if (col === 'risk') {
    diff = riskOrder[a.risk] - riskOrder[b.risk]
  } else if (col === 'name' || col === 'imo' || col === 'ship_type' || col === 'flag' || col === 'last_inspection_date') {
    diff = (a[col] ?? '').localeCompare(b[col] ?? '')
  } else {
    diff = (a[col] as number) - (b[col] as number)
  }
  return asc ? diff : -diff
}

function SortIcon({ active, asc }: { active: boolean; asc: boolean }) {
  if (!active) return <ChevronsUpDown size={13} className="text-text-muted/50 shrink-0" />
  return asc
    ? <ChevronUp size={13} className="text-accent shrink-0" />
    : <ChevronDown size={13} className="text-accent shrink-0" />
}

type Props = { ships: ShipWithStats[] }

export function FleetTable({ ships }: Props) {
  const router = useRouter()
  const t = useT()
  const [sortCol, setSortCol] = useState<Col>('risk')
  const [sortAsc, setSortAsc] = useState(true)

  function handleSort(col: Col) {
    if (sortCol === col) setSortAsc((v) => !v)
    else { setSortCol(col); setSortAsc(true) }
  }

  const sorted = [...ships].sort((a, b) => compareRows(a, b, sortCol, sortAsc))

  const headers: { col: Col; label: string }[] = [
    { col: 'name',               label: t('fleet.col.name') },
    { col: 'imo',                label: t('fleet.col.imo') },
    { col: 'ship_type',          label: t('fleet.col.type') },
    { col: 'flag',               label: t('fleet.col.flag') },
    { col: 'risk',               label: t('fleet.col.risk') },
    { col: 'inspection_count',   label: t('fleet.col.inspections') },
    { col: 'detention_count',    label: t('fleet.col.detentions') },
    { col: 'last_inspection_date', label: t('fleet.col.lastInspection') },
  ]

  if (ships.length === 0) {
    return (
      <div className="flex items-center gap-3 py-10 px-5 rounded-card border border-border bg-surface">
        <Ship size={24} className="text-border shrink-0" />
        <p className="text-sm text-text-muted">{t('fleet.empty')}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-surface border-b border-border">
            {headers.map(({ col, label }) => (
              <th
                key={col}
                onClick={() => handleSort(col)}
                className="cursor-pointer px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted
                           select-none hover:text-text transition-colors whitespace-nowrap"
              >
                <span className="inline-flex items-center gap-1">
                  {label}
                  <SortIcon active={sortCol === col} asc={sortAsc} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((ship) => (
            <tr
              key={ship.id}
              onClick={() => router.push(`/ship/${encodeURIComponent(ship.imo)}`)}
              className={cn(
                'border-b border-border last:border-0 cursor-pointer transition-colors group',
                'hover:bg-surface',
                ship.risk === 'high'
                  ? 'bg-danger-bg/30 hover:bg-danger-bg/50'
                  : 'bg-transparent',
              )}
            >
              <td className="relative px-4 py-3 font-medium text-text group-hover:text-navy-700 transition-colors whitespace-nowrap">
                {ship.risk === 'high' && (
                  <span className="absolute inset-y-0 left-0 w-0.75 bg-danger-text rounded-l-sm" />
                )}
                {ship.name}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-text-muted whitespace-nowrap">{ship.imo}</td>
              <td className="px-4 py-3 text-text-muted whitespace-nowrap">{ship.ship_type ?? '—'}</td>
              <td className="px-4 py-3 text-text-muted whitespace-nowrap">{ship.flag ?? '—'}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                <RiskBadge level={riskToLevel[ship.risk]}>
                  {ship.risk === 'high' ? t('risk.high') : ship.risk === 'medium' ? t('risk.medium') : t('risk.low')}
                </RiskBadge>
              </td>
              <td className="px-4 py-3 tabular-nums text-text-muted text-center">{ship.inspection_count}</td>
              <td className={cn('px-4 py-3 tabular-nums text-center font-medium', ship.detention_count > 0 ? 'text-danger-text' : 'text-text-muted')}>
                {ship.detention_count}
              </td>
              <td className="px-4 py-3 text-text-muted whitespace-nowrap">{ship.last_inspection_date ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
