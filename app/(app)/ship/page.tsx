import Link from 'next/link'
import { Ship } from 'lucide-react'
import { getAllShips } from '@/lib/ships'
import { ShipSearchForm } from './_components/ShipSearchForm'
import { RiskBadge } from '@/app/_components/ui/RiskBadge'
import { t } from '@/lib/i18n'

export default async function ShipListPage() {
  const ships = await getAllShips()

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <h1 className="text-lg font-medium text-text mb-5">{t('nav.ships')}</h1>

      <ShipSearchForm className="mb-6" />

      {ships.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Ship size={48} className="text-border mb-4" />
          <p className="text-sm text-text-muted">{t('ship.list.empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ships.map((ship) => (
            <Link
              key={ship.id}
              href={`/ship/${encodeURIComponent(ship.imo)}`}
              className="block bg-surface border border-border rounded-card p-4 hover:border-accent/40 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text truncate group-hover:text-navy-700 transition-colors">
                    {ship.name}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5 font-mono">{ship.imo}</p>
                </div>
                {ship.ship_type && (
                  <RiskBadge level="neutral" className="shrink-0 text-[10px]">
                    {ship.ship_type}
                  </RiskBadge>
                )}
              </div>
              {ship.flag && (
                <p className="text-xs text-text-muted mt-2">{ship.flag}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
