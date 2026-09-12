import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'

const heights = {
  sm: 'h-44',
  md: 'h-64',
  lg: 'h-80',
} as const

interface ChartCardProps {
  title: ReactNode
  description?: ReactNode
  /** Range pickers, toggles, export. */
  actions?: ReactNode
  height?: keyof typeof heights
  loading?: boolean
  /** Shown instead of the chart when there is nothing to plot. */
  empty?: ReactNode
  /** A table of the same numbers, for screen readers and for checking values. */
  tableView?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Fixed-height frame for every chart: Recharts' responsive container needs a sized
 * parent, and a stable height stops dashboards from jumping while data loads.
 */
export function ChartCard({
  title,
  description,
  actions,
  height = 'md',
  loading = false,
  empty,
  tableView,
  children,
  className,
}: ChartCardProps) {
  return (
    <section className={cn('flex min-w-0 flex-col rounded-card border border-border bg-surface', className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 pb-2 sm:px-5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="type-title text-fg">{title}</h3>
          {description ? <p className="type-caption text-fg-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      <div className={cn('min-w-0 px-2 pb-3 sm:px-3', heights[height])}>
        {loading ? (
          <div className="flex h-full flex-col justify-end gap-2 px-2 pb-6">
            <Skeleton className="h-full w-full rounded-card" />
          </div>
        ) : empty ? (
          <div className="grid h-full place-items-center">{empty}</div>
        ) : (
          children
        )}
      </div>
      {tableView ? (
        <details className="border-t border-border-subtle px-4 py-2 sm:px-5">
          <summary className="cursor-pointer type-caption text-fg-muted hover:text-fg">View as table</summary>
          <div className="max-h-64 overflow-auto pt-2 scrollbar-thin">{tableView}</div>
        </details>
      ) : null}
    </section>
  )
}
