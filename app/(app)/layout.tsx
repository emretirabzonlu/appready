import { TopNav } from '@/app/_components/TopNav'
import { Sidebar } from '@/app/_components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-page-bg bg-page-gradient">
          {children}
        </main>
      </div>
    </div>
  )
}
