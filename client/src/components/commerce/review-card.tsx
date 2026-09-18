import { CircleCheck, Store, ThumbsUp } from 'lucide-react'
import type { Review } from '@/data/types'
import { Avatar } from '@/components/ui/avatar'
import { Img } from '@/components/ui/img'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import { Rating } from './rating'

interface ReviewCardProps {
  review: Review
  authorName: string
  sellerName?: string
  onHelpful?: (reviewId: string) => void
  helpfulVoted?: boolean
  /** Seller-side: reply box or moderation actions. */
  actions?: React.ReactNode
  className?: string
}

export function ReviewCard({
  review,
  authorName,
  sellerName,
  onHelpful,
  helpfulVoted,
  actions,
  className,
}: ReviewCardProps) {
  return (
    <article className={cn('flex flex-col gap-2 border-b border-border-subtle py-4 last:border-b-0', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Rating value={review.rating} />
        <h4 className="type-label text-fg">{review.title}</h4>
      </div>

      <p className="type-body max-w-prose text-fg-muted">{review.body}</p>

      {review.photos.length ? (
        <ul className="flex gap-2">
          {review.photos.slice(0, 4).map((photo) => (
            <li key={photo}>
              <Img image={photo} alt={`Photo from ${authorName}'s review`} ratio="square" width={120} sizes="72px" className="w-18 rounded-badge" />
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 type-caption text-fg-muted">
        <span className="flex items-center gap-1.5">
          <Avatar name={authorName} size="xs" />
          {authorName}
        </span>
        {review.verified ? (
          <span className="flex items-center gap-1 text-success-subtle-fg">
            <CircleCheck aria-hidden className="size-3.5" />
            Verified purchase
          </span>
        ) : null}
        <span>{formatDate(review.createdAt)}</span>
        {onHelpful ? (
          <button
            type="button"
            onClick={() => onHelpful(review.id)}
            aria-pressed={helpfulVoted}
            className={cn(
              'ml-auto inline-flex items-center gap-1.5 rounded-badge px-1.5 py-0.5 transition-colors hover:bg-surface-2 hover:text-fg',
              'focus-visible:outline-2 focus-visible:outline-ring',
              helpfulVoted && 'text-primary',
            )}
          >
            <ThumbsUp aria-hidden className={cn('size-3.5', helpfulVoted && 'fill-current')} />
            Helpful{review.helpful ? ` (${review.helpful + (helpfulVoted ? 1 : 0)})` : ''}
          </button>
        ) : null}
      </div>

      {review.sellerReply ? (
        <div className="ml-4 flex flex-col gap-1 border-l-2 border-border-subtle pl-3">
          <p className="flex items-center gap-1.5 type-caption font-medium text-fg">
            <Store aria-hidden className="size-3.5 text-fg-muted" />
            {sellerName ?? 'Seller'} replied
          </p>
          <p className="type-body text-fg-muted">{review.sellerReply.body}</p>
          <p className="type-caption text-fg-subtle">{formatDate(review.sellerReply.at)}</p>
        </div>
      ) : null}

      {actions ? <div className="flex flex-wrap items-center gap-2 pt-1">{actions}</div> : null}
    </article>
  )
}
