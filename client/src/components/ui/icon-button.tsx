import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Tooltip } from './tooltip'

const iconButtonVariants = cva(
  [
    'relative inline-flex shrink-0 items-center justify-center rounded-control transition-colors duration-150 ease-standard',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    'disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none',
  ],
  {
    variants: {
      variant: {
        ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg active:bg-surface-3',
        outline: 'border border-border bg-surface text-fg hover:bg-surface-2',
        solid: 'bg-primary text-primary-fg hover:bg-primary-hover',
        subtle: 'bg-surface-2 text-fg hover:bg-surface-3',
        'on-media': 'bg-surface/85 text-fg shadow-card backdrop-blur-sm hover:bg-surface',
      },
      size: {
        sm: 'size-8 [&_svg]:size-4',
        md: 'size-10 [&_svg]:size-5',
        lg: 'size-11 [&_svg]:size-5',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  },
)

export interface IconButtonProps extends Omit<ComponentProps<'button'>, 'children'>, VariantProps<typeof iconButtonVariants> {
  /** Required: becomes the accessible name and the tooltip. */
  label: string
  icon: ReactNode
  /** Small count bubble (cart, notifications). */
  badge?: number
  showTooltip?: boolean
  asChild?: boolean
  children?: ReactNode
}

export function IconButton({
  label,
  icon,
  badge,
  variant,
  size,
  className,
  showTooltip = true,
  asChild = false,
  children,
  type,
  ...props
}: IconButtonProps) {
  const content = (
    <>
      {icon}
      {badge ? (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-pill bg-primary px-1 text-2xs font-semibold leading-none text-primary-fg tabular ring-2 ring-surface"
        >
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </>
  )
  const accessibleName = badge ? `${label} (${badge})` : label
  const classes = cn(iconButtonVariants({ variant, size }), className)

  const button = asChild ? (
    <Slot.Root aria-label={accessibleName} className={classes} {...props}>
      {children}
    </Slot.Root>
  ) : (
    <button type={type ?? 'button'} aria-label={accessibleName} className={classes} {...props}>
      {content}
    </button>
  )

  return showTooltip ? <Tooltip content={label}>{button}</Tooltip> : button
}
