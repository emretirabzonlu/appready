import { cn } from '@/lib/utils'

export type RiskLevel = 'danger' | 'warning' | 'success' | 'neutral'

const levelStyles: Record<RiskLevel, string> = {
  danger:  'bg-danger-bg text-danger-text',
  warning: 'bg-warning-bg text-warning-text',
  success: 'bg-success-bg text-success-text',
  neutral: 'bg-border text-text-muted',
}

type Props = {
  level: RiskLevel
  children: React.ReactNode
  className?: string
}

export function RiskBadge({ level, children, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium',
        levelStyles[level],
        className,
      )}
    >
      {children}
    </span>
  )
}
