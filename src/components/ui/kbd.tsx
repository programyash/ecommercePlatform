import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-badge border border-border bg-surface-2 px-1.5',
        'font-sans text-2xs font-medium text-fg-muted',
        className,
      )}
      {...props}
    />
  )
}
