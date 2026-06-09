import { supabase } from '@/lib/db'

export type Port = {
  id: string
  name: string
  country: string | null
  mou_region_id: string | null
  mou_regions: { name: string } | null
}

export async function getPorts(): Promise<Port[]> {
  const { data } = await supabase
    .from('ports')
    .select('id, name, country, mou_region_id, mou_regions(name)')
    .order('name', { ascending: true })
  return (data ?? []) as unknown as Port[]
}
