import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { usePageTitle } from '@/lib/use-page-title'
import { Breadcrumbs, type Crumb } from './breadcrumbs'

interface PageHeaderProps {
  /** Renders the page's single h1 and sets the document title. */
  title: string
  /** Override the document title when it should differ from the visible heading. */
  documentTitle?: string
  description?: ReactNode
  breadcrumbs?: Crumb[]
  /** Status badge or similar shown next to the title. */
  badge?: ReactNode
  /** Small facts under the title: ids, dates, counts. */
  meta?: ReactNode
  /** At most one primary action; the rest belong in a menu. */
  actions?: ReactNode
  /** Tabs or filters sitting directly under the header. */
  children?: ReactNode
  className?: string
}

/** The same header anatomy on every page of all three portals. */
export function PageHeader({
  title,
  documentTitle,
  description,
  breadcrumbs,
  badge,
  meta,
  actions,
  children,
  className,
}: PageHeaderProps) {
  usePageTitle(documentTitle ?? title)
  return (
    <header className={cn('flex flex-col gap-3', className)}>
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="type-h1 text-fg">{title}</h1>
            {badge}
          </div>
          {description ? <p className="type-body max-w-prose text-fg-muted">{description}</p> : null}
          {meta ? <div className="flex flex-wrap items-center gap-x-3 gap-y-1 type-caption text-fg-muted">{meta}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </header>
  )
}
