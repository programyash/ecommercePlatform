import type { Rating as RatingValue } from '@/data/types'
import { cn } from '@/lib/cn'
import { formatNumber, formatRating } from '@/lib/format'
import { Rating } from './rating'

interface RatingSummaryProps {
  rating: RatingValue
  /** Clicking a bar filters the reviews to that star count. */
  selected?: number | null
  onSelect?: (stars: number | null) => void
  className?: string
}

/** Average, count and the five bars — the bars double as filters. */
export function RatingSummary({ rating, selected, onSelect, className }: RatingSummaryProps) {
  const total = rating.count || 1
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-8', className)}>
      <div className="flex shrink-0 flex-col items-start gap-1">
        <p className="flex items-baseline gap-2">
          <span className="type-kpi text-fg">{formatRating(rating.avg)}</span>
          <span className="type-body text-fg-muted">out of 5</span>
        </p>
        <Rating value={rating.avg} variant="stars" size="md" />
        <p className="type-caption text-fg-muted">{formatNumber(rating.count)} ratings</p>
      </div>

      <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
        {[5, 4, 3, 2, 1].map((stars, index) => {
          const count = rating.dist[index] ?? 0
          const pct = Math.round((count / total) * 100)
          const isSelected = selected === stars
          const Row = onSelect ? 'button' : 'div'
          return (
            <li key={stars}>
              <Row
                {...(onSelect
                  ? {
                      type: 'button' as const,
                      onClick: () => onSelect(isSelected ? null : stars),
                      'aria-pressed': isSelected,
                    }
                  : {})}
                className={cn(
                  'flex w-full items-center gap-3 rounded-badge px-1 py-0.5 text-left',
                  onSelect && 'transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-ring',
                  isSelected && 'bg-primary-subtle',
                )}
              >
                <span className="w-10 shrink-0 type-caption text-fg-muted tabular">{stars} star</span>
                <span aria-hidden className="h-2 min-w-0 flex-1 overflow-hidden rounded-pill bg-surface-3">
                  <span className="block h-full rounded-pill bg-rating" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-10 shrink-0 text-right type-caption text-fg-muted tabular">{pct}%</span>
              </Row>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
