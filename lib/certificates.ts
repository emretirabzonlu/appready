import { supabase } from '@/lib/db'

export type Certificate = {
  id: string
  ship_id: string
  cert_type: string
  issuer: string | null
  issue_date: string | null
  expiry_date: string | null
}

export type CertStatus = 'expired' | 'expiring' | 'valid'

export type CertWithStatus = Certificate & {
  status: CertStatus
  is_interim: boolean
}

export async function getCertificates(shipId: string): Promise<CertWithStatus[]> {
  const { data, error } = await supabase
    .from('certificates')
    .select('id, ship_id, cert_type, issuer, issue_date, expiry_date')
    .eq('ship_id', shipId)

  if (error || !data?.length) return []

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const in90 = new Date(today)
  in90.setDate(in90.getDate() + 90)
  const in90Str = in90.toISOString().split('T')[0]

  const result: CertWithStatus[] = (data as Certificate[]).map((cert) => {
    let status: CertStatus = 'valid'
    if (cert.expiry_date) {
      if (cert.expiry_date < todayStr) status = 'expired'
      else if (cert.expiry_date <= in90Str) status = 'expiring'
    }

    let is_interim = false
    if (cert.issue_date && cert.expiry_date) {
      const ms = new Date(cert.expiry_date).getTime() - new Date(cert.issue_date).getTime()
      is_interim = Math.floor(ms / 86_400_000) < 210
    }

    return { ...cert, status, is_interim }
  })

  const order: Record<CertStatus, number> = { expired: 0, expiring: 1, valid: 2 }
  return result.sort((a, b) => order[a.status] - order[b.status])
}
