'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bell, User, Settings, LogOut, Search } from 'lucide-react'
import { useT } from '@/app/_components/LocaleProvider'
import {
  DropdownRoot,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
} from '@/app/_components/ui/DropdownMenu'
import {
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
} from '@/app/_components/ui/Tooltip'
import { createClient } from '@/lib/supabase/browser'

type Props = { userEmail: string | null }

export function TopNav({ userEmail }: Props) {
  const router = useRouter()
  const t = useT()
  const [query, setQuery] = useState('')

  const initials = userEmail ? userEmail[0].toUpperCase() : '?'

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q) router.push(`/ship/${encodeURIComponent(q)}`)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <TooltipProvider delayDuration={400}>
      <header className="h-14 bg-navy-900 flex items-center gap-3 px-5 shrink-0 border-b border-navy-700/60">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 w-44 shrink-0 select-none group"
        >
          <span className="text-white font-semibold text-[15px] tracking-tight group-hover:text-accent transition-colors">
            {t('app.name')}
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xs">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search.placeholder')}
              className="w-full rounded-full bg-white/8 border border-white/10 pl-8 pr-4 py-1.5 text-sm
                         text-white placeholder:text-white/35 outline-none
                         focus:bg-white/12 focus:border-accent/50 focus:ring-1 focus:ring-accent/40
                         transition-all"
            />
          </div>
        </form>

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Notification bell */}
          <TooltipRoot>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="p-2 rounded-sm text-white/50 hover:text-white/90 hover:bg-white/8 transition-colors"
              >
                <Bell size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Bildirimler</TooltipContent>
          </TooltipRoot>

          {/* User dropdown */}
          <DropdownRoot>
            <DropdownTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2.5 rounded-sm pl-2 pr-3 py-1.5
                           hover:bg-white/8 transition-colors group"
              >
                <span className="h-7 w-7 rounded-full bg-accent flex items-center justify-center
                                  text-white text-[11px] font-semibold shrink-0 select-none">
                  {initials}
                </span>
                <div className="text-left hidden sm:block">
                  <p className="text-[13px] font-medium text-white/90 leading-none truncate max-w-32">
                    {userEmail ?? '…'}
                  </p>
                </div>
              </button>
            </DropdownTrigger>

            <DropdownContent align="end">
              <DropdownLabel className="truncate max-w-48">{userEmail ?? '…'}</DropdownLabel>
              <DropdownItem>
                <User size={14} className="text-text-muted" />
                Profil
              </DropdownItem>
              <DropdownItem onSelect={() => router.push('/settings')}>
                <Settings size={14} className="text-text-muted" />
                {t('nav.settings')}
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                onSelect={handleSignOut}
                className="text-danger-text focus:text-danger-text focus:bg-danger-bg/50"
              >
                <LogOut size={14} />
                {t('settings.logout')}
              </DropdownItem>
            </DropdownContent>
          </DropdownRoot>
        </div>
      </header>
    </TooltipProvider>
  )
}
