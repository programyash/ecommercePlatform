import { Flag, MessageSquareText, Reply, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import {
  dbActions,
  getSellerRatingSummary,
  getSellerReviews,
  useDb,
  useDemoQuery,
  useSession,
  type SellerReviewRow,
} from '@/data'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { RadioGroup } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { RatingSummary } from '@/components/commerce/rating-summary'
import { ReviewCard } from '@/components/commerce/review-card'
import { FilterBar } from '@/components/dashboard/filter-bar'
import { formatNumber, formatRating } from '@/lib/format'
import { useUrlState } from '@/lib/use-url-state'

type ReviewFilter = 'all' | 'unanswered' | 'critical' | 'flagged'

const PAGE = 8

const REPORT_REASONS = [
  { value: 'offensive', label: 'Offensive or abusive language', description: 'Swearing, slurs or personal attacks.' },
  { value: 'wrong_product', label: 'Not about this product', description: 'The review describes something else entirely.' },
  { value: 'spam', label: 'Spam or an advert', description: 'Links, promotions or a competitor’s store.' },
  { value: 'personal_data', label: 'Contains personal details', description: 'A phone number, address or order id.' },
]

function ReplyForm({ reviewId, onDone, onCancel }: { reviewId: string; onDone: () => void; onCancel: () => void }) {
  const [body, setBody] = useState('')
  const tooShort = body.trim().length < 10

  return (
    <div className="flex w-full flex-col gap-2 rounded-card border border-border bg-surface-2 p-3">
      <Field
        label="Your public reply"
        hint="Shown under the review on the product page. You get one reply per review, so make it count."
      >
        {({ id, describedBy }) => (
          <Textarea
            id={id}
            aria-describedby={describedBy}
            rows={3}
            maxLength={500}
            value={body}
            autoFocus
            onChange={(event) => setBody(event.target.value)}
            placeholder="Thanks for the honest feedback — we’ve changed the packing so the box arrives flat."
          />
        )}
      </Field>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="mr-auto type-caption text-fg-muted tabular">{body.length}/500</span>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={tooShort}
          onClick={() => {
            const result = dbActions.replyToReview(reviewId, body.trim())
            if (!result.ok) {
              toast.error('Could not post your reply', { description: result.error })
              return
            }
            toast.success('Reply posted', { description: 'Shoppers see it under the review on your product page.' })
            onDone()
          }}
        >
          Post reply
        </Button>
      </div>
    </div>
  )
}

function ReportDialog({ reviewId, onClose }: { reviewId: string | null; onClose: () => void }) {
  const [reason, setReason] = useState('offensive')
  const [note, setNote] = useState('')
  const label = REPORT_REASONS.find((entry) => entry.value === reason)?.label ?? 'Reported by the seller'

  return (
    <Dialog
      open={Boolean(reviewId)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {reviewId ? (
        <DialogContent
          title="Report this review"
          description="The marketplace team reads every report and either keeps the review or removes it."
          size="md"
          footer={
            <>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={() => {
                  const result = dbActions.setReviewStatus(reviewId, 'flagged', note.trim() ? `${label} — ${note.trim()}` : label)
                  if (!result.ok) {
                    toast.error('Could not report this review', { description: result.error })
                    return
                  }
                  toast.success('Review reported', { description: 'It stays visible until the team decides.' })
                  onClose()
                }}
              >
                Report review
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <RadioGroup aria-label="Reason" value={reason} onValueChange={setReason} options={REPORT_REASONS} variant="card" />
            <Field label="Anything else the team should know" optional>
              {({ id, describedBy }) => (
                <Textarea
                  id={id}
                  aria-describedby={describedBy}
                  rows={3}
                  maxLength={300}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              )}
            </Field>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}

/** Ratings for the whole store, and one public reply per review. */
export default function SellerReviewsPage() {
  const sellerId = useSession((state) => state.sellerId)
  const [filter, setFilter] = useUrlState<ReviewFilter>('filter', 'all')
  const [q, setQ] = useUrlState<string>('q', '')
  const [stars, setStars] = useUrlState<string>('stars', '')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [visible, setVisible] = useState(PAGE)

  const signature = `${filter}|${q}|${stars}`
  const [seenSignature, setSeenSignature] = useState(signature)
  if (signature !== seenSignature) {
    setSeenSignature(signature)
    setVisible(PAGE)
  }

  const seller = useDb((view) => view.sellers.find((entry) => entry.id === sellerId), [sellerId])
  const summary = useDb((view) => getSellerRatingSummary(view, sellerId), [sellerId])

  const query = useDemoQuery(
    (view) => {
      const all = getSellerReviews(view, sellerId, { filter, q })
      return stars ? all.filter((row) => row.review.rating === Number(stars)) : all
    },
    [sellerId, filter, q, stars],
  )
  // A forced empty state (?demo=empty) still returns real data; the screen must honour it.
  const rows = query.status === 'empty' ? [] : (query.data ?? [])
  const filtered = filter !== 'all' || Boolean(q) || Boolean(stars)
  const unanswered = useDb(
    (view) => getSellerReviews(view, sellerId, { filter: 'unanswered' }).length,
    [sellerId],
  )

  const clearFilters = () => {
    setFilter('all')
    setQ('')
    setStars('')
  }

  const renderRow = (row: SellerReviewRow) => (
    <ReviewCard
      key={row.review.id}
      review={row.review}
      authorName={row.customerName}
      sellerName={seller?.displayName}
      className="border-b-0"
      actions={
        replyTo === row.review.id ? (
          <ReplyForm reviewId={row.review.id} onDone={() => setReplyTo(null)} onCancel={() => setReplyTo(null)} />
        ) : (
          <>
            {row.product ? (
              <Link
                to={`/seller/products/${row.product.id}/edit`}
                className="type-caption text-link hover:underline underline-offset-2"
              >
                {row.product.title}
              </Link>
            ) : null}
            <span className="ml-auto flex flex-wrap items-center gap-2">
              {row.review.status === 'flagged' ? <StatusBadge domain="review" status="flagged" size="sm" withTooltip /> : null}
              {row.review.sellerReply ? null : (
                <Button size="sm" variant="outline" leftIcon={<Reply aria-hidden />} onClick={() => setReplyTo(row.review.id)}>
                  Reply
                </Button>
              )}
              {row.review.status === 'flagged' ? null : (
                <Button size="sm" variant="ghost" leftIcon={<Flag aria-hidden />} onClick={() => setReportId(row.review.id)}>
                  Report
                </Button>
              )}
            </span>
          </>
        )
      }
    />
  )

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Replies are public. A calm, specific answer does more for your rating than the review itself."
        meta={
          <>
            <span>
              {formatRating(summary.average)} out of 5 · {formatNumber(summary.count)} reviews
            </span>
            {unanswered > 0 ? <span className="text-info-subtle-fg">{formatNumber(unanswered)} awaiting a reply</span> : null}
          </>
        }
      />

      <SectionCard title="Rating breakdown" description="Choose a bar to see only those reviews.">
        {summary.count === 0 ? (
          <p className="type-body text-fg-muted">No ratings yet. They appear here once shoppers review a delivered order.</p>
        ) : (
          <RatingSummary
            rating={{ avg: summary.average, count: summary.count, dist: summary.dist }}
            selected={stars ? Number(stars) : null}
            onSelect={(value) => setStars(value ? String(value) : '')}
          />
        )}
      </SectionCard>

      <FilterBar
        search={{ value: q, onChange: setQ, placeholder: 'Search review title or text' }}
        facets={[
          {
            id: 'filter',
            label: 'Show',
            single: true,
            selected: filter === 'all' ? [] : [filter],
            onChange: (selected) => setFilter((selected[0] as ReviewFilter) ?? 'all'),
            options: [
              { value: 'unanswered', label: 'Awaiting reply' },
              { value: 'critical', label: '1 and 2 stars' },
              { value: 'flagged', label: 'Reported' },
            ],
          },
        ]}
        onReset={clearFilters}
      />

      <SectionCard
        title={`${formatNumber(rows.length)} ${rows.length === 1 ? 'review' : 'reviews'}`}
        description={filtered ? 'Filtered. Clear the filters to see everything.' : 'Newest first.'}
        bodyClassName="divide-y divide-border-subtle"
      >
        {query.status === 'loading' ? (
          <div className="flex flex-col gap-4 py-2">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-2/3" />
              </div>
            ))}
          </div>
        ) : query.status === 'error' ? (
          <EmptyState
            icon={<TriangleAlert aria-hidden />}
            title="We couldn’t load your reviews"
            description="The list didn’t come back. Try again."
            action={<Button onClick={query.retry}>Retry</Button>}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<MessageSquareText aria-hidden />}
            title={filtered ? 'No reviews match these filters' : 'No reviews yet'}
            description={
              filtered
                ? 'Try another filter, or clear them to see every review.'
                : 'Reviews appear here once a shopper rates a delivered order. Replying quickly lifts your store rating.'
            }
            action={
              filtered ? (
                <Button size="sm" variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" variant="outline" asChild>
                  <Link to="/seller/orders?tab=delivered">See delivered orders</Link>
                </Button>
              )
            }
          />
        ) : (
          rows.slice(0, visible).map(renderRow)
        )}
      </SectionCard>

      {rows.length > visible ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setVisible((current) => current + PAGE)}>
            Show {Math.min(PAGE, rows.length - visible)} more reviews
          </Button>
        </div>
      ) : null}

      <ReportDialog reviewId={reportId} onClose={() => setReportId(null)} />
    </>
  )
}
