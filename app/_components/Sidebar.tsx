'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Ship,
  FileText,
  Anchor,
  Settings,
} from 'lucide-react'
import { t } from '@/lib/i18n'
import type { TranslationKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type NavItem = {
  key: TranslationKey
  href: string
  Icon: React.ElementType
  passive?: boolean
}

const navItems: NavItem[] = [
  { key: 'nav.dashboard', href: '/dashboard', Icon: LayoutDashboard },
  { key: 'nav.ships',     href: '/ship',      Icon: Ship },
  { key: 'nav.reports',   href: '/reports',   Icon: FileText,        passive: true },
  { key: 'nav.fleet',     href: '/fleet',     Icon: Anchor,          passive: true },
  { key: 'nav.settings',  href: '/settings',  Icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <nav className="w-56 shrink-0 bg-navy-900 flex flex-col pt-2 pb-4 border-r border-navy-700">
      {navItems.map(({ key, href, Icon, passive }) => {
        if (passive) {
          return (
            <div
              key={href}
              className="flex items-center gap-3 mx-2 px-3 py-2 rounded-sm text-sm text-white/25 cursor-default select-none"
            >
              <Icon size={17} className="shrink-0" />
              <span className="flex-1">{t(key)}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/30 leading-none">
                {t('nav.comingSoon')}
              </span>
            </div>
          )
        }

        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 mx-2 px-3 py-2 rounded-sm text-sm transition-colors',
              active
                ? 'bg-accent/10 text-accent font-medium'
                : 'text-white/55 hover:text-white/90 hover:bg-white/5',
            )}
          >
            <Icon size={17} className="shrink-0" />
            {t(key)}
          </Link>
        )
      })}
    </nav>
  )
}
