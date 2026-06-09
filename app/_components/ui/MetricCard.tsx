import { cn } from '@/lib/utils'

export type MetricVariant = 'navy' | 'danger' | 'warning' | 'success'

type Props = {
  label: string
  value: string | number
  sub?: string
  variant?: MetricVariant
  className?: string
}

const barColor: Record<MetricVariant, string> = {
  navy:    'bg-navy-700',
  danger:  'bg-danger-text',
  warning: 'bg-warning-text',
  success: 'bg-success-text',
}

const valueColor: Record<MetricVariant, string> = {
  navy:    'text-navy-700',
  danger:  'text-danger-text',
  warning: 'text-warning-text',
  success: 'text-success-text',
}

export function MetricCard({ label, value, sub, variant = 'navy', className }: Props) {
  return (
    <div className={cn('relative bg-surface border border-border rounded-card overflow-hidden', className)}>
      <div className={cn('absolute inset-y-0 left-0 w-[3px]', barColor[variant])} />
      <div className="pl-5 pr-4 py-4">
        <p className={cn('text-[22px] font-medium leading-none tabular-nums truncate', valueColor[variant])}>
          {value}
        </p>
        <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted mt-2">
          {label}
        </p>
        {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
