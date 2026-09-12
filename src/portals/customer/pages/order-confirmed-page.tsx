import { ArrowRight, CircleCheck, PackageSearch, Store } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { getOrderDetail, useDemoQuery } from '@/data'
import { Button } from '@/components/ui/button'
import { DescriptionList } from '@/components/ui/description-list'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { Img } from '@/components/ui/img'
import { formatDateTime, formatDayShort, formatINR, pluralWithCount } from '@/lib/format'
import { PAYMENT_METHOD_META } from '@/lib/status'

/** The receipt: what was ordered, when each parcel arrives, and where to watch it. */
export default function OrderConfirmedPage() {
  const { orderId = '' } = useParams()
  const query = useDemoQuery((view) => getOrderDetail(view, orderId), [orderId])

  if (query.status === 'loading') {
    return (
      <div className="mx-auto flex max-w-shop flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader title="Order placed" documentTitle="Order placed" />
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-48 rounded-card" />
      </div>
    )
  }

  // `?demo=empty` forces the not-found state; a real miss returns null too.
  const order = query.status === 'empty' ? null : query.data
  if (!order) {
    return (
      <div className="mx-auto max-w-shop px-4 py-10 sm:px-6 lg:px-8">
        <PageHeader title="We couldn’t find that order" description={`No order matches ${orderId || 'this link'}.`} />
        <div className="mt-4 rounded-card border border-border bg-surface">
          <EmptyState
            icon={<PackageSearch aria-hidden />}
            title="Nothing to show here"
            description="The link may be old, or the order may belong to another account."
            action={
              <Button asChild>
                <Link to="/account/orders">View your orders</Link>
              </Button>
            }
            secondaryAction={
              <Button variant="outline" asChild>
                <Link to="/">Continue shopping</Link>
              </Button>
            }
          />
        </div>
      </div>
    )
  }

  const firstName = order.order.shipTo.name.split(' ')[0] ?? 'there'
  const shipments = [...order.shipments].sort((a, b) =>
    a.shipment.promisedBy < b.shipment.promisedBy ? -1 : 1,
  )
  const first = shipments[0]
  const isCod = order.order.payment.method === 'cod'

  return (
    <div className="mx-auto flex max-w-shop flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-4 rounded-card border border-success-border bg-success-subtle p-5 sm:p-6">
        <span aria-hidden className="grid size-11 place-items-center rounded-full bg-success text-success-fg">
          <CircleCheck className="size-6" />
        </span>
        <PageHeader
          title={`Thanks, ${firstName} — your order is placed`}
          documentTitle={`Order ${order.order.id} placed`}
          description={
            <>
              Order {order.order.id} will arrive in {pluralWithCount(shipments.length, 'shipment')}.
              {first ? ` The first reaches you by ${formatDayShort(first.shipment.promisedBy)}.` : ''}
              {isCod ? ` Keep ${formatINR(order.order.totals.total)} ready for the delivery partner.` : ''}
            </>
          }
          actions={
            <>
              <Button asChild>
                <Link to={`/account/orders/${order.order.id}`}>Track order</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">Continue shopping</Link>
              </Button>
            </>
          }
        />
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-8">
          {shipments.map((entry, index) => (
            <SectionCard
              key={entry.shipment.id}
              title={
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Store aria-hidden className="size-4 text-fg-muted" />
                  {shipments.length > 1 ? `Shipment ${index + 1} of ${shipments.length} · ` : ''}
                  {entry.seller ? (
                    <Link to={`/store/${entry.seller.slug}`} className="text-link hover:underline">
                      {entry.seller.displayName}
                    </Link>
                  ) : (
                    'Seller'
                  )}
                </span>
              }
              description={`${entry.shipment.id} · delivery by ${formatDayShort(entry.shipment.promisedBy)}`}
              actions={<StatusBadge domain="shipment" status={entry.shipment.status} size="sm" />}
            >
              <ul className="flex flex-col gap-3">
                {entry.items.map((item) => (
                  <li key={item.id} className="flex items-start gap-3">
                    <Img image={item.image} alt={item.title} ratio="square" width={120} sizes="56px" className="w-14 shrink-0 rounded-card" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="line-clamp-2 type-body text-fg">{item.title}</p>
                      <p className="type-caption text-fg-muted">
                        {item.variantLabel ? `${item.variantLabel} · ` : ''}Quantity {item.qty}
                      </p>
                    </div>
                    <p className="shrink-0 type-body text-fg tabular">{formatINR(item.price * item.qty)}</p>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ))}
        </div>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <SectionCard title="Order details">
            <DescriptionList
              items={[
                { term: 'Order id', detail: order.order.id, copyValue: order.order.id },
                { term: 'Placed', detail: formatDateTime(order.order.placedAt) },
                {
                  term: 'Payment',
                  // COD has no instrument to name, so `detail` repeats the method — say it once.
                  detail: [PAYMENT_METHOD_META[order.order.payment.method].label, order.order.payment.detail]
                    .filter((part, index, parts) => part && parts.indexOf(part) === index)
                    .join(' · '),
                },
                { term: 'Amount', detail: formatINR(order.order.totals.total) },
                ...(order.order.billing
                  ? [{ term: 'GST invoice', detail: `${order.order.billing.businessName} · ${order.order.billing.gstin}` }]
                  : []),
              ]}
            />
          </SectionCard>

          <SectionCard title="Delivery address">
            <address className="flex flex-col gap-1 not-italic type-body text-fg-muted">
              <span className="type-label text-fg">{order.order.shipTo.name}</span>
              <span>
                {order.order.shipTo.line1}
                {order.order.shipTo.line2 ? `, ${order.order.shipTo.line2}` : ''}
              </span>
              <span>
                {order.order.shipTo.city}, {order.order.shipTo.state} {order.order.shipTo.pin}
              </span>
            </address>
          </SectionCard>

          <SectionCard
            title="See the other side"
            description="This order has already landed in the seller's dispatch queue."
          >
            <Button variant="outline" size="sm" rightIcon={<ArrowRight aria-hidden />} asChild>
              <Link to={first ? `/seller/orders/${first.shipment.id}` : '/seller/orders'}>Open Seller Hub</Link>
            </Button>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
