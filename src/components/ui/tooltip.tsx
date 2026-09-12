import { Tooltip as TooltipPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  /** Keep the tooltip from rendering (e.g. when a label is already visible). */
  disabled?: boolean
  className?: string
}

export function Tooltip({ content, children, side = 'top', align = 'center', disabled, className }: TooltipProps) {
  if (disabled) return <>{children}</>
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={6}
          collisionPadding={8}
          className={cn(
            'z-50 max-w-64 rounded-badge bg-surface-inverse px-2 py-1 text-xs leading-4 text-fg-inverse shadow-popover',
            'origin-(--radix-tooltip-content-transform-origin) data-[state=closed]:animate-fade-out data-[state=delayed-open]:animate-pop-in',
            className,
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
