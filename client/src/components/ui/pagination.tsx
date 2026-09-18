import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

interface PaginationProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  /** e.g. "Showing 21–40 of 1,284". */
  summary?: string
  className?: string
}

function pageList(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const pages = new Set<number>([1, pageCount, page, page - 1, page + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  let previous = 0
  for (const p of sorted) {
    if (previous && p - previous > 1) out.push('gap')
    out.push(p)
    previous = p
  }
  return out
}

export function Pagination({ page, pageCount, onPageChange, summary, className }: PaginationProps) {
  if (pageCount <= 1 && !summary) return null
  const buttonClass =
    'grid h-9 min-w-9 place-items-center rounded-control border border-transparent px-2 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring'

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      {summary ? <p className="type-caption text-fg-muted">{summary}</p> : <span />}
      {pageCount > 1 ? (
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <button type="button" className={buttonClass} onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          {pageList(page, pageCount).map((item, index) =>
            item === 'gap' ? (
              <span key={`gap-${index}`} className="px-1 text-sm text-fg-disabled">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-current={item === page ? 'page' : undefined}
                className={cn(buttonClass, item === page && 'border-primary bg-primary-subtle font-semibold text-primary-subtle-fg')}
              >
                {item}
              </button>
            ),
          )}
          <button type="button" className={buttonClass} onClick={() => onPageChange(page + 1)} disabled={page >= pageCount} aria-label="Next page">
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </nav>
      ) : null}
    </div>
  )
}
