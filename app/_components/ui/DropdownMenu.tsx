'use client'
import * as Radix from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'

export const DropdownRoot = Radix.Root
export const DropdownTrigger = Radix.Trigger

export function DropdownContent({
  className,
  sideOffset = 6,
  align = 'end',
  ...props
}: React.ComponentPropsWithoutRef<typeof Radix.Content>) {
  return (
    <Radix.Portal>
      <Radix.Content
        data-radix-dropdown
        sideOffset={sideOffset}
        align={align}
        className={cn(
          'z-50 min-w-[190px] overflow-hidden rounded-card border border-border bg-surface shadow-xl',
          className,
        )}
        {...props}
      />
    </Radix.Portal>
  )
}

export function DropdownItem({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Radix.Item>) {
  return (
    <Radix.Item
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2.5 px-3 py-2 text-sm text-text',
        'outline-none transition-colors rounded-sm mx-1',
        'focus:bg-page-bg focus:text-navy-700',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
        className,
      )}
      {...props}
    />
  )
}

export function DropdownSeparator({ className, ...props }: React.ComponentPropsWithoutRef<typeof Radix.Separator>) {
  return <Radix.Separator className={cn('my-1 h-px bg-border', className)} {...props} />
}

export function DropdownLabel({ className, ...props }: React.ComponentPropsWithoutRef<typeof Radix.Label>) {
  return (
    <Radix.Label
      className={cn('px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted', className)}
      {...props}
    />
  )
}
