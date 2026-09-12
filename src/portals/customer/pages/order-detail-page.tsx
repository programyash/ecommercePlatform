import { Ellipsis, PackageSearch, Printer, RotateCcw, Store, TriangleAlert, Truck } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { COURIER_NAME, getOrderDetail, useDemoQuery } from '@/data'
import { Button } from '@/components/ui/button'
import { DescriptionList } from '@/components/ui/description-list'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { IconButton } from '@/components/ui/icon-button'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { Img } from '@/components/ui/img'
import { OrderSummary } from '@/components/commerce/order-summary'
import { formatDate, formatDateTime, formatDayShort, formatINR, pluralWithCount } from '@/lib/format'
import { PAYMENT_METHOD_META } from '@/lib/status'
import { buyAgain } from '../components/account/buy-again'
import { OrderInvoice } from '../components/account/invoice'
import { CancelShipmentDialog, ReturnDialog, ReviewDialog } from '../components/account/order-dialogs'
import { ShipmentTracker } from '../components/account/shipment-tracker'

/** One order in full: a tracker per parcel, what you can still do, and the invoice. */
export default function OrderDetailPage() {
  const { orderId = '' } = useParams()
  const navigate = useNavigate()
  const query = useDemoQuery((view) => getOrderDetail(view, orderId), [orderId])

  const [cancelId, setCancelId] = useState<string | null>(null)
  const [returnId, setReturnId] = useState<string | null>(null)
  const [reviewId, setReviewId] = useState<string | null>(null)

  if (query.status === 'error') {
    return (
      <>
        <PageHeader title="Order details" breadcrumbs={[{ label: 'My account', to: '/account' }, { label: 'Orders', to: '/account/orders' }, { label: orderId }]} />
        <div className="rounded-card border border-border bg-surface">
          <EmptyState
            icon={<TriangleAlert aria-hidden />}
            title="We couldn’t load this order"
            description="Something went wrong on our side. Try again in a moment."
            action={<Button onClick={query.retry}>Retry</Button>}
          />
        </div>
      </>
    )
  }

  if (query.status === 'loading') {
    return (
      <>
        <PageHeader title="Order details" />
        <Skeleton className="h-64 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
      </>
    )
  }

  // `?demo=empty` forces the not-found state; a real miss returns null too.
  const order = query.status === 'empty' ? null : query.data
  if (!order) {
    return (
      <>
        <PageHeader
          title="We couldn’t find that order"
          breadcrumbs={[{ label: 'My account', to: '/account' }, { label: 'Orders', to: '/account/orders' }, { label: orderId }]}
        />
        <div className="rounded-card border border-border bg-surface">
          <EmptyState
            icon={<PackageSearch aria-hidden />}
            title={`No order matches ${orderId || 'this link'}`}
            description="The link may be old, or the order may belong to another account."
            action={
              <Button asChild>
                <Link to="/account/orders">Back to your orders</Link>
              </Button>
            }
          />
        </div>
      </>
    )
  }

  const prepaid = order.order.payment.method !== 'cod'
  const cancelEntry = order.shipments.find((entry) => entry.shipment.id === cancelId)
  const returnEntry = order.shipments.find((entry) => entry.shipment.id === returnId)
  const reviewEntry = order.shipments.find((entry) => entry.shipment.id === reviewId)

  const onBuyAgain = () => {
    const result = buyAgain(order)
    if (result.added === 0) {
      toast.message('Nothing could be added', { description: 'These items are no longer on sale.' })
      return
    }
    toast.success(`${pluralWithCount(result.added, 'item')} added to your bag`, {
      description: result.unavailable > 0 ? `${result.unavailable} could not be added.` : 'Ready when you are.',
      action: { label: 'View bag', onClick: () => void navigate('/cart') },
    })
  }

  return (
    <>
      <div className="flex flex-col gap-5 print:hidden">
        <PageHeader
          title={`Order ${order.order.id}`}
          documentTitle={`Order ${order.order.id}`}
          breadcrumbs={[
            { label: 'My account', to: '/account' },
            { label: 'Orders', to: '/account/orders' },
            { label: order.order.id },
          ]}
          description={
            // Past tense only once everything has actually landed.
            order.shipments.length > 1
              ? `This order ${order.shipments.every((entry) => entry.shipment.status === 'delivered') ? 'arrived' : 'comes'} in ${pluralWithCount(order.shipments.length, 'parcel')}, one from each seller. ${order.summary.label}.`
              : order.summary.label
          }
          meta={
            <>
              <span>Placed {formatDateTime(order.order.placedAt)}</span>
              <span>{pluralWithCount(order.units, 'item')}</span>
              <span>{formatINR(order.order.totals.total)}</span>
            </>
          }
          actions={
            <>
              <Button variant="outline" leftIcon={<Printer aria-hidden />} onClick={() => window.print()}>
                Print invoice
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton label={`More actions for ${order.order.id}`} variant="outline" icon={<Ellipsis aria-hidden />} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem icon={<RotateCcw aria-hidden />} onSelect={onBuyAgain}>
                    Buy it again
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    icon={<PackageSearch aria-hidden />}
                    onSelect={() => {
                      void navigator.clipboard?.writeText(order.order.id)
                      toast.success('Order id copied')
                    }}
                  >
                    Copy order id
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        />

        <div className="grid items-start gap-4 xl:grid-cols-12">
          <div className="flex flex-col gap-4 xl:col-span-8">
            {order.shipments.map((entry, index) => (
              <SectionCard
                key={entry.shipment.id}
                title={
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Store aria-hidden className="size-4 text-fg-muted" />
                    {order.shipments.length > 1 ? `Shipment ${index + 1} of ${order.shipments.length} · ` : ''}
                    {entry.seller ? (
                      <Link to={`/store/${entry.seller.slug}`} className="text-link hover:underline">
                        {entry.seller.displayName}
                      </Link>
                    ) : (
                      'Seller'
                    )}
                  </span>
                }
                description={
                  entry.shipment.status === 'delivered'
                    ? `${entry.shipment.id} · delivered${entry.shipment.deliveredAt ? ` on ${formatDayShort(entry.shipment.deliveredAt)}` : ''}`
                    : entry.shipment.status === 'cancelled'
                      ? `${entry.shipment.id} · ${entry.shipment.cancelReason ?? 'cancelled'}`
                      : `${entry.shipment.id} · arriving by ${formatDayShort(entry.shipment.promisedBy)}`
                }
                actions={
                  <span className="flex flex-wrap items-center gap-2">
                    {entry.return ? <StatusBadge domain="return" status={entry.return.status} size="sm" /> : null}
                    <StatusBadge domain="shipment" status={entry.shipment.status} />
                  </span>
                }
              >
                <div className="flex flex-col gap-5">
                  <ShipmentTracker shipment={entry.shipment} />

                  {entry.shipment.awb ? (
                    <p className="flex flex-wrap items-center gap-2 rounded-control border border-border bg-surface-2 px-3 py-2 type-caption text-fg-muted">
                      <Truck aria-hidden className="size-4 shrink-0" />
                      <span>
                        {entry.shipment.courier ?? COURIER_NAME} · AWB{' '}
                        <span className="type-code text-fg">{entry.shipment.awb}</span>
                      </span>
                    </p>
                  ) : null}

                  <ul className="flex flex-col gap-3">
                    {entry.items.map((item) => (
                      <li key={item.id} className="flex items-start gap-3">
                        <Img
                          image={item.image}
                          alt={item.title}
                          ratio="square"
                          width={160}
                          sizes="64px"
                          className="w-16 shrink-0 rounded-card ring-1 ring-border"
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <p className="line-clamp-2 type-body text-fg">{item.title}</p>
                          <p className="type-caption text-fg-muted">
                            {item.variantLabel ? `${item.variantLabel} · ` : ''}Quantity {item.qty} · GST {item.gstRate}%
                          </p>
                        </div>
                        <p className="shrink-0 type-body text-fg tabular">{formatINR(item.price * item.qty)}</p>
                      </li>
                    ))}
                  </ul>

                  {entry.return ? (
                    <div className="flex flex-col gap-1 rounded-control border border-border bg-surface-2 px-3 py-2.5">
                      <p className="type-label text-fg">Return · {entry.return.reason}</p>
                      <p className="type-caption text-fg-muted">
                        Raised {formatDate(entry.return.requestedAt)} · refund of{' '}
                        {formatINR(entry.return.refundAmount)} to{' '}
                        {entry.return.refundTo === 'upi' ? 'your UPI ID' : 'the original payment method'}
                      </p>
                      {entry.return.rejectionReason ? (
                        <p className="type-caption text-danger-subtle-fg">{entry.return.rejectionReason}</p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    {entry.canCancel ? (
                      <Button variant="danger-outline" size="sm" onClick={() => setCancelId(entry.shipment.id)}>
                        Cancel shipment
                      </Button>
                    ) : null}
                    {entry.canReturn ? (
                      <Button variant="outline" size="sm" onClick={() => setReturnId(entry.shipment.id)}>
                        Return items
                      </Button>
                    ) : null}
                    {entry.shipment.status === 'delivered' ? (
                      <Button variant="outline" size="sm" onClick={() => setReviewId(entry.shipment.id)}>
                        Rate and review
                      </Button>
                    ) : null}
                    {entry.shipment.status === 'delivered' && !entry.canReturn && !entry.return ? (
                      <p className="type-caption text-fg-muted">The return window for this parcel has closed.</p>
                    ) : null}
                    {entry.shipment.status === 'packed' || entry.shipment.status === 'shipped' ? (
                      <p className="type-caption text-fg-muted">
                        This parcel is past the point where it can be cancelled — you can return it after delivery.
                      </p>
                    ) : null}
                  </div>
                </div>
              </SectionCard>
            ))}
          </div>

          <div className="flex flex-col gap-4 xl:col-span-4">
            <OrderSummary
              lines={[
                { label: `Price (${pluralWithCount(order.units, 'item')})`, amount: order.order.totals.mrp },
                ...(order.order.totals.discount > 0
                  ? [{ label: 'Discount', amount: order.order.totals.discount, kind: 'discount' as const }]
                  : []),
                ...(order.order.totals.coupon > 0
                  ? [
                      {
                        label: order.order.couponCode ? `Coupon ${order.order.couponCode}` : 'Coupon',
                        amount: order.order.totals.coupon,
                        kind: 'discount' as const,
                      },
                    ]
                  : []),
                {
                  label: 'Delivery',
                  amount: order.order.totals.shipping,
                  kind: order.order.totals.shipping === 0 ? ('free' as const) : ('default' as const),
                },
                ...(order.order.totals.codFee > 0
                  ? [{ label: 'Cash on delivery fee', amount: order.order.totals.codFee }]
                  : []),
              ]}
              total={order.order.totals.total}
              totalLabel="Order total"
              note="Inclusive of all taxes."
            />

            <SectionCard title="Payment" actions={<StatusBadge domain="payment" status={order.order.payment.status} size="sm" />}>
              <DescriptionList
                items={[
                  { term: 'Method', detail: PAYMENT_METHOD_META[order.order.payment.method].label },
                  { term: 'Paid with', detail: order.order.payment.detail },
                  { term: 'Reference', detail: order.order.payment.txnRef, copyValue: order.order.payment.txnRef },
                  ...(order.order.payment.paidAt
                    ? [{ term: 'Paid on', detail: formatDateTime(order.order.payment.paidAt) }]
                    : []),
                  ...order.order.payment.refunds.map((refund) => ({
                    term: refund.status === 'processed' ? 'Refunded' : 'Refund initiated',
                    detail: `${formatINR(refund.amount)} · ${formatDate(refund.at)}`,
                  })),
                ]}
              />
              {order.order.payment.failureReason ? (
                <p className="mt-3 type-caption text-danger-subtle-fg">{order.order.payment.failureReason}</p>
              ) : null}
            </SectionCard>

            <SectionCard title="Delivery address">
              <address className="flex flex-col gap-1 not-italic type-body text-fg-muted">
                <span className="type-label text-fg">{order.order.shipTo.name}</span>
                <span>
                  {order.order.shipTo.line1}
                  {order.order.shipTo.line2 ? `, ${order.order.shipTo.line2}` : ''}
                  {order.order.shipTo.landmark ? `, near ${order.order.shipTo.landmark}` : ''}
                </span>
                <span>
                  {order.order.shipTo.city}, {order.order.shipTo.state} {order.order.shipTo.pin}
                </span>
              </address>
            </SectionCard>

            {order.order.billing ? (
              <SectionCard title="GST invoice">
                <DescriptionList
                  items={[
                    { term: 'Business', detail: order.order.billing.businessName },
                    { term: 'GSTIN', detail: order.order.billing.gstin, copyValue: order.order.billing.gstin },
                  ]}
                />
              </SectionCard>
            ) : null}

            <SectionCard title="Need help?" description="Every seller replies within one working day.">
              <p className="type-body text-fg-muted">
                Write to {order.sellers[0]?.displayName ?? 'the seller'} from their store page, or reach the
                marketplace team at <span className="text-fg">help@chowk.example</span>.
              </p>
            </SectionCard>
          </div>
        </div>
      </div>

      <OrderInvoice order={order} />

      {cancelEntry ? (
        <CancelShipmentDialog
          open
          onOpenChange={(next) => !next && setCancelId(null)}
          entry={cancelEntry}
          prepaid={prepaid}
        />
      ) : null}
      {returnEntry ? (
        <ReturnDialog open onOpenChange={(next) => !next && setReturnId(null)} entry={returnEntry} prepaid={prepaid} />
      ) : null}
      {reviewEntry ? (
        <ReviewDialog open onOpenChange={(next) => !next && setReviewId(null)} items={reviewEntry.items} />
      ) : null}
    </>
  )
}
