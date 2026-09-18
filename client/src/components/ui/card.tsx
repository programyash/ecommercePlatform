import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Plain surface panel. Never nest one card inside another. */
export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('rounded-card border border-border bg-surface', className)} {...props} />
}

interface SectionCardProps extends Omit<ComponentProps<'section'>, 'title'> {
  title?: ReactNode
  description?: ReactNode
  /** Right-aligned controls in the header row. */
  actions?: ReactNode
  footer?: ReactNode
  bodyClassName?: string
  /** Remove body padding (tables draw their own). */
  flush?: boolean
}

/** Titled panel used across dashboards and account pages. */
export function SectionCard({
  title,
  description,
  actions,
  footer,
  className,
  bodyClassName,
  flush,
  children,
  ...props
}: SectionCardProps) {
  return (
    <section className={cn('flex flex-col rounded-card border border-border bg-surface', className)} {...props}>
      {title || actions ? (
        <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 pb-3 sm:px-5">
          <div className="flex min-w-0 flex-col gap-0.5">
            {title ? <h2 className="type-title text-fg">{title}</h2> : null}
            {description ? <p className="type-caption text-fg-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn(!flush && 'px-4 pb-4 sm:px-5 sm:pb-5', !title && !flush && 'pt-4 sm:pt-5', bodyClassName)}>
        {children}
      </div>
      {footer ? <footer className="border-t border-border-subtle px-4 py-3 sm:px-5">{footer}</footer> : null}
    </section>
  )
}
