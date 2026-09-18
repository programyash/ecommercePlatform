import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: ReactNode
  /** Primary action. */
  action?: ReactNode
  /** Secondary link or button. */
  secondaryAction?: ReactNode
  variant?: 'default' | 'compact' | 'inline'
  className?: string
}

/**
 * Four uses, same anatomy: first run, no results, filtered to nothing, error.
 * The copy should teach the next step, never just say "nothing here".
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'default',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        variant === 'default' && 'gap-3 px-6 py-14',
        variant === 'compact' && 'gap-2 px-4 py-8',
        variant === 'inline' && 'gap-1.5 px-3 py-6',
        className,
      )}
    >
      {icon ? (
        <span
          aria-hidden
          className={cn(
            'grid place-items-center rounded-full bg-surface-2 text-fg-subtle',
            variant === 'default' ? 'size-12 [&_svg]:size-6' : 'size-9 [&_svg]:size-4.5',
          )}
        >
          {icon}
        </span>
      ) : null}
      <p className={cn(variant === 'default' ? 'type-h3' : 'type-title', 'text-fg')}>{title}</p>
      {description ? <p className="type-body max-w-prose text-balance text-fg-muted">{description}</p> : null}
      {action || secondaryAction ? (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  )
}
