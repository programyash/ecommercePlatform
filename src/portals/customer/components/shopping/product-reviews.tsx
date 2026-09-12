import { MessageSquareText } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { dbActions, type Rating as RatingValue, type Review } from '@/data'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/empty-state'
import { Select } from '@/components/ui/select'
import { RatingSummary } from '@/components/commerce/rating-summary'
import { ReviewCard } from '@/components/commerce/review-card'
import { pluralWithCount } from '@/lib/format'
import { useUrlParams, useUrlState } from '@/lib/use-url-state'

const SORTS = [
  { value: 'helpful', label: 'Most helpful' },
  { value: 'newest', label: 'Newest first' },
  { value: 'highest', label: 'Highest rated' },
  { value: 'lowest', label: 'Lowest rated' },
] as const

type SortValue = (typeof SORTS)[number]['value']

interface ProductReviewsProps {
  rating: RatingValue
  reviews: Review[]
  /** Reviewer names by customer id. */
  authors: Record<string, string>
  sellerName?: string
}

const PAGE = 5

/** Ratings, the five bars as filters, and the reviews themselves. */
export function ProductReviews({ rating, reviews, authors, sellerName }: ProductReviewsProps) {
  const { setParams } = useUrlParams()
  const [stars, setStars] = useUrlState<string>('rstars', '')
  const [sort, setSort] = useUrlState<string>('rsort', 'helpful')
  const [photosOnly, setPhotosOnly] = useUrlState<string>('rphotos', '')
  const [verifiedOnly, setVerifiedOnly] = useUrlState<string>('rverified', '')
  const [shown, setShown] = useState(PAGE)
  const [voted, setVoted] = useState<string[]>([])

  const starFilter = stars ? Number(stars) : null
  const filtered = reviews
    .filter((review) => (starFilter ? review.rating === starFilter : true))
    .filter((review) => (photosOnly ? review.photos.length > 0 : true))
    .filter((review) => (verifiedOnly ? review.verified : true))
    .slice()
    .sort((a, b) => {
      switch (sort as SortValue) {
        case 'newest':
          return a.createdAt < b.createdAt ? 1 : -1
        case 'highest':
          return b.rating - a.rating || b.helpful - a.helpful
        case 'lowest':
          return a.rating - b.rating || b.helpful - a.helpful
        default:
          return b.helpful - a.helpful || (a.createdAt < b.createdAt ? 1 : -1)
      }
    })

  const activeFilters = Boolean(starFilter || photosOnly || verifiedOnly)
  const photoCount = reviews.filter((review) => review.photos.length > 0).length
  const verifiedCount = reviews.filter((review) => review.verified).length

  const vote = (reviewId: string) => {
    if (voted.includes(reviewId)) return
    const result = dbActions.voteHelpful(reviewId)
    if (!result.ok) {
      toast.error('We couldn’t record that vote', { description: result.error })
      return
    }
    setVoted((current) => [...current, reviewId])
  }

  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="flex flex-col gap-5 scroll-mt-32">
      <h2 id="reviews-heading" className="type-h2 text-fg">
        Ratings and reviews
      </h2>

      <RatingSummary
        rating={rating}
        selected={starFilter}
        onSelect={(value) => {
          setStars(value === null ? '' : String(value))
          setShown(PAGE)
        }}
      />

      {reviews.length === 0 ? (
        <EmptyState
          variant="compact"
          icon={<MessageSquareText aria-hidden />}
          title="No written reviews yet"
          description="Shoppers can review this product once it has been delivered to them."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border-subtle py-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <Checkbox
                label="With photos"
                count={photoCount}
                checked={photosOnly === '1'}
                onCheckedChange={(checked) => {
                  setPhotosOnly(checked === true ? '1' : '')
                  setShown(PAGE)
                }}
              />
              <Checkbox
                label="Verified purchases"
                count={verifiedCount}
                checked={verifiedOnly === '1'}
                onCheckedChange={(checked) => {
                  setVerifiedOnly(checked === true ? '1' : '')
                  setShown(PAGE)
                }}
              />
            </div>
            <Select
              size="sm"
              aria-label="Sort reviews"
              leading="Sort:"
              value={sort}
              onValueChange={(value) => {
                setSort(value)
                setShown(PAGE)
              }}
              options={SORTS.map((option) => ({ value: option.value, label: option.label }))}
              className="min-w-44"
            />
          </div>

          <p className="type-caption text-fg-muted" aria-live="polite">
            {pluralWithCount(filtered.length, 'review')}
            {activeFilters ? ' match these filters' : ''}
          </p>

          {filtered.length === 0 ? (
            <EmptyState
              variant="compact"
              icon={<MessageSquareText aria-hidden />}
              title="No reviews match these filters"
              description="Try removing a filter to see the rest of the reviews."
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setParams({ rstars: null, rphotos: null, rverified: null })}
                >
                  Clear review filters
                </Button>
              }
            />
          ) : (
            <>
              <div className="flex flex-col">
                {filtered.slice(0, shown).map((review) => {
                  // `voteHelpful` already stored the extra vote, and ReviewCard adds one
                  // more for its pressed state — so the card is given the stored count
                  // minus this shopper's vote and the two agree.
                  const isVoted = voted.includes(review.id)
                  return (
                    <ReviewCard
                      key={review.id}
                      review={isVoted ? { ...review, helpful: Math.max(0, review.helpful - 1) } : review}
                      authorName={authors[review.customerId] ?? 'Chowk shopper'}
                      {...(sellerName ? { sellerName } : {})}
                      helpfulVoted={isVoted}
                      onHelpful={vote}
                    />
                  )
                })}
              </div>
              {shown < filtered.length ? (
                <Button variant="outline" className="self-start" onClick={() => setShown((value) => value + PAGE)}>
                  Show more reviews
                </Button>
              ) : null}
            </>
          )}
        </>
      )}
    </section>
  )
}
