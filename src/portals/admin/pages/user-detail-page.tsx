import { Ban, CircleCheck, CreditCard, MapPin, ShoppingCart, Star } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { dbActions, getAuditLog, getCustomerDetail, kpi, useDemoQuery } from '@/data'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DescriptionList } from '@/components/ui/description-list'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { RadioGroup } from '@/components/ui/radio-group'
import { SectionCard } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { Rating } from '@/components/commerce/rating'
import { DataTable, type Column } from '@/components/dashboard/data-table'
import { KpiStrip } from '@/components/dashboard/kpi-strip'
import { formatDate, formatDateTime, formatINR, formatNumber, pluralize } from '@/lib/format'
import { maskCard, maskEmail, maskPhone, maskUpi } from '@/lib/mask'
import { PAYMENT_METHOD_META, deriveOrderSummary } from '@/lib/status'
import { AuditLog } from '../components/audit-log'
import { LoadFailed, RecordNotFound } from '../components/record-states'

const BLOCK_REASONS = [
  'Repeated return abuse across several sellers.',
  'Multiple chargebacks raised after delivery.',
  'Abusive messages to sellers.',
  'Suspected reseller using several accounts.',
]

/** One shopper: what they have bought, what they returned, and whether they can keep shopping. */
export default function AdminUserDetailPage() {
  const params = useParams()
  const userId = params.userId ?? ''
  const [blocking, setBlocking] = useState(false)
  const [reason, setReason] = useState(BLOCK_REASONS[0] ?? '')

  const query = useDemoQuery(
    (view) => {
      const detail = getCustomerDetail(view, userId)
      if (!detail) return null
      return {
        detail,
        audit: getAuditLog(view, { targetType: 'customer', targetId: userId, limit: 30 }),
      }
    },
    [userId],
  )

  const crumbs = [{ label: 'Customers', to: '/admin/users' }, { label: 'Shopper' }]

  if (query.status === 'error') {
    return (
      <>
        <PageHeader title="Customer" breadcrumbs={crumbs} />
        <LoadFailed title="We couldn’t load this shopper" onRetry={query.retry} />
      </>
    )
  }

  if (query.status === 'loading') {
    return (
      <>
        <PageHeader title="Customer" breadcrumbs={crumbs} />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 w-full rounded-card" />
          <Skeleton className="h-64 w-full rounded-card" />
        </div>
      </>
    )
  }

  if (query.status === 'empty' || !query.data) {
    return (
      <>
        <PageHeader title="Customer not found" breadcrumbs={crumbs} />
        <RecordNotFound
          title="We couldn’t find that shopper"
          description={`No account has the id “${userId}”. Check the link, or search the customer list.`}
          backTo="/admin/users"
          backLabel="Back to customers"
        />
      </>
    )
  }

  const { detail, audit } = query.data
  const customer = detail.customer
  const blocked = customer.status === 'blocked'

  const unblock = () => {
    dbActions.setCustomerStatus(customer.id, 'active')
    toast.success('Shopper unblocked', { description: `${customer.name} can shop and place orders again.` })
  }

  const submitBlock = () => {
    dbActions.setCustomerStatus(customer.id, 'blocked', reason)
    setBlocking(false)
    toast.success('Shopper blocked', { description: `${customer.name} cannot place new orders.` })
  }

  const orderColumns: Column<(typeof detail.recentOrders)[number]>[] = [
    {
      id: 'id',
      header: 'Order',
      mobile: 'title',
      sortValue: (row) => row.order.id,
      cell: (row) => <span className="font-mono whitespace-nowrap">{row.order.id}</span>,
    },
    {
      id: 'placed',
      header: 'Placed',
      hideBelow: 'md',
      mobile: 'subtitle',
      sortValue: (row) => row.order.placedAt,
      cell: (row) => <span className="whitespace-nowrap">{formatDate(row.order.placedAt)}</span>,
    },
    {
      id: 'units',
      header: 'Items',
      align: 'end',
      hideBelow: 'lg',
      sortValue: (row) => row.units,
      cell: (row) => formatNumber(row.units),
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'end',
      mobile: 'meta',
      sortValue: (row) => row.order.totals.total,
      cell: (row) => formatINR(row.order.totals.total),
    },
    {
      id: 'payment',
      header: 'Payment',
      hideBelow: 'lg',
      mobile: 'meta',
      sortValue: (row) => row.order.payment.method,
      cell: (row) => (
        <span className="flex flex-col items-start gap-1">
          <span className="whitespace-nowrap">{PAYMENT_METHOD_META[row.order.payment.method].short}</span>
          <StatusBadge domain="payment" status={row.order.payment.status} size="sm" />
        </span>
      ),
    },
    {
      id: 'fulfilment',
      header: 'Fulfilment',
      mobile: 'badge',
      sortValue: (row) => deriveOrderSummary(row.shipments).label,
      cell: (row) => (
        <span className="flex items-center gap-2">
          <span className="whitespace-nowrap">{deriveOrderSummary(row.shipments).label}</span>
          {row.shipments.map((shipment) => (
            <StatusBadge key={shipment.id} domain="shipment" status={shipment.status} size="sm" />
          ))}
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title={customer.name}
        documentTitle={`${customer.name} · Customers`}
        breadcrumbs={[{ label: 'Customers', to: '/admin/users' }, { label: customer.name }]}
        badge={<StatusBadge domain="customer" status={customer.status} withTooltip />}
        meta={
          <>
            <span>{maskEmail(customer.email)}</span>
            <span className="tabular">{maskPhone(customer.phone)}</span>
            <span>Joined {formatDate(customer.joinedAt)}</span>
            <span>
              {formatNumber(customer.addresses.length)} saved {pluralize(customer.addresses.length, 'address', 'addresses')}
            </span>
          </>
        }
        actions={
          blocked ? (
            <Button leftIcon={<CircleCheck aria-hidden />} onClick={unblock}>
              Unblock shopper
            </Button>
          ) : (
            <Button
              variant="danger-outline"
              leftIcon={<Ban aria-hidden />}
              onClick={() => {
                setReason(BLOCK_REASONS[0] ?? '')
                setBlocking(true)
              }}
            >
              Block shopper
            </Button>
          )
        }
      />

      {blocked && customer.statusReason ? (
        <section className="flex flex-col gap-1 rounded-card border border-danger-border bg-danger-subtle p-4">
          <h2 className="type-label text-danger-subtle-fg">Why this account is blocked</h2>
          <p className="type-body text-fg">{customer.statusReason}</p>
        </section>
      ) : null}

      <KpiStrip
        showSparklines={false}
        kpis={[
          kpi('orders', 'Orders', detail.orders, 0, 'number'),
          kpi('spend', 'Total spend', detail.spend, 0, 'inr'),
          kpi('returns', 'Return rate', detail.returnRatio, 0, 'percent', { positiveIsGood: false }),
          kpi('reviews', 'Reviews written', detail.reviews.length, 0, 'number'),
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <h2 className="type-title text-fg">Recent orders</h2>
                <p className="type-caption text-fg-muted">Newest first, across every seller.</p>
              </div>
              <Link
                to={`/admin/orders?q=${encodeURIComponent(customer.name)}`}
                className="type-caption text-link hover:underline"
              >
                All orders
              </Link>
            </div>
            <DataTable
              tableId="admin-customer-orders"
              caption={`Orders placed by ${customer.name}`}
              data={detail.recentOrders}
              columns={orderColumns}
              getRowId={(row) => row.order.id}
              rowHref={(row) => `/admin/orders/${row.order.id}`}
              pageSize={10}
              empty={
                <EmptyState
                  icon={<ShoppingCart aria-hidden />}
                  title="No orders yet"
                  description="This shopper has an account but has not bought anything so far."
                />
              }
            />
          </section>

          <SectionCard title="Reviews written" description="What this shopper told other shoppers.">
            {detail.reviews.length === 0 ? (
              <EmptyState
                variant="compact"
                icon={<Star aria-hidden />}
                title="No reviews yet"
                description="Reviews appear here once this shopper rates something they bought."
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border-subtle">
                {detail.reviews.map((review) => (
                  <li key={review.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <Rating value={review.rating} variant="stars" />
                      <span className="type-label text-fg">{review.title}</span>
                      <StatusBadge domain="review" status={review.status} size="sm" />
                    </span>
                    <p className="line-clamp-2 type-body text-fg-muted">{review.body}</p>
                    <p className="type-caption text-fg-subtle">{formatDateTime(review.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-4">
          <SectionCard title="Account">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={customer.name} />
                <div className="flex min-w-0 flex-col">
                  <span className="type-label text-fg">{customer.name}</span>
                  <span className="type-caption text-fg-muted">{maskEmail(customer.email)}</span>
                </div>
              </div>
              <DescriptionList
                items={[
                  { term: 'Mobile', detail: maskPhone(customer.phone) },
                  { term: 'Joined', detail: formatDate(customer.joinedAt) },
                  { term: 'Last order', detail: detail.lastOrderAt ? formatDate(detail.lastOrderAt) : 'Never' },
                  {
                    term: 'Returns',
                    detail: `${formatNumber(detail.returns)} ${pluralize(detail.returns, 'return')} from ${formatNumber(detail.orders)} ${pluralize(detail.orders, 'order')}`,
                  },
                  { term: 'Account id', detail: customer.id, copyValue: customer.id },
                ]}
              />
            </div>
          </SectionCard>

          <SectionCard title="Addresses" description="Where this shopper asks us to deliver.">
            {customer.addresses.length === 0 ? (
              <EmptyState variant="compact" icon={<MapPin aria-hidden />} title="No saved addresses" description="They will add one at checkout." />
            ) : (
              <ul className="flex flex-col divide-y divide-border-subtle">
                {customer.addresses.map((address) => (
                  <li key={address.id} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="type-label text-fg">{address.name}</span>
                      <Badge tone="neutral" size="sm" variant="outline">
                        {address.type === 'home' ? 'Home' : address.type === 'work' ? 'Work' : 'Other'}
                      </Badge>
                      {address.id === customer.defaultAddressId ? (
                        <Badge tone="primary" size="sm">
                          Default
                        </Badge>
                      ) : null}
                    </span>
                    <span className="type-body text-fg-muted">
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.state} {address.pin}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Saved payment methods" description="Cards are tokenised as per RBI rules.">
            {customer.savedPayments.length === 0 ? (
              <EmptyState
                variant="compact"
                icon={<CreditCard aria-hidden />}
                title="Nothing saved"
                description="They enter payment details afresh each time."
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border-subtle">
                {customer.savedPayments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="flex min-w-0 flex-col">
                      <span className="type-body text-fg">
                        {payment.kind === 'upi' ? maskUpi(payment.vpa) : maskCard(payment.last4)}
                      </span>
                      <span className="type-caption text-fg-muted">
                        {payment.kind === 'upi' ? 'UPI ID' : `${payment.network.toUpperCase()} · expires ${payment.expiry}`}
                      </span>
                    </span>
                    {payment.isDefault ? (
                      <Badge tone="primary" size="sm">
                        Default
                      </Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Activity log" description="Every change the marketplace team made.">
            <AuditLog
              entries={audit}
              emptyTitle="Nothing recorded yet"
              emptyDescription="Blocks and unblocks on this account are logged here."
            />
          </SectionCard>
        </div>
      </div>

      <Dialog open={blocking} onOpenChange={setBlocking}>
        <DialogContent
          title={`Block ${customer.name}?`}
          description="They will not be able to place new orders. Existing orders are unaffected."
          footer={
            <>
              <Button variant="outline" onClick={() => setBlocking(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={submitBlock}>
                Block shopper
              </Button>
            </>
          }
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="pb-2 type-label text-fg">Reason</legend>
            <RadioGroup
              aria-label="Reason for blocking"
              variant="card"
              value={reason}
              onValueChange={setReason}
              options={BLOCK_REASONS.map((entry) => ({ value: entry, label: entry }))}
            />
          </fieldset>
        </DialogContent>
      </Dialog>
    </>
  )
}
