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

export type CertAlert = {
  ship_id: string
  ship_name: string
  ship_imo: string
  cert_type: string
  expiry_date: string
  status: 'expired' | 'expiring'
}

export type HighRiskShipAlert = {
  id: string
  name: string
  imo: string
  detention_count: number
}

export type ChronicShipAlert = {
  id: string
  name: string
  imo: string
  chronic_count: number
}

export type DashboardAlerts = {
  certAlerts: CertAlert[]
  highRiskShips: HighRiskShipAlert[]
  chronicShips: ChronicShipAlert[]
}

type RawShipForAlerts = { id: string; name: string; imo: string; year_built: number | null }
type RawInspForAlerts = { id: string; ship_id: string; detention: boolean | null; num_deficiencies: number | null }
type RawCert = { ship_id: string; cert_type: string; expiry_date: string }
type RawDef = { inspection_id: string; category: string }

const EMPTY_ALERTS: DashboardAlerts = { certAlerts: [], highRiskShips: [], chronicShips: [] }

export async function getDashboardAlerts(): Promise<DashboardAlerts> {
  try {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const in90 = new Date(today)
    in90.setDate(in90.getDate() + 90)
    const in90Str = in90.toISOString().split('T')[0]

    const [shipsRes, inspRes, certsRes, defRes] = await Promise.all([
      supabase.from('ships').select('id, name, imo, year_built'),
      supabase.from('psc_inspections').select('id, ship_id, detention, num_deficiencies'),
      supabase
        .from('certificates')
        .select('ship_id, cert_type, expiry_date')
        .not('expiry_date', 'is', null)
        .lte('expiry_date', in90Str),
      supabase
        .from('deficiencies')
        .select('inspection_id, category')
        .eq('is_detainable', true),
    ])

    const ships = (shipsRes.data ?? []) as RawShipForAlerts[]
    const inspections = (inspRes.data ?? []) as RawInspForAlerts[]
    const certs = (certsRes.data ?? []) as RawCert[]
    const defs = (defRes.data ?? []) as RawDef[]

    const shipById = new Map(ships.map((s) => [s.id, s]))

    // --- High-risk ships ---
    const shipStats = new Map<string, { detentions: number; deficiencies: number }>()
    for (const insp of inspections) {
      let s = shipStats.get(insp.ship_id)
      if (!s) { s = { detentions: 0, deficiencies: 0 }; shipStats.set(insp.ship_id, s) }
      if (insp.detention) s.detentions++
      s.deficiencies += insp.num_deficiencies ?? 0
    }
    const highRiskShips: HighRiskShipAlert[] = ships
      .flatMap((ship) => {
        const stats = shipStats.get(ship.id) ?? { detentions: 0, deficiencies: 0 }
        if (deriveRisk(stats.detentions, ship.year_built, stats.deficiencies) !== 'high') return []
        return [{ id: ship.id, name: ship.name, imo: ship.imo, detention_count: stats.detentions }]
      })

    // --- Cert alerts ---
    const certAlerts: CertAlert[] = certs
      .flatMap((cert) => {
        const ship = shipById.get(cert.ship_id)
        if (!ship) return []
        return [{
          ship_id: cert.ship_id,
          ship_name: ship.name,
          ship_imo: ship.imo,
          cert_type: cert.cert_type,
          expiry_date: cert.expiry_date,
          status: cert.expiry_date < todayStr ? 'expired' as const : 'expiring' as const,
        }]
      })
      .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date))

    // --- Chronic ships (same is_detainable category recurring in 2+ inspections) ---
    const inspShipMap = new Map(inspections.map((i) => [i.id, i.ship_id]))
    const chronicMap = new Map<string, Set<string>>()
    for (const def of defs) {
      const shipId = inspShipMap.get(def.inspection_id)
      if (!shipId) continue
      const key = `${shipId}|${def.category}`
      let set = chronicMap.get(key)
      if (!set) { set = new Set(); chronicMap.set(key, set) }
      set.add(def.inspection_id)
    }
    const chronicByShipId = new Map<string, number>()
    for (const [key, inspSet] of chronicMap) {
      if (inspSet.size >= 2) {
        const shipId = key.split('|')[0]
        chronicByShipId.set(shipId, (chronicByShipId.get(shipId) ?? 0) + 1)
      }
    }
    const chronicShips: ChronicShipAlert[] = Array.from(chronicByShipId.entries())
      .flatMap(([shipId, count]) => {
        const ship = shipById.get(shipId)
        return ship ? [{ id: ship.id, name: ship.name, imo: ship.imo, chronic_count: count }] : []
      })
      .sort((a, b) => b.chronic_count - a.chronic_count)

    return { certAlerts, highRiskShips, chronicShips }
  } catch {
    return EMPTY_ALERTS
  }
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
