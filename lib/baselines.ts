import { supabase } from '@/lib/db'

export type Baseline = {
  id: string
  mou_region_id: string
  ship_type: string | null
  category: string
  rank: number | null
  pct: number | null
  is_detainable_top: boolean | null
  period_year: number | null
}

export async function getBaselines(
  mouRegionId: string,
  shipType: string,
): Promise<Baseline[]> {
  const { data, error } = await supabase
    .from('deficiency_baselines')
    .select('id, mou_region_id, ship_type, category, rank, pct, is_detainable_top, period_year')
    .eq('mou_region_id', mouRegionId)
    .eq('ship_type', shipType)
    .order('rank', { ascending: true })

  if (error) return []
  return (data ?? []) as Baseline[]
}

export async function getBaselinesFallback(mouRegionId: string): Promise<Baseline[]> {
  const { data, error } = await supabase
    .from('deficiency_baselines')
    .select('id, mou_region_id, ship_type, category, rank, pct, is_detainable_top, period_year')
    .eq('mou_region_id', mouRegionId)
    .is('ship_type', null)
    .order('rank', { ascending: true })

  if (error || !data?.length) {
    // Some regions store a catch-all without NULL; take any type as aggregate
    const { data: any, error: err2 } = await supabase
      .from('deficiency_baselines')
      .select('id, mou_region_id, ship_type, category, rank, pct, is_detainable_top, period_year')
      .eq('mou_region_id', mouRegionId)
      .order('rank', { ascending: true })
      .limit(20)
    if (err2) return []
    return (any ?? []) as Baseline[]
  }
  return data as Baseline[]
}

export async function getBaselinesForRegions(
  regionIds: string[],
  shipType: string | null,
): Promise<Map<string, Baseline[]>> {
  if (regionIds.length === 0) return new Map()
  const result = new Map<string, Baseline[]>()

  if (shipType) {
    const { data } = await supabase
      .from('deficiency_baselines')
      .select('id, mou_region_id, ship_type, category, rank, pct, is_detainable_top, period_year')
      .in('mou_region_id', regionIds)
      .eq('ship_type', shipType)
      .order('rank', { ascending: true })
    for (const b of (data ?? []) as Baseline[]) {
      const arr = result.get(b.mou_region_id) ?? []
      arr.push(b)
      result.set(b.mou_region_id, arr)
    }
  }

  const uncovered = regionIds.filter((id) => !result.has(id))
  if (uncovered.length > 0) {
    const { data } = await supabase
      .from('deficiency_baselines')
      .select('id, mou_region_id, ship_type, category, rank, pct, is_detainable_top, period_year')
      .in('mou_region_id', uncovered)
      .is('ship_type', null)
      .order('rank', { ascending: true })
    for (const b of (data ?? []) as Baseline[]) {
      const arr = result.get(b.mou_region_id) ?? []
      arr.push(b)
      result.set(b.mou_region_id, arr)
    }
  }

  return result
}
