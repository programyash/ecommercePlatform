import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'primary' | 'accent'

// Literal class maps (never `bg-${tone}`): Tailwind only compiles classes it can see.
export const badgeVariants = cva(
  'inline-flex max-w-full shrink-0 items-center gap-1 whitespace-nowrap rounded-badge font-medium [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        neutral: '',
        info: '',
        success: '',
        warning: '',
        danger: '',
        primary: '',
        accent: '',
      },
      variant: {
        subtle: 'border',
        solid: 'border border-transparent',
        outline: 'border bg-transparent',
      },
      size: {
        sm: 'h-5 px-1.5 text-2xs',
        md: 'h-6 px-2 text-xs',
      },
    },
    compoundVariants: [
      { variant: 'subtle', tone: 'neutral', className: 'border-neutral-border bg-neutral-subtle text-neutral-subtle-fg' },
      { variant: 'subtle', tone: 'info', className: 'border-info-border bg-info-subtle text-info-subtle-fg' },
      { variant: 'subtle', tone: 'success', className: 'border-success-border bg-success-subtle text-success-subtle-fg' },
      { variant: 'subtle', tone: 'warning', className: 'border-warning-border bg-warning-subtle text-warning-subtle-fg' },
      { variant: 'subtle', tone: 'danger', className: 'border-danger-border bg-danger-subtle text-danger-subtle-fg' },
      { variant: 'subtle', tone: 'primary', className: 'border-transparent bg-primary-subtle text-primary-subtle-fg' },
      { variant: 'subtle', tone: 'accent', className: 'border-transparent bg-accent-subtle text-accent-subtle-fg' },
      { variant: 'solid', tone: 'neutral', className: 'bg-neutral text-neutral-fg' },
      { variant: 'solid', tone: 'info', className: 'bg-info text-info-fg' },
      { variant: 'solid', tone: 'success', className: 'bg-success text-success-fg' },
      { variant: 'solid', tone: 'warning', className: 'bg-warning text-warning-fg' },
      { variant: 'solid', tone: 'danger', className: 'bg-danger text-danger-fg' },
      { variant: 'solid', tone: 'primary', className: 'bg-primary text-primary-fg' },
      { variant: 'solid', tone: 'accent', className: 'bg-accent text-accent-fg' },
      { variant: 'outline', tone: 'neutral', className: 'border-border-strong text-fg-muted' },
      { variant: 'outline', tone: 'info', className: 'border-info-border text-info-subtle-fg' },
      { variant: 'outline', tone: 'success', className: 'border-success-border text-success-subtle-fg' },
      { variant: 'outline', tone: 'warning', className: 'border-warning-border text-warning-subtle-fg' },
      { variant: 'outline', tone: 'danger', className: 'border-danger-border text-danger-subtle-fg' },
      { variant: 'outline', tone: 'primary', className: 'border-primary text-primary' },
      { variant: 'outline', tone: 'accent', className: 'border-accent text-accent' },
    ],
    defaultVariants: { tone: 'neutral', variant: 'subtle', size: 'md' },
  },
)

export interface BadgeProps extends ComponentProps<'span'>, VariantProps<typeof badgeVariants> {
  icon?: ReactNode
  dot?: boolean
}

const dotClass: Record<Tone, string> = {
  neutral: 'bg-neutral',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  primary: 'bg-primary',
  accent: 'bg-accent',
}

export function Badge({ tone, variant, size, icon, dot, className, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, variant, size }), className)} {...props}>
      {dot ? <span aria-hidden className={cn('size-1.5 rounded-full', dotClass[tone ?? 'neutral'])} /> : null}
      {icon}
      <span className="truncate">{children}</span>
    </span>
  )
}
