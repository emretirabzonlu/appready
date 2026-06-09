import { cn } from '@/lib/utils'

type Props = {
  step: number | string
  title: string
  description?: string
  className?: string
}

export function SectionHeader({ step, title, description, className }: Props) {
  return (
    <div className={cn('flex items-center gap-3 mb-4', className)}>
      <div className="h-6 w-6 rounded-sm bg-navy-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
        {step}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-text leading-tight">{title}</h3>
        {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
      </div>
    </div>
  )
}
