import { Ban, Copy, Ellipsis, Package, Printer, RotateCcw, TriangleAlert, Truck } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import {
  COURIER_NAME,
  dbActions,
  getSellerShipmentDetail,
  useDemoQuery,
  type OrderItem,
} from '@/data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/ui/card'
import { DescriptionList } from '@/components/ui/description-list'
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
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { OrderTimeline } from '@/components/commerce/order-timeline'
import { formatDateTime, formatDayShort, formatDueIn, formatINR, formatNumber } from '@/lib/format'
import { buyerDisplayName, maskPhone } from '@/lib/mask'
import { SHIPMENT_PROGRESS, statusMeta } from '@/lib/status'
import { gstBreakup } from '@/lib/tax'
import { CancelDialog, LabelDialog, PackDialog, ReturnDialog, type PackTarget, type ReturnTarget } from '../components/fulfilment-dialogs'
import { SettlementLines } from '../components/settlement-lines'

/** Opening a dialog straight from a menu item fights Radix's focus return; let the menu close first. */
function deferred(run: () => void) {
  window.setTimeout(run, 0)
}

function ItemLine({ item, sku, intraState }: { item: OrderItem; sku: string; intraState: boolean }) {
  const value = item.price * item.qty
  const tax = gstBreakup(value, item.gstRate, { intraState })
  return (
    <li className="flex flex-wrap items-start gap-3 px-4 py-4 sm:px-5">
      <Img image={item.image} alt="" ratio="square" width={64} className="size-16 shrink-0 overflow-hidden rounded-thumb" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="type-label text-fg">{item.title}</p>
        <p className="type-caption text-fg-muted">
          {item.variantLabel ? `${item.variantLabel} · ` : ''}SKU {sku}
        </p>
        <p className="type-caption text-fg-muted">
          Taxable {formatINR(tax.taxable, { decimals: 2 })} ·{' '}
          {intraState
            ? `CGST ${formatINR(tax.cgst, { decimals: 2 })} + SGST ${formatINR(tax.sgst, { decimals: 2 })}`
            : `IGST ${formatINR(tax.igst, { decimals: 2 })}`}{' '}
          at {item.gstRate}% · HSN {item.hsn}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <p className="type-body text-fg tabular">{formatINR(value)}</p>
        <p className="type-caption text-fg-muted tabular">
          {formatNumber(item.qty)} × {formatINR(item.price)}
        </p>
      </div>
    </li>
  )
}

