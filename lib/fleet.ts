import { supabase } from '@/lib/db'

export type RiskLevel = 'high' | 'medium' | 'low'

export type ShipWithStats = {
  id: string
  name: string
  imo: string
  ship_type: string | null
  flag: string | null
  year_built: number | null
  inspection_count: number
  detention_count: number
  last_inspection_date: string | null
  total_deficiencies: number
  risk: RiskLevel
}

type RawInspection = {
  ship_id: string
  detention: boolean | null
  report_date: string
  num_deficiencies: number | null
}

function deriveRisk(
  detentions: number,
  yearBuilt: number | null,
  totalDeficiencies: number,
): RiskLevel {
  const age = yearBuilt ? new Date().getFullYear() - yearBuilt : null
  if (detentions > 0 || (age !== null && age > 20)) return 'high'
  if (detentions === 0 && totalDeficiencies < 3) return 'low'
  return 'medium'
}

export async function getFleetOverview(): Promise<ShipWithStats[]> {
  const [shipsResult, inspResult] = await Promise.all([
    supabase
      .from('ships')
      .select('id, name, imo, ship_type, flag, year_built')
      .order('name', { ascending: true }),
    supabase
      .from('psc_inspections')
      .select('ship_id, detention, report_date, num_deficiencies'),
  ])

  const ships = shipsResult.data ?? []
  const inspections = (inspResult.data ?? []) as RawInspection[]

  // Group inspections by ship_id — O(n) single pass
  const byShip = new Map<string, RawInspection[]>()
  for (const insp of inspections) {
    let arr = byShip.get(insp.ship_id)
    if (!arr) { arr = []; byShip.set(insp.ship_id, arr) }
    arr.push(insp)
  }

  return ships.map((ship) => {
    const shipInsps = byShip.get(ship.id) ?? []
    const inspection_count = shipInsps.length
    const detention_count = shipInsps.filter((i) => i.detention).length
    const last_inspection_date = shipInsps.reduce<string | null>((latest, i) => {
      if (!latest || i.report_date > latest) return i.report_date
      return latest
    }, null)
    const total_deficiencies = shipInsps.reduce((sum, i) => sum + (i.num_deficiencies ?? 0), 0)
    const risk = deriveRisk(detention_count, ship.year_built, total_deficiencies)

    return {
      id: ship.id,
      name: ship.name,
      imo: ship.imo,
      ship_type: ship.ship_type,
      flag: ship.flag,
      year_built: ship.year_built,
      inspection_count,
      detention_count,
      last_inspection_date,
      total_deficiencies,
      risk,
    }
  })
}
