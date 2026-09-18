import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/lib/cn'

export interface Crumb {
  label: string
  to?: string
}

interface BreadcrumbsProps {
  items: Crumb[]
  className?: string
}

/** Trail for pages two or more levels deep. Middle items collapse on small screens. */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null
  const last = items.length - 1
  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
      <ol className="flex min-w-0 items-center gap-1 text-xs text-fg-muted">
        {items.map((item, index) => {
          const isLast = index === last
          const hideOnMobile = !isLast && index !== 0 && items.length > 3
          return (
            <li
              key={`${item.label}-${index}`}
              className={cn('flex min-w-0 items-center gap-1', hideOnMobile && 'hidden md:flex')}
            >
              {index > 0 ? <ChevronRight aria-hidden className="size-3.5 shrink-0 text-fg-disabled" /> : null}
              {item.to && !isLast ? (
                <Link to={item.to} className="truncate hover:text-fg hover:underline underline-offset-2">
                  {item.label}
                </Link>
              ) : (
                <span className={cn('truncate', isLast && 'text-fg')} aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
