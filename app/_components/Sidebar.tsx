'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  PanelLeft,
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
  { key: 'nav.reports',   href: '/reports',   Icon: FileText,       passive: true },
  { key: 'nav.fleet',     href: '/fleet',     Icon: Anchor,         passive: true },
  { key: 'nav.settings',  href: '/settings',  Icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <nav
      className={cn(
        'shrink-0 bg-navy-900 flex flex-col pb-4 border-r border-navy-700',
        'transition-[width] duration-200 ease-in-out overflow-hidden',
        collapsed ? 'w-14' : 'w-56',
      )}
    >
      {/* Toggle */}
      <div className={cn('flex pt-2 pb-1 px-2', collapsed ? 'justify-center' : 'justify-end')}>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Genişlet' : 'Daralt'}
          className="p-1.5 rounded-sm text-white/35 hover:text-white/70 hover:bg-white/5 transition-colors"
        >
          <PanelLeft
            size={15}
            className={cn('transition-transform duration-200', collapsed && 'rotate-180')}
          />
        </button>
      </div>

      {/* Nav items */}
      {navItems.map(({ key, href, Icon, passive }) => {
        if (passive) {
          return (
            <div
              key={href}
              title={collapsed ? t(key) : undefined}
              className={cn(
                'flex items-center mx-2 rounded-sm text-sm text-white/25 cursor-default select-none',
                collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2',
              )}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{t(key)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/30 leading-none">
                    {t('nav.comingSoon')}
                  </span>
                </>
              )}
            </div>
          )
        }

        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            title={collapsed ? t(key) : undefined}
            className={cn(
              'flex items-center mx-2 rounded-sm text-sm transition-colors',
              collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2',
              active
                ? 'bg-accent/10 text-accent font-medium'
                : 'text-white/55 hover:text-white/90 hover:bg-white/5',
            )}
          >
            <Icon size={17} className="shrink-0" />
            {!collapsed && t(key)}
          </Link>
        )
      })}
    </nav>
  )
}
