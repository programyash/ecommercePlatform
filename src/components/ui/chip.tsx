import { X } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface ChipProps extends Omit<ComponentProps<'button'>, 'onSelect'> {
  selected?: boolean
  icon?: ReactNode
  /** Renders a remove affordance (applied-filter chips). */
  onRemove?: () => void
  removeLabel?: string
  size?: 'sm' | 'md'
}

/** Selectable pill: category quick-filters, applied filters, tag pickers. */
export function Chip({
  selected,
  icon,
  onRemove,
  removeLabel,
  size = 'md',
  className,
  children,
  type,
  ...props
}: ChipProps) {
  const content = (
    <>
      {icon}
      <span className="truncate">{children}</span>
    </>
  )
  const classes = cn(
    'inline-flex max-w-full items-center gap-1.5 rounded-pill border whitespace-nowrap transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm',
    selected
      ? 'border-primary bg-primary-subtle font-medium text-primary-subtle-fg'
      : 'border-border bg-surface text-fg hover:border-border-strong hover:bg-surface-2',
    '[&_svg]:size-3.5 [&_svg]:shrink-0',
    className,
  )

  if (onRemove) {
    return (
      <span className={classes}>
        {content}
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel ?? `Remove ${typeof children === 'string' ? children : 'filter'}`}
          className="-mr-1 grid size-5 shrink-0 place-items-center rounded-full text-fg-muted hover:bg-surface-3 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      </span>
    )
  }

  return (
    <button type={type ?? 'button'} aria-pressed={selected} className={classes} {...props}>
      {content}
    </button>
  )
}
