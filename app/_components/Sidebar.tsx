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

const navItems: { key: TranslationKey; href: string; Icon: React.ElementType }[] = [
  { key: 'nav.dashboard', href: '/',        Icon: LayoutDashboard },
  { key: 'nav.ships',     href: '/ship',    Icon: Ship },
  { key: 'nav.reports',   href: '/reports', Icon: FileText },
  { key: 'nav.fleet',     href: '/fleet',   Icon: Anchor },
  { key: 'nav.settings',  href: '/settings',Icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <nav className="w-56 shrink-0 bg-navy-900 flex flex-col pt-2 pb-4 border-r border-navy-700">
      {navItems.map(({ key, href, Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
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
