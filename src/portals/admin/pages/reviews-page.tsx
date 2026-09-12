import { Ellipsis, Eye, EyeOff, MessageSquareText, Package, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { dbActions, getFlaggedReviews, useDb, useDemoQuery } from '@/data'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { IconButton } from '@/components/ui/icon-button'
import { Img } from '@/components/ui/img'
import { PageHeader } from '@/components/ui/page-header'
import { RadioGroup } from '@/components/ui/radio-group'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import { Tabs } from '@/components/ui/tabs'
import { Rating } from '@/components/commerce/rating'
import { DataTable, type Column } from '@/components/dashboard/data-table'
import { ExportButton } from '@/components/dashboard/export-button'
import { FilterBar } from '@/components/dashboard/filter-bar'
import { formatDate, formatNumber, pluralize } from '@/lib/format'
import { useUrlState } from '@/lib/use-url-state'
import { LoadFailed } from '../components/record-states'

/** Opening a dialog straight from a menu item fights Radix's focus return; let the menu close first. */
function deferred(run: () => void) {
  window.setTimeout(run, 0)
}

const REMOVE_REASONS = [
  'Contains abusive or offensive language.',
  'Not about the product — it is about the delivery.',
  'Contains personal contact details.',
  'Appears to be a paid or fake review.',
]

type ReviewTab = 'flagged' | 'removed' | 'all'

/** The flagged queue: read the review, then publish it or take it down with a reason. */
export default function AdminReviewsPage() {
  const [tab, setTab] = useUrlState<ReviewTab>('tab', 'flagged')
  const [q, setQ] = useUrlState<string>('q', '')
  const [reading, setReading] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string[] | null>(null)
  const [reason, setReason] = useState(REMOVE_REASONS[0] ?? '')
  const navigate = useNavigate()

  const counts = useDb(
    (view) => ({
      flagged: view.reviews.filter((review) => review.status === 'flagged').length,
      removed: view.reviews.filter((review) => review.status === 'removed').length,
      all: view.reviews.length,
    }),
    [],
  )

  const query = useDemoQuery(
    (view) => {
      const needle = q.trim().toLowerCase()
      return getFlaggedReviews(view, { tab }).filter(
        (row) =>
          !needle ||
          row.review.title.toLowerCase().includes(needle) ||
          row.review.body.toLowerCase().includes(needle) ||
          (row.product?.title ?? '').toLowerCase().includes(needle),
      )
    },
    [tab, q],
  )

  // `?demo=empty` still hands back real rows, so blank them here to show the empty state.
  const rows = query.status === 'empty' ? [] : (query.data ?? [])
  type Row = (typeof rows)[number]

  const open = rows.find((row) => row.review.id === reading)

  const publish = (ids: string[]) => {
    ids.forEach((id) => dbActions.setReviewStatus(id, 'published'))
    toast.success(`${ids.length} ${pluralize(ids.length, 'review')} published`, {
      description: 'They are back on the product page.',
    })
  }

  const submitRemove = () => {
    if (!removing) return
    removing.forEach((id) => dbActions.setReviewStatus(id, 'removed', reason))
    const count = removing.length
    setRemoving(null)
    setReading(null)
    toast.success(`${count} ${pluralize(count, 'review')} removed`, {
      description: 'They no longer appear on the product page.',
    })
  }

  const csvHeaders = ['Review', 'Rating', 'Product', 'Seller', 'Shopper', 'Posted', 'Status', 'Flag reason'] as const
  const csvRow = (row: Row) => [
    row.review.title,
    row.review.rating,
    row.product?.title ?? '',
    row.seller?.displayName ?? '',
    row.customerName,
    row.review.createdAt.slice(0, 10),
    row.review.status,
    row.review.flagReason ?? '',
  ]

  const columns: Column<Row>[] = [
    {
      id: 'review',
      header: 'Review',
      mobile: 'title',
      sortValue: (row) => row.review.title,
      cell: (row) => (
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="line-clamp-1">{row.review.title}</span>
          <span className="line-clamp-2 type-caption text-fg-muted">{row.review.body}</span>
          {row.review.flagReason ? (
            <span className="type-caption text-warning-subtle-fg">Reported: {row.review.flagReason}</span>
          ) : null}
        </span>
      ),
    },
    {
      id: 'rating',
      header: 'Rating',
      mobile: 'meta',
      sortValue: (row) => row.review.rating,
      cell: (row) => <Rating value={row.review.rating} variant="stars" />,
    },
    {
      id: 'product',
      header: 'Product',
      hideBelow: 'lg',
      mobile: 'subtitle',
      sortValue: (row) => row.product?.title ?? '',
      cell: (row) => <span className="line-clamp-2">{row.product?.title ?? 'Listing removed'}</span>,
    },
    {
      id: 'seller',
      header: 'Seller',
      hideBelow: 'xl',
      hideable: true,
      sortValue: (row) => row.seller?.displayName ?? '',
      cell: (row) => <span className="truncate">{row.seller?.displayName ?? '—'}</span>,
    },
    {
      id: 'shopper',
      header: 'Shopper',
      hideBelow: 'xl',
      hideable: true,
      sortValue: (row) => row.customerName,
      cell: (row) => <span className="truncate">{row.customerName}</span>,
    },
    {
      id: 'posted',
      header: 'Posted',
      hideBelow: 'lg',
      sortValue: (row) => row.review.createdAt,
      cell: (row) => <span className="whitespace-nowrap">{formatDate(row.review.createdAt)}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      sortValue: (row) => row.review.status,
      cell: (row) => <StatusBadge domain="review" status={row.review.status} size="sm" withTooltip />,
    },
    {
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'end',
      width: 'xs',
      mobile: 'action',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton
              label={`Actions for the review “${row.review.title}”`}
              size="sm"
              variant="ghost"
              icon={<Ellipsis aria-hidden />}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem icon={<Eye aria-hidden />} onSelect={() => setReading(row.review.id)}>
              Read in full
            </DropdownMenuItem>
            {row.product ? (
              <DropdownMenuItem icon={<Package aria-hidden />} onSelect={() => void navigate(`/admin/products/${row.product?.id ?? ''}`)}>
                View listing
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            {row.review.status === 'published' ? null : (
              <DropdownMenuItem icon={<Eye aria-hidden />} onSelect={() => publish([row.review.id])}>
                Publish review
              </DropdownMenuItem>
            )}
            {row.review.status === 'removed' ? null : (
              <DropdownMenuItem
                destructive
                icon={<EyeOff aria-hidden />}
                onSelect={() =>
                  deferred(() => {
                    setReason(REMOVE_REASONS[0] ?? '')
                    setRemoving([row.review.id])
                  })
                }
              >
                Remove review
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Reviews shoppers reported, and everything the team has taken down."
        meta={
          query.status === 'success' ? (
            <span>
              {formatNumber(rows.length)} {pluralize(rows.length, 'review')}
            </span>
          ) : null
        }
      >
        <Tabs
          aria-label="Review queues"
          value={tab}
          onValueChange={(next) => setTab(next as ReviewTab)}
          items={[
            { value: 'flagged', label: 'Flagged', count: counts.flagged },
            { value: 'removed', label: 'Removed', count: counts.removed },
            { value: 'all', label: 'All reviews', count: counts.all },
          ]}
        />
      </PageHeader>

      {query.status === 'error' ? (
        <LoadFailed title="We couldn’t load the reviews" onRetry={query.retry} />
      ) : (
        <DataTable
          tableId="admin-reviews"
          caption="Reviews waiting for a moderation decision"
          data={rows}
          columns={columns}
          getRowId={(row) => row.review.id}
          loading={query.status === 'loading'}
          selectable
          bulkActions={(ids, clear) => (
            <>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Eye aria-hidden />}
                onClick={() => {
                  publish(ids)
                  clear()
                }}
              >
                Publish
              </Button>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<EyeOff aria-hidden />}
                onClick={() => {
                  setReason(REMOVE_REASONS[0] ?? '')
                  setRemoving(ids)
                }}
              >
                Remove
              </Button>
              <ExportButton
                filename="chowk-reviews-selected"
                label="Export selected"
                headers={csvHeaders}
                rows={() => rows.filter((row) => ids.includes(row.review.id)).map(csvRow)}
              />
            </>
          )}
          toolbar={
            <FilterBar
              search={{ value: q, onChange: setQ, placeholder: 'Search review or product' }}
              onReset={() => setQ('')}
              actions={<ExportButton filename="chowk-reviews" headers={csvHeaders} rows={() => rows.map(csvRow)} />}
            />
          }
          empty={
            <EmptyState
              icon={<MessageSquareText aria-hidden />}
              title={
                q
                  ? 'No reviews match that search'
                  : tab === 'flagged'
                    ? 'Nothing flagged right now'
                    : tab === 'removed'
                      ? 'Nothing has been removed'
                      : 'No reviews yet'
              }
              description={
                q
                  ? 'Try a shorter word, or switch to All reviews.'
                  : tab === 'flagged'
                    ? 'You’ve cleared the queue. Reported reviews land here for a decision.'
                    : tab === 'removed'
                      ? 'Reviews you take down appear here, with the reason recorded.'
                      : 'Reviews appear here as shoppers rate what they bought.'
              }
              action={
                q ? (
                  <Button size="sm" variant="outline" onClick={() => setQ('')}>
                    Clear search
                  </Button>
                ) : tab !== 'all' ? (
                  <Button size="sm" variant="outline" onClick={() => setTab('all')}>
                    View all reviews
                  </Button>
                ) : null
              }
            />
          }
        />
      )}

      <Sheet open={reading !== null} onOpenChange={(next) => !next && setReading(null)}>
        <SheetContent
          title={open ? open.review.title : 'Review'}
          description={open ? `${open.customerName} · ${formatDate(open.review.createdAt)}` : undefined}
          footer={
            open ? (
              <div className="flex flex-wrap justify-end gap-2">
                {open.review.status === 'published' ? null : (
                  <Button variant="outline" leftIcon={<Eye aria-hidden />} onClick={() => { publish([open.review.id]); setReading(null) }}>
                    Publish
                  </Button>
                )}
                {open.review.status === 'removed' ? null : (
                  <Button
                    variant="danger"
                    leftIcon={<EyeOff aria-hidden />}
                    onClick={() => {
                      setReason(REMOVE_REASONS[0] ?? '')
                      setRemoving([open.review.id])
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ) : undefined
          }
        >
          {open ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <Rating value={open.review.rating} variant="stars" size="md" />
                <StatusBadge domain="review" status={open.review.status} size="sm" />
                {open.review.verified ? <span className="type-caption text-success-subtle-fg">Verified purchase</span> : null}
              </div>

              {open.review.flagReason ? (
                <p className="rounded-card border border-warning-border bg-warning-subtle p-3 type-body text-fg">
                  Reported: {open.review.flagReason}
                </p>
              ) : null}

              <p className="type-body whitespace-pre-line text-fg">{open.review.body}</p>

              {open.review.photos.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {open.review.photos.map((photo) => (
                    <Img key={photo} image={photo} alt="" ratio="square" width={160} sizes="80px" className="size-20 rounded-thumb" />
                  ))}
                </div>
              ) : null}

              <p className="flex items-center gap-1.5 type-caption text-fg-muted">
                <ThumbsUp aria-hidden className="size-3.5" />
                {formatNumber(open.review.helpful)} {pluralize(open.review.helpful, 'shopper')} found this helpful
              </p>

              {open.review.sellerReply ? (
                <div className="flex flex-col gap-1 rounded-card bg-surface-2 p-3">
                  <p className="type-label text-fg">{open.seller?.displayName ?? 'The seller'} replied</p>
                  <p className="type-body text-fg-muted">{open.review.sellerReply.body}</p>
                  <p className="type-caption text-fg-subtle">{formatDate(open.review.sellerReply.at)}</p>
                </div>
              ) : null}

              <p className="type-caption text-fg-muted">
                On {open.product?.title ?? 'a listing that has been removed'}
                {open.seller ? ` · sold by ${open.seller.displayName}` : ''}
              </p>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={removing !== null} onOpenChange={(next) => !next && setRemoving(null)}>
        <DialogContent
          title={removing && removing.length > 1 ? `Remove ${removing.length} reviews?` : 'Remove this review?'}
          description="It disappears from the product page straight away. The reason is recorded in the audit log."
          footer={
            <>
              <Button variant="outline" onClick={() => setRemoving(null)}>
                Keep it published
              </Button>
              <Button variant="danger" onClick={submitRemove}>
                Remove review
              </Button>
            </>
          }
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="pb-2 type-label text-fg">Reason</legend>
            <RadioGroup
              aria-label="Removal reason"
              variant="card"
              value={reason}
              onValueChange={setReason}
              options={REMOVE_REASONS.map((entry) => ({ value: entry, label: entry }))}
            />
          </fieldset>
        </DialogContent>
      </Dialog>
    </>
  )
}
