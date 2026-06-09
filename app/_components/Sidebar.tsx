'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PanelLeft,
  LayoutDashboard,
  Ship,
  FileText,
  Anchor,
  Settings,
} from 'lucide-react'
import { useT } from '@/app/_components/LocaleProvider'
import type { TranslationKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type NavItem = {
  key: TranslationKey
  href: string
  Icon: React.ElementType
  passive?: boolean
}

const NAV: NavItem[] = [
  { key: 'nav.dashboard', href: '/dashboard', Icon: LayoutDashboard },
  { key: 'nav.ships',     href: '/ship',      Icon: Ship },
  { key: 'nav.reports',   href: '/reports',   Icon: FileText, passive: true },
  { key: 'nav.fleet',     href: '/fleet',     Icon: Anchor },
  { key: 'nav.settings',  href: '/settings',  Icon: Settings },
]

const W_OPEN   = 224
const W_CLOSED = 56

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const t = useT()

  return (
    <motion.nav
      animate={{ width: collapsed ? W_CLOSED : W_OPEN }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className="shrink-0 bg-navy-900 flex flex-col border-r border-navy-700/60 overflow-hidden"
    >
      {/* Toggle button */}
      <div className={cn('flex h-14 items-center border-b border-navy-700/40', collapsed ? 'justify-center px-0' : 'justify-end px-3')}>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Genişlet' : 'Daralt'}
          className="p-1.5 rounded-sm text-white/30 hover:text-white/70 hover:bg-white/6 transition-colors"
        >
          <motion.div
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.22 }}
          >
            <PanelLeft size={15} />
          </motion.div>
        </button>
      </div>

      {/* Nav items */}
      <div className="flex-1 py-3 space-y-0.5">
        {NAV.map(({ key, href, Icon, passive }) => {
          const active = !passive && pathname.startsWith(href)

          if (passive) {
            return (
              <div
                key={href}
                title={collapsed ? t(key) : undefined}
                className={cn(
                  'relative flex items-center gap-3 mx-2 rounded-sm text-sm text-white/22 cursor-default select-none',
                  collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2',
                )}
              >
                <Icon size={16} className="shrink-0" />
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.18 }}
                      className="flex-1 flex items-center gap-2 overflow-hidden whitespace-nowrap"
                    >
                      <span className="flex-1 truncate">{t(key)}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/8 text-white/25 leading-none font-medium">
                        {t('nav.comingSoon')}
                      </span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            )
          }

          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? t(key) : undefined}
              className={cn(
                'relative flex items-center gap-3 mx-2 rounded-sm text-sm transition-colors',
                collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2',
                active
                  ? 'bg-white/8 text-accent font-medium'
                  : 'text-white/50 hover:text-white/85 hover:bg-white/5',
              )}
            >
              {/* Active left accent bar */}
              {active && (
                <motion.span
                  layoutId="nav-active-bar"
                  className="absolute left-0 inset-y-1 w-0.75 rounded-r-full bg-accent"
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                />
              )}
              <Icon size={16} className="shrink-0" />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.18 }}
                    className="truncate overflow-hidden whitespace-nowrap"
                  >
                    {t(key)}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )
        })}
      </div>

      {/* Bottom: separator + version */}
      <div>
        <div className="mx-4 h-px bg-navy-700/60" />
        <div
          className={cn(
            'flex items-center gap-2.5 px-4 py-3',
            collapsed && 'justify-center px-0',
          )}
        >
          <span className="h-7 w-7 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[11px] font-semibold shrink-0">
            DK
          </span>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <p className="text-[12px] font-medium text-white/70 whitespace-nowrap">PortReady</p>
                <p className="text-[10px] text-white/30 whitespace-nowrap">v0.1 · PSC Hazırlık</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.nav>
  )
}
