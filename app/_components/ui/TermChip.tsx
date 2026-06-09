'use client'
import { findTermDefinitions } from '@/lib/terms'
import {
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
} from '@/app/_components/ui/Tooltip'

export function TermChip({ children }: { children: string }) {
  const defs = findTermDefinitions(children)

  if (defs.length === 0) return <>{children}</>

  return (
    <TooltipProvider delayDuration={200}>
      <TooltipRoot>
        <TooltipTrigger asChild>
          <span className="underline decoration-dotted decoration-text-muted/50 underline-offset-2 cursor-help">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-64 text-center leading-snug">
          {defs.join(' · ')}
        </TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  )
}
