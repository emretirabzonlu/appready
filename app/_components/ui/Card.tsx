import { cn } from '@/lib/utils'

type Props = {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: Props) {
  return (
    <div className={cn('bg-surface border border-border rounded-card p-5', className)}>
      {children}
    </div>
  )
}
