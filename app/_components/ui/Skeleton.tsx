import { cn } from '@/lib/utils'

type Props = { className?: string }

export function Skeleton({ className }: Props) {
  return (
    <div className={cn('bg-border/70 rounded animate-pulse', className)} />
  )
}
