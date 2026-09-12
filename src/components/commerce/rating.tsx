import { Star } from 'lucide-react'
import { formatNumberCompact, formatRating } from '@/lib/format'
import { cn } from '@/lib/cn'

interface RatingProps {
  value: number
  count?: number
  /** `chip` is the compact green pill used on cards and rows; `stars` shows five stars. */
  variant?: 'chip' | 'stars'
  size?: 'sm' | 'md'
  className?: string
}

export function Rating({ value, count, variant = 'chip', size = 'sm', className }: RatingProps) {
  const label = `${formatRating(value)} out of 5${count ? `, ${count.toLocaleString('en-IN')} ratings` : ''}`

  if (variant === 'stars') {
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        <span className="sr-only">{label}</span>
        <span aria-hidden className="inline-flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                size === 'sm' ? 'size-3.5' : 'size-4',
                star <= Math.round(value) ? 'fill-rating text-rating' : 'text-border-strong',
              )}
            />
          ))}
        </span>
        {count !== undefined ? (
          <span aria-hidden className="type-caption text-fg-muted">
            ({formatNumberCompact(count)})
          </span>
        ) : null}
      </span>
    )
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="sr-only">{label}</span>
      <span
        aria-hidden
        className={cn(
          'inline-flex items-center gap-0.5 rounded-badge bg-rating-chip font-semibold text-rating-chip-fg tabular',
          size === 'sm' ? 'px-1.5 py-px text-2xs' : 'px-2 py-0.5 text-xs',
        )}
      >
        {formatRating(value)}
        <Star className={cn('fill-current', size === 'sm' ? 'size-2.5' : 'size-3')} />
      </span>
      {count !== undefined ? (
        <span aria-hidden className="type-caption text-fg-muted">
          {formatNumberCompact(count)}
        </span>
      ) : null}
    </span>
  )
}