/** One shipment — the parcel this seller packs — with everything needed to send it. */
export default function SellerOrderDetailPage() {
  const { shipmentId = '' } = useParams()
  const navigate = useNavigate()
  const [packTarget, setPackTarget] = useState<PackTarget | null>(null)
  const [cancelTarget, setCancelTarget] = useState<string | null>(null)
  const [returnTarget, setReturnTarget] = useState<ReturnTarget | null>(null)
  const [labelsOpen, setLabelsOpen] = useState(false)

  const query = useDemoQuery(
    (view) => {
      const detail = getSellerShipmentDetail(view, shipmentId)
      if (!detail) return null
      const first = detail.items[0]
      const product = first ? view.productById.get(first.productId) : undefined
      const skus: Record<string, string> = {}
      for (const item of detail.items) {
        const owner = view.productById.get(item.productId)
        skus[item.id] = owner?.variants.find((variant) => variant.id === item.variantId)?.sku ?? item.variantId
      }
      return {
        detail,
        skus,
        packDefault: product
          ? { weightKg: product.weightKg, dimensionsCm: product.dimensionsCm }
          : { weightKg: 0.5, dimensionsCm: [20, 15, 8] as [number, number, number] },
      }
    },
    [shipmentId],
  )

  if (query.status === 'loading') {
    return (
      <>
        <PageHeader title="Order" breadcrumbs={[{ label: 'Seller Hub', to: '/seller' }, { label: 'Orders', to: '/seller/orders' }, { label: shipmentId }]} />
        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-64 w-full rounded-card xl:col-span-2" />
          <Skeleton className="h-64 w-full rounded-card" />
        </div>
      </>
    )
  }

  const data = query.status === 'empty' ? null : query.data
  if (!data) {
    return (
      <>
        <PageHeader
          title="Order not found"
          breadcrumbs={[{ label: 'Seller Hub', to: '/seller' }, { label: 'Orders', to: '/seller/orders' }, { label: shipmentId }]}
        />
        <EmptyState
          icon={<TriangleAlert aria-hidden />}
          title={query.status === 'error' ? 'We couldn’t load this order' : `No order called ${shipmentId}`}
          description={
            query.status === 'error'
              ? 'The order didn’t come back. Try again.'
              : 'Check the id, or open the list and search for the buyer or product.'
          }
          action={
            query.status === 'error' ? (
              <Button onClick={query.retry}>Retry</Button>
            ) : (
              <Button asChild>
                <Link to="/seller/orders">Back to orders</Link>
              </Button>
            )
          }
        />
      </>
    )
  }

  const { detail, packDefault, skus } = data
  const { shipment, order, seller, items, earnings } = detail
  const index = order.shipmentIds.indexOf(shipment.id) + 1
  const total = order.shipmentIds.length
  const intraState = (seller?.stateCode ?? '') === order.shipTo.stateCode
  const statusIndex = SHIPMENT_PROGRESS.indexOf(shipment.status)
  const upcoming =
    shipment.status === 'cancelled' || statusIndex < 0
      ? []
      : SHIPMENT_PROGRESS.slice(statusIndex + 1).map((code) => ({ code, label: statusMeta('shipment', code).label }))

  const confirm = () => {
    const result = dbActions.confirmShipment(shipment.id)
    if (!result.ok) {
      toast.error('Could not confirm this order', { description: result.error })
      return
    }
    toast.success('Order confirmed', { description: `Pack it by ${formatDayShort(shipment.slaDueAt)}.` })
  }

  const handOver = () => {
    const result = dbActions.handOverShipment(shipment.id)
    if (!result.ok) {
      toast.error('Could not hand this order over', { description: result.error })
      return
    }
    toast.success(`Handed over to ${COURIER_NAME}`, { description: 'The AWB is now on this order and the shopper can track it.' })
  }

  const nextAction =
    shipment.status === 'placed' ? (
      <Button onClick={confirm}>Confirm order</Button>
    ) : shipment.status === 'confirmed' ? (
      <Button leftIcon={<Package aria-hidden />} onClick={() => setPackTarget({ shipmentId: shipment.id, ...packDefault })}>
        Mark as packed
      </Button>
    ) : shipment.status === 'packed' ? (
      <Button leftIcon={<Truck aria-hidden />} onClick={handOver}>
        Hand over to {COURIER_NAME}
      </Button>
    ) : null

  const canCancel = shipment.status === 'placed' || shipment.status === 'confirmed' || shipment.status === 'packed'

  return (
    <>
      <PageHeader
        title={shipment.id}
        documentTitle={`Order ${shipment.id}`}
        breadcrumbs={[
          { label: 'Seller Hub', to: '/seller' },
          { label: 'Orders', to: '/seller/orders' },
          { label: shipment.id },
        ]}
        badge={<StatusBadge domain="shipment" status={shipment.status} withTooltip />}
        meta={
          <>
            <span>
              Part of customer order {order.id} · {index} of {total} {total === 1 ? 'shipment' : 'shipments'}
            </span>
            <span>Placed {formatDateTime(order.placedAt)}</span>
            {shipment.status === 'placed' || shipment.status === 'confirmed' || shipment.status === 'packed' ? (
              <span className={detail.overdue ? 'font-semibold text-danger-subtle-fg' : undefined}>
                {formatDueIn(shipment.slaDueAt)} · dispatch by {formatDayShort(shipment.slaDueAt)}
              </span>
            ) : (
              <span>Delivery promised by {formatDayShort(shipment.promisedBy)}</span>
            )}
          </>
        }
        actions={
          <>
            {nextAction}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton label={`More actions for ${shipment.id}`} variant="outline" icon={<Ellipsis aria-hidden />} />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem icon={<Printer aria-hidden />} onSelect={() => deferred(() => setLabelsOpen(true))}>
                  Print label
                </DropdownMenuItem>
                <DropdownMenuItem
                  icon={<Copy aria-hidden />}
                  onSelect={() => {
                    void navigator.clipboard?.writeText(shipment.id)
                    toast.success('Order id copied')
                  }}
                >
                  Copy order id
                </DropdownMenuItem>
                <DropdownMenuItem icon={<Truck aria-hidden />} onSelect={() => void navigate('/seller/orders')}>
                  Back to all orders
                </DropdownMenuItem>
                {canCancel ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem destructive icon={<Ban aria-hidden />} onSelect={() => deferred(() => setCancelTarget(shipment.id))}>
                      Cancel order
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {shipment.status === 'cancelled' ? (
        <p className="rounded-card border border-danger-border bg-danger-subtle p-4 type-body text-danger-subtle-fg">
          Cancelled by {shipment.cancelledBy === 'seller' ? 'you' : shipment.cancelledBy === 'customer' ? 'the shopper' : 'Chowk'}
          {shipment.cancelReason ? ` — ${shipment.cancelReason}` : '.'} Stock has been returned to your inventory.
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="flex flex-col gap-4 xl:col-span-2">
          <SectionCard
            title={`Items (${formatNumber(detail.units)} ${detail.units === 1 ? 'unit' : 'units'})`}
            description="Prices include GST. The tax split follows the buyer's state."
            flush
          >
            <ul className="divide-y divide-border-subtle">
              {items.map((item) => (
                <ItemLine key={item.id} item={item} sku={skus[item.id] ?? item.variantId} intraState={intraState} />
              ))}
            </ul>
            <div className="flex items-center justify-between gap-3 border-t border-border-subtle px-4 py-3 sm:px-5">
              <span className="type-label text-fg">Order value</span>
              <span className="type-price text-fg">{formatINR(shipment.totals.total)}</span>
            </div>
          </SectionCard>

          <SectionCard title="Timeline" description="Every step the shopper sees, in the same words.">
            <OrderTimeline events={shipment.events} upcoming={upcoming} />
          </SectionCard>

          <SectionCard
            title="Package"
            description={
              shipment.awb
                ? `Handed over to ${shipment.courier ?? COURIER_NAME}.`
                : 'Weight and size are filled from the listing when you pack.'
            }
            actions={
              <Button size="sm" variant="outline" leftIcon={<Printer aria-hidden />} onClick={() => setLabelsOpen(true)}>
                Print label
              </Button>
            }
          >
            <DescriptionList
              columns={2}
              items={[
                {
                  term: 'Weight',
                  detail: shipment.package ? `${shipment.package.weightKg} kg` : `${packDefault.weightKg} kg (from the listing)`,
                },
                {
                  term: 'Box size',
                  detail: shipment.package
                    ? `${shipment.package.dimensionsCm.join(' × ')} cm`
                    : `${packDefault.dimensionsCm.join(' × ')} cm (from the listing)`,
                },
                { term: 'Courier', detail: shipment.courier ?? `${COURIER_NAME} · assigned at hand-over` },
                {
                  term: 'AWB',
                  detail: shipment.awb ?? 'Created when you hand the parcel over',
                  ...(shipment.awb ? { copyValue: shipment.awb } : {}),
                },
              ]}
            />
          </SectionCard>

          {detail.return ? (
            <SectionCard
              title="Return request"
              description={`Raised ${formatDateTime(detail.return.requestedAt)}.`}
              actions={<StatusBadge domain="return" status={detail.return.status} withTooltip />}
              footer={
                detail.return.status === 'requested' ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="type-caption text-fg-muted">Decide within 48 hours, or Chowk approves it for you.</span>
                    <Button
                      size="sm"
                      leftIcon={<RotateCcw aria-hidden />}
                      onClick={() =>
                        setReturnTarget({
                          returnId: detail.return?.id ?? '',
                          shipmentId: shipment.id,
                          reason: detail.return?.reason ?? '',
                          refundAmount: detail.return?.refundAmount ?? 0,
                        })
                      }
                    >
                      Decide return
                    </Button>
                  </div>
                ) : undefined
              }
            >
              <DescriptionList
                items={[
                  { term: 'Reason', detail: detail.return.reason },
                  ...(detail.return.details ? [{ term: 'What the shopper said', detail: detail.return.details }] : []),
                  { term: 'Refund', detail: `${formatINR(detail.return.refundAmount)} to the ${detail.return.refundTo === 'upi' ? 'shopper’s UPI ID' : 'original payment method'}` },
                  ...(detail.return.rejectionReason ? [{ term: 'Your reason for rejecting', detail: detail.return.rejectionReason }] : []),
                ]}
              />
            </SectionCard>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 xl:col-span-1">
          <SectionCard title="Buyer" description="Chowk masks the shopper's name and number.">
            <DescriptionList
              items={[
                { term: 'Ships to', detail: buyerDisplayName(order.shipTo.name, order.shipTo.city) },
                {
                  term: 'Address',
                  detail: [order.shipTo.line1, order.shipTo.line2, order.shipTo.city, order.shipTo.state].filter(Boolean).join(', '),
                },
                { term: 'PIN code', detail: order.shipTo.pin, copyValue: order.shipTo.pin },
                { term: 'Mobile', detail: maskPhone(order.shipTo.phone) },
              ]}
            />
          </SectionCard>

          <SectionCard title="Payment" actions={<StatusBadge domain="payment" status={order.payment.status} size="sm" withTooltip />}>
            <DescriptionList
              items={[
                { term: 'Method', detail: detail.prepaid ? 'Prepaid' : 'Cash on delivery' },
                { term: 'Reference', detail: order.payment.txnRef, copyValue: order.payment.txnRef },
                ...(detail.prepaid
                  ? []
                  : [{ term: 'Collect on delivery', detail: `${formatINR(shipment.totals.total)} in cash` }]),
              ]}
            />
            {detail.prepaid ? null : (
              <p className="mt-3 rounded-card border border-warning-border bg-warning-subtle p-3 type-caption text-warning-subtle-fg">
                {COURIER_NAME} collects {formatINR(shipment.totals.total)} at the door and Chowk settles it with your payout.
              </p>
            )}
          </SectionCard>

          <SectionCard
            title="What you earn"
            description="The same maths your payout statement uses."
            footer={
              detail.payout ? (
                <Link to="/seller/payouts" className="type-caption text-link hover:underline">
                  Settled in payout {detail.payout.id}
                </Link>
              ) : (
                <span className="type-caption text-fg-muted">Settled seven days after delivery, paid on the next Tuesday.</span>
              )
            }
          >
            <SettlementLines
              lines={earnings.lines}
              net={earnings.net}
              netLabel="You earn"
              caption={`Settlement for ${shipment.id}`}
            />
            {detail.couponFundedByPlatform ? (
              <p className="mt-3 flex items-start gap-2 rounded-card border border-success-border bg-success-subtle p-3 type-caption text-success-subtle-fg">
                <Badge tone="success" size="sm">Chowk pays</Badge>
                <span>
                  {formatINR(shipment.totals.coupon)} coupon funded by Chowk — doesn’t reduce your payout.
                </span>
              </p>
            ) : null}
          </SectionCard>
        </div>
      </div>

      <PackDialog target={packTarget} onClose={() => setPackTarget(null)} />
      <CancelDialog shipmentId={cancelTarget} onClose={() => setCancelTarget(null)} />
      <ReturnDialog target={returnTarget} onClose={() => setReturnTarget(null)} />
      <LabelDialog
        title="Shipping label"
        open={labelsOpen}
        onOpenChange={setLabelsOpen}
        from={seller ? `${seller.displayName}, ${seller.pickupAddress.line1}, ${seller.city} ${seller.pickupAddress.pin}` : 'Your pickup address'}
        rows={[
          {
            shipmentId: shipment.id,
            orderId: order.id,
            buyer: buyerDisplayName(order.shipTo.name, order.shipTo.city),
            pin: order.shipTo.pin,
            items: items.map((item) => `${item.title} × ${item.qty}`).join(', '),
            amount: shipment.totals.total,
            prepaid: detail.prepaid,
            ...(shipment.awb ? { awb: shipment.awb } : {}),
          },
        ]}
      />
    </>
  )
}
