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
  id: string
  ship_id: string
  detention: boolean | null
  report_date: string
  num_deficiencies: number | null
}

type RawCert = { ship_id: string; cert_type: string; expiry_date: string }
type RawDef = { inspection_id: string; category: string }

const CRITICAL_CERT_KEYWORDS = ['SMC', 'DOC', 'ISSC', 'SAFETY MANAGEMENT', 'DOCUMENT OF COMPLIANCE', 'SHIP SECURITY']

export function isCriticalCert(certType: string): boolean {
  const upper = certType.toUpperCase()
  return CRITICAL_CERT_KEYWORDS.some((kw) => upper.includes(kw))
}

export interface RiskParams {
  detentionCount: number
  yearBuilt: number | null
  totalDeficiencies: number
  expiredCertCount: number
  hasCriticalExpiredCert: boolean
  expiringCertCount?: number
  redFlagCount?: number
  nonIacsClass?: boolean
}

export function computeRisk(p: RiskParams): RiskLevel {
  const age = p.yearBuilt ? new Date().getFullYear() - p.yearBuilt : null
  const redFlags = p.redFlagCount ?? 0

  if (
    p.detentionCount > 0 ||
    p.expiredCertCount >= 3 ||
    p.hasCriticalExpiredCert ||
    redFlags >= 5
  ) return 'high'

  const tooOld = age !== null && age > 20
  const tooManyExpiring = (p.expiringCertCount ?? 0) >= 3
  if (
    p.detentionCount === 0 &&
    p.expiredCertCount === 0 &&
    redFlags <= 1 &&
    !tooOld &&
    !tooManyExpiring &&
    !p.nonIacsClass &&
    p.totalDeficiencies < 5
  ) return 'low'

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

type RawShipForAlerts = { id: string; name: string; imo: string; year_built: number | null; class_society: string | null }
type RawInspForAlerts = { id: string; ship_id: string; detention: boolean | null; num_deficiencies: number | null; report_date: string }

const EMPTY_ALERTS: DashboardAlerts = { certAlerts: [], highRiskShips: [], chronicShips: [] }

export async function getDashboardAlerts(): Promise<DashboardAlerts> {
  try {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const in90 = new Date(today)
    in90.setDate(in90.getDate() + 90)
    const in90Str = in90.toISOString().split('T')[0]

    const [shipsRes, inspRes, certsRes, defRes] = await Promise.all([
      supabase.from('ships').select('id, name, imo, year_built, class_society'),
      supabase.from('psc_inspections').select('id, ship_id, detention, num_deficiencies, report_date'),
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

    // Ship-level aggregates from inspections
    const shipStats = new Map<string, { detentions: number; deficiencies: number }>()
    for (const insp of inspections) {
      let s = shipStats.get(insp.ship_id)
      if (!s) { s = { detentions: 0, deficiencies: 0 }; shipStats.set(insp.ship_id, s) }
      if (insp.detention) s.detentions++
      s.deficiencies += insp.num_deficiencies ?? 0
    }

    // Certs grouped by ship
    const certsByShip = new Map<string, RawCert[]>()
    for (const cert of certs) {
      let arr = certsByShip.get(cert.ship_id)
      if (!arr) { arr = []; certsByShip.set(cert.ship_id, arr) }
      arr.push(cert)
    }

    // Chronic / red-flag count per ship using date-based deduplication
    const inspInfo = new Map<string, { ship_id: string; report_date: string }>()
    for (const insp of inspections) {
      inspInfo.set(insp.id, { ship_id: insp.ship_id, report_date: insp.report_date })
    }
    const shipCatDates = new Map<string, Map<string, Set<string>>>()
    for (const def of defs) {
      const info = inspInfo.get(def.inspection_id)
      if (!info || !def.category) continue
      let catMap = shipCatDates.get(info.ship_id)
      if (!catMap) { catMap = new Map(); shipCatDates.set(info.ship_id, catMap) }
      let dateSet = catMap.get(def.category)
      if (!dateSet) { dateSet = new Set(); catMap.set(def.category, dateSet) }
      dateSet.add(info.report_date)
    }
    const chronicByShipId = new Map<string, number>()
    const redFlagsByShip = new Map<string, number>()
    for (const [shipId, catMap] of shipCatDates) {
      let count = 0
      for (const dateSet of catMap.values()) {
        if (dateSet.size >= 2) count++
      }
      if (count > 0) {
        chronicByShipId.set(shipId, count)
        redFlagsByShip.set(shipId, count)
      }
    }

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

    // --- High-risk ships ---
    const highRiskShips: HighRiskShipAlert[] = ships
      .flatMap((ship) => {
        const stats = shipStats.get(ship.id) ?? { detentions: 0, deficiencies: 0 }
        const shipCerts = certsByShip.get(ship.id) ?? []
        const expiredCerts = shipCerts.filter((c) => c.expiry_date < todayStr)
        const risk = computeRisk({
          detentionCount: stats.detentions,
          yearBuilt: ship.year_built,
          totalDeficiencies: stats.deficiencies,
          expiredCertCount: expiredCerts.length,
          hasCriticalExpiredCert: expiredCerts.some((c) => isCriticalCert(c.cert_type)),
          expiringCertCount: shipCerts.filter((c) => c.expiry_date >= todayStr).length,
          redFlagCount: redFlagsByShip.get(ship.id) ?? 0,
          nonIacsClass: ship.class_society != null && !ship.class_society.includes('(IACS)'),
        })
        if (risk !== 'high') return []
        return [{ id: ship.id, name: ship.name, imo: ship.imo, detention_count: stats.detentions }]
      })

    // --- Chronic ships ---
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
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const in90 = new Date(today)
  in90.setDate(in90.getDate() + 90)
  const in90Str = in90.toISOString().split('T')[0]

  const [shipsResult, inspResult, certsResult, defsResult] = await Promise.all([
    supabase
      .from('ships')
      .select('id, name, imo, ship_type, flag, year_built, class_society')
      .order('name', { ascending: true }),
    supabase
      .from('psc_inspections')
      .select('id, ship_id, detention, report_date, num_deficiencies'),
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

  const ships = (shipsResult.data ?? []) as Array<{
    id: string; name: string; imo: string; ship_type: string | null
    flag: string | null; year_built: number | null; class_society: string | null
  }>
  const inspections = (inspResult.data ?? []) as RawInspection[]
  const certs = (certsResult.data ?? []) as RawCert[]
  const defs = (defsResult.data ?? []) as RawDef[]

  // Group inspections by ship_id
  const byShip = new Map<string, RawInspection[]>()
  for (const insp of inspections) {
    let arr = byShip.get(insp.ship_id)
    if (!arr) { arr = []; byShip.set(insp.ship_id, arr) }
    arr.push(insp)
  }

  // Certs by ship
  const certsByShip = new Map<string, RawCert[]>()
  for (const cert of certs) {
    let arr = certsByShip.get(cert.ship_id)
    if (!arr) { arr = []; certsByShip.set(cert.ship_id, arr) }
    arr.push(cert)
  }

  // Red flag count per ship (recurring detainable category across 2+ distinct dates)
  const inspInfo = new Map<string, { ship_id: string; report_date: string }>()
  for (const insp of inspections) {
    inspInfo.set(insp.id, { ship_id: insp.ship_id, report_date: insp.report_date })
  }
  const shipCatDates = new Map<string, Map<string, Set<string>>>()
  for (const def of defs) {
    const info = inspInfo.get(def.inspection_id)
    if (!info || !def.category) continue
    let catMap = shipCatDates.get(info.ship_id)
    if (!catMap) { catMap = new Map(); shipCatDates.set(info.ship_id, catMap) }
    let dateSet = catMap.get(def.category)
    if (!dateSet) { dateSet = new Set(); catMap.set(def.category, dateSet) }
    dateSet.add(info.report_date)
  }
  const redFlagsByShip = new Map<string, number>()
  for (const [shipId, catMap] of shipCatDates) {
    let count = 0
    for (const dateSet of catMap.values()) {
      if (dateSet.size >= 2) count++
    }
    if (count > 0) redFlagsByShip.set(shipId, count)
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

    const shipCerts = certsByShip.get(ship.id) ?? []
    const expiredCerts = shipCerts.filter((c) => c.expiry_date < todayStr)
    const risk = computeRisk({
      detentionCount: detention_count,
      yearBuilt: ship.year_built,
      totalDeficiencies: total_deficiencies,
      expiredCertCount: expiredCerts.length,
      hasCriticalExpiredCert: expiredCerts.some((c) => isCriticalCert(c.cert_type)),
      expiringCertCount: shipCerts.filter((c) => c.expiry_date >= todayStr).length,
      redFlagCount: redFlagsByShip.get(ship.id) ?? 0,
      nonIacsClass: ship.class_society != null && !ship.class_society.includes('(IACS)'),
    })

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
