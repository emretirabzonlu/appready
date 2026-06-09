'use client'
import { LogOut } from 'lucide-react'
import { SectionHeader } from '@/app/_components/ui/SectionHeader'
import { Card } from '@/app/_components/ui/Card'
import { cn } from '@/lib/utils'
import { useT, useLocale } from '@/app/_components/LocaleProvider'
import type { Locale } from '@/lib/i18n'

export default function SettingsPage() {
  const t = useT()
  const { locale, setLocale } = useLocale()

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <h1 className="text-lg font-medium text-text mb-6">{t('settings.title')}</h1>

      {/* Language */}
      <SectionHeader
        step={1}
        title={t('settings.language')}
        description={t('settings.language.desc')}
      />
      <Card className="p-5 mb-8">
        <div className="flex gap-2">
          {(['tr', 'en'] as Locale[]).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              className={cn(
                'cursor-pointer px-5 py-2 rounded-sm text-sm font-medium transition-colors',
                locale === code
                  ? 'bg-navy-900 text-white'
                  : 'bg-surface border border-border text-text-muted hover:text-text hover:border-accent/40',
              )}
            >
              {t(code === 'tr' ? 'settings.language.tr' : 'settings.language.en')}
            </button>
          ))}
        </div>
      </Card>

      {/* Company profile */}
      <SectionHeader
        step={2}
        title={t('settings.company')}
        description={t('settings.company.desc')}
      />
      <Card className="p-5 mb-8">
        <p className="text-sm text-text-muted">{t('settings.company.placeholder')}</p>
      </Card>

      {/* Logout */}
      <button
        type="button"
        className="cursor-pointer inline-flex items-center gap-2 text-sm text-danger-text hover:text-white hover:bg-danger-text px-4 py-2 rounded-sm border border-danger-text/30 transition-colors"
        onClick={() => {}}
      >
        <LogOut size={15} />
        {t('settings.logout')}
      </button>
    </div>
  )
}
