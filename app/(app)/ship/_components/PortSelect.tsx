'use client'
import { useRouter } from 'next/navigation'
import { t } from '@/lib/i18n'
import type { Port } from '@/lib/ports'

type Props = {
  ports: Port[]
  imo: string
  currentPort: string
}

export function PortSelect({ ports, imo, currentPort }: Props) {
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const port = e.target.value
    const qs = port ? `?port=${encodeURIComponent(port)}` : ''
    router.push(`/ship/${encodeURIComponent(imo)}${qs}`)
  }

  return (
    <select
      value={currentPort}
      onChange={handleChange}
      className="rounded border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:ring-1 focus:ring-accent"
    >
      <option value="">{t('port.select')}</option>
      {ports.map((p) => (
        <option key={p.id} value={p.id}>
          {p.country ? `${p.name} · ${p.country}` : p.name}
        </option>
      ))}
    </select>
  )
}
