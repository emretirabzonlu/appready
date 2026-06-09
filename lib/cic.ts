import { supabase } from '@/lib/db'

export type CicCampaign = {
  id: string
  year: number
  topic: string
  start_date: string | null
  end_date: string | null
  applicable_regions: string[] | null
}

export async function getActiveCampaign(): Promise<CicCampaign | null> {
  const { data, error } = await supabase
    .from('cic_campaigns')
    .select('id, year, topic, start_date, end_date, applicable_regions')

  if (error || !data?.length) return null

  const todayStr = new Date().toISOString().split('T')[0]
  const currentYear = new Date().getFullYear()

  return (
    (data as CicCampaign[]).find((c) => {
      if (c.start_date && c.end_date) {
        return c.start_date <= todayStr && c.end_date >= todayStr
      }
      return c.year === currentYear
    }) ?? null
  )
}
