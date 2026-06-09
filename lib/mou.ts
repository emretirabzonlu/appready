import { supabase } from '@/lib/db'

export type MouRegion = {
  id: string
  code: string
  name: string
}

export async function getMouRegions(): Promise<MouRegion[]> {
  const { data, error } = await supabase
    .from('mou_regions')
    .select('id, code, name')
    .order('name', { ascending: true })

  if (error) return []
  return (data ?? []) as MouRegion[]
}
