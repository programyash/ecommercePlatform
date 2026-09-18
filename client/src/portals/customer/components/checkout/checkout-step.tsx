import { CircleCheck } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/cn'

interface StepHeadingProps {
  title: string
  documentTitle: string
  description?: ReactNode
  meta?: ReactNode
}

/**
 * The step's h1. Focus moves here on every step change, so a keyboard or screen-reader
 * user lands on "Payment" rather than back at the top of the document.
 */
export function StepHeading({ title, documentTitle, description, meta }: StepHeadingProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="rounded-card outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      <PageHeader title={title} documentTitle={documentTitle} description={description} meta={meta} />
    </div>
  )
}

interface CompletedStepProps {
  label: string
  children: ReactNode
  to: string
  /** Accessible name for the Change button, e.g. "Change delivery address". */
  changeLabel: string
}

/** A finished step, collapsed to one row with a way back into it. */
export function CompletedStep({ label, children, to, changeLabel }: CompletedStepProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-card border border-border bg-surface px-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <CircleCheck aria-hidden className="mt-0.5 size-4.5 shrink-0 text-success" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="type-caption text-fg-muted">{label}</p>
          <div className="type-body text-fg">{children}</div>
        </div>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link to={to} aria-label={changeLabel}>
          Change
        </Link>
      </Button>
    </div>
  )
}

/** 8 + 4 on desktop; a single column with the price summary underneath on phones. */
export function CheckoutColumns({ children, aside }: { children: ReactNode; aside: ReactNode }) {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-12 lg:gap-6">
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-8">{children}</div>
      <div className="min-w-0 lg:col-span-4">{aside}</div>
    </div>
  )
}

/** A plain panel inside a step — never nested inside another card. */
export function StepPanel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex flex-col gap-4 rounded-card border border-border bg-surface p-4 sm:p-5', className)}>
      {title ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="type-title text-fg">{title}</h2>
            {description ? <p className="type-caption text-fg-muted">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  )
}
