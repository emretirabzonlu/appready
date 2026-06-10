import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error(
    '[PortReady] Supabase env eksik!\n' +
      `  NEXT_PUBLIC_SUPABASE_URL  = ${url ?? 'undefined'}\n` +
      `  NEXT_PUBLIC_SUPABASE_ANON_KEY = ${key ? key.slice(0, 12) + '…' : 'undefined'}\n` +
      '  Dev sunucusunu durdurup "npm run dev" ile yeniden başlatın.',
  )
}

export function createClient() {
  return createBrowserClient(url!, key!)
}
