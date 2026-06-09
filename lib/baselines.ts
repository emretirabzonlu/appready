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
