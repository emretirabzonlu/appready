import { supabase } from '@/lib/db'

export type Ship = {
  id: string
  name: string
  imo: string
  ship_type: string | null
  flag: string | null
  year_built: number | null
  gross_tonnage: number | null
  dwt: number | null
  class_society: string | null
  ism_manager: string | null
  call_sign: string | null
}

export type Inspection = {
  id: string
  ship_id: string
  report_date: string
  authority: string | null
  inspection_type: string | null
  detention: boolean | null
  num_deficiencies: number | null
  mou_region_id: string | null
  port_id: string | null
  mou_regions: { name: string } | null
}

export type Deficiency = {
  id: string
  inspection_id: string
  code: string | null
  category: string | null
  sub_category: string | null
  deficiency_text: string | null
  defect_text: string | null
}

export async function getShipByImo(imo: string): Promise<Ship | null> {
  const { data, error } = await supabase
    .from('ships')
    .select('id, name, imo, ship_type, flag, year_built, gross_tonnage, dwt, class_society, ism_manager, call_sign')
    .eq('imo', imo)
    .single()

  if (error) return null
  return data as Ship
}

export async function getInspectionsByShip(shipId: string): Promise<Inspection[]> {
  const { data, error } = await supabase
    .from('psc_inspections')
    .select('id, ship_id, report_date, authority, inspection_type, detention, num_deficiencies, mou_region_id, port_id, mou_regions(name)')
    .eq('ship_id', shipId)
    .order('report_date', { ascending: false })

  if (error) return []
  return (data ?? []) as unknown as Inspection[]
}

export async function getDeficiencies(inspectionId: string): Promise<Deficiency[]> {
  const { data, error } = await supabase
    .from('deficiencies')
    .select('id, inspection_id, code, category, sub_category, deficiency_text, defect_text')
    .eq('inspection_id', inspectionId)

  if (error) return []
  return (data ?? []) as Deficiency[]
}
