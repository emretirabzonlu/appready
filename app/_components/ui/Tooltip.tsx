'use client'
import * as Radix from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

export const TooltipProvider = Radix.Provider
export const TooltipRoot = Radix.Root
export const TooltipTrigger = Radix.Trigger

export function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentPropsWithoutRef<typeof Radix.Content>) {
  return (
    <Radix.Portal>
      <Radix.Content
        data-radix-tooltip
        sideOffset={sideOffset}
        className={cn(
          'z-50 rounded-sm bg-navy-900 px-2.5 py-1 text-xs text-white shadow-md',
          className,
        )}
        {...props}
      />
    </Radix.Portal>
  )
}
