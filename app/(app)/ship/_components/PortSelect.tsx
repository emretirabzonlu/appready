'use client'
import { useRouter } from 'next/navigation'
import { useT } from '@/app/_components/LocaleProvider'
import { usePortLoading } from './PortLoadingContext'
import { Loader } from '@/app/_components/ui/Loader'
import type { Port } from '@/lib/ports'

type Props = {
  ports: Port[]
  imo: string
  currentPort: string
}

export function PortSelect({ ports, imo, currentPort }: Props) {
  const router = useRouter()
  const t = useT()
  const { isPending, startPortTransition } = usePortLoading()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const port = e.target.value
    const qs = port ? `?port=${encodeURIComponent(port)}` : ''
    startPortTransition(() => {
      router.push(`/ship/${encodeURIComponent(imo)}${qs}`)
    })
  }

  return (
    <div className="flex items-center gap-2">
    <select
      value={currentPort}
      onChange={handleChange}
      disabled={isPending}
      className="cursor-pointer rounded border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:ring-1 focus:ring-accent disabled:cursor-wait disabled:opacity-60"
    >
      <option value="">{t('port.select')}</option>
      {ports.map((p) => (
        <option key={p.id} value={p.id}>
          {p.country ? `${p.name} · ${p.country}` : p.name}
        </option>
      ))}
    </select>
    {isPending && <Loader size={16} label="" />}
    </div>
  )
}
