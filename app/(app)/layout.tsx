import { TopNav } from '@/app/_components/TopNav'
import { Sidebar } from '@/app/_components/Sidebar'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav userEmail={user?.email ?? null} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-page-bg bg-page-gradient">
          {children}
        </main>
      </div>
    </div>
  )
}
