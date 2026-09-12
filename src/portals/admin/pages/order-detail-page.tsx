import { Ban, Copy, Ellipsis, NotebookPen, Truck, Undo2, User } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import {
  DEMO_NOW,
  dbActions,
  getAuditLog,
  getOrderDetail,
  getSellerShipmentDetail,
  useDemoQuery,
  type ReturnRequest,
  type ShipmentStatus,
} from '@/data'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DescriptionList } from '@/components/ui/description-list'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { IconButton } from '@/components/ui/icon-button'
import { Img } from '@/components/ui/img'
import { PageHeader } from '@/components/ui/page-header'
import { RadioGroup } from '@/components/ui/radio-group'
import { SectionCard } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { Textarea } from '@/components/ui/input'
import { OrderTimeline } from '@/components/commerce/order-timeline'
import { formatDate, formatDateTime, formatINR, formatNumber, formatRelative, pluralize } from '@/lib/format'
import { maskEmail, maskPhone } from '@/lib/mask'
import { PAYMENT_METHOD_META, deriveOrderSummary, statusOptions } from '@/lib/status'
import { gstAmount } from '@/lib/tax'
import { AuditLog } from '../components/audit-log'
import { LoadFailed, RecordNotFound } from '../components/record-states'

type DialogState =
  | { kind: 'note' }
  | { kind: 'refund' }
  | { kind: 'cancel-order' }
  | { kind: 'update'; shipmentId: string }
  | { kind: 'cancel-shipment'; shipmentId: string }
  | null

const CANCEL_REASONS = [
  'Shopper asked us to cancel the order.',
  'The seller cannot fulfil this order.',
  'Payment could not be confirmed.',
  'Address is outside the serviceable area.',
]

/** Deferring keeps Radix's focus return away from the dialog that is opening. */
function deferred(run: () => void) {
  window.setTimeout(run, 0)
}

/** One order, every shipment inside it, and the levers support staff actually need. */
export default function AdminOrderDetailPage() {
  const params = useParams()
  const orderId = params.orderId ?? ''
  const [dialog, setDialog] = useState<DialogState>(null)
  const [note, setNote] = useState('')
  const [reason, setReason] = useState(CANCEL_REASONS[0] ?? '')
  const [nextStatus, setNextStatus] = useState<ShipmentStatus>('confirmed')
  const [refundId, setRefundId] = useState('')

  const query = useDemoQuery(
    (view) => {
      const detail = getOrderDetail(view, orderId, DEMO_NOW)
      if (!detail) return null
      const ids = new Set<string>([detail.order.id, ...detail.order.shipmentIds])
      return {
        detail,
        customer: view.customerById.get(detail.order.customerId),
        shipments: detail.shipments.map((entry) => ({
          ...entry,
          settlement: getSellerShipmentDetail(view, entry.shipment.id, DEMO_NOW),
        })),
        audit: getAuditLog(view, { limit: 200 }).filter((entry) => ids.has(entry.targetId)),
      }
    },
    [orderId],
  )

  const crumbs = [{ label: 'Orders', to: '/admin/orders' }, { label: orderId }]

  if (query.status === 'error') {
    return (
      <>
        <PageHeader title="Order details" breadcrumbs={crumbs} />
        <LoadFailed title="We couldn’t load this order" onRetry={query.retry} />
      </>
    )
  }

  if (query.status === 'loading') {
    return (
      <>
        <PageHeader title="Order details" breadcrumbs={crumbs} />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 w-full rounded-card lg:col-span-2" />
          <Skeleton className="h-72 w-full rounded-card" />
        </div>
      </>
    )
  }

  if (query.status === 'empty' || !query.data) {
    return (
      <>
        <PageHeader title="Order not found" breadcrumbs={crumbs} />
        <RecordNotFound
          title="We couldn’t find that order"
          description={`No order on the marketplace has the id “${orderId}”. Check the id, or search the order list.`}
          backTo="/admin/orders"
          backLabel="Back to orders"
        />
      </>
    )
  }

  const { detail, customer, shipments, audit } = query.data
  const order = detail.order
  const summary = deriveOrderSummary(detail.shipments.map((entry) => entry.shipment))
  const refundable = detail.shipments
    .map((entry) => entry.return)
    .filter(
      (request): request is ReturnRequest =>
        request !== undefined && request.status !== 'refunded' && request.status !== 'rejected',
    )
  const cancellable = detail.shipments.filter((entry) => entry.canCancel)

  const close = () => setDialog(null)

  const openUpdate = (shipmentId: string, current: ShipmentStatus) => {
    setNote('')
    setNextStatus(current)
    setDialog({ kind: 'update', shipmentId })
  }

  const submitNote = () => {
    const text = note.trim()
    if (!text) return
    dbActions.addOrderNote(order.id, text)
    close()
    setNote('')
    toast.success('Note added', { description: 'Only the marketplace team can see internal notes.' })
  }

  const submitOverride = () => {
    if (dialog?.kind !== 'update') return
    const text = note.trim()
    if (!text) return
    const result = dbActions.overrideShipmentStatus(dialog.shipmentId, nextStatus, text)
    close()
    setNote('')
    if (result.ok) {
      toast.success('Shipment status updated', { description: `${dialog.shipmentId} · the shopper has been told.` })
    } else {
      toast.error('That status could not be set', { description: result.error })
    }
  }

  const submitCancelShipment = () => {
    if (dialog?.kind !== 'cancel-shipment') return
    const result = dbActions.cancelShipment(dialog.shipmentId, { by: 'platform', reason })
    close()
    if (result.ok) {
      toast.success('Shipment cancelled', { description: `${dialog.shipmentId} · stock has gone back on sale.` })
    } else {
      toast.error('That shipment could not be cancelled', { description: result.error })
    }
  }

  const submitCancelOrder = () => {
    let cancelled = 0
    for (const entry of cancellable) {
      if (dbActions.cancelShipment(entry.shipment.id, { by: 'platform', reason }).ok) cancelled += 1
    }
    close()
    if (cancelled > 0) {
      toast.success(`${cancelled} ${pluralize(cancelled, 'shipment')} cancelled`, {
        description: 'Prepaid amounts have been sent for refund.',
      })
    } else {
      toast.error('Nothing could be cancelled', { description: 'Every shipment has gone too far to cancel.' })
    }
  }

  const submitRefund = () => {
    if (!refundId) return
    const result = dbActions.refundReturn(refundId)
    close()
    if (result.ok) {
      toast.success('Refund completed', { description: 'The money is on its way back to the shopper.' })
    } else {
      toast.error('That refund could not be raised', { description: result.error })
    }
  }

  return (
    <>
      <PageHeader
        title={order.id}
        documentTitle={`${order.id} · Orders`}
        breadcrumbs={crumbs}
        description={`${summary.label} · ${formatNumber(detail.shipments.length)} ${pluralize(detail.shipments.length, 'shipment')} from ${formatNumber(detail.sellers.length)} ${pluralize(detail.sellers.length, 'seller')}.`}
        meta={
          <>
            <span>Placed {formatDateTime(order.placedAt)}</span>
            <span>
              {formatNumber(detail.units)} {pluralize(detail.units, 'unit')}
            </span>
            <span className="tabular">{formatINR(order.totals.total)}</span>
            <span>
              {order.shipTo.city} · {order.shipTo.pin}
            </span>
          </>
        }
        actions={
          <>
            <Button leftIcon={<NotebookPen aria-hidden />} onClick={() => { setNote(''); setDialog({ kind: 'note' }) }}>
              Add note
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton label="More actions" variant="outline" icon={<Ellipsis aria-hidden />} />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  icon={<Undo2 aria-hidden />}
                  onSelect={() =>
                    deferred(() => {
                      setRefundId(refundable[0]?.id ?? '')
                      setDialog({ kind: 'refund' })
                    })
                  }
                >
                  Initiate refund
                </DropdownMenuItem>
                <DropdownMenuItem
                  icon={<Copy aria-hidden />}
                  onSelect={() => {
                    void navigator.clipboard.writeText(order.id)
                    toast.success('Order id copied')
                  }}
                >
                  Copy order id
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  destructive
                  icon={<Ban aria-hidden />}
                  onSelect={() =>
                    deferred(() => {
                      setReason(CANCEL_REASONS[0] ?? '')
                      setDialog({ kind: 'cancel-order' })
                    })
                  }
                >
                  Cancel order
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {shipments.map((entry) => {
            const shipment = entry.shipment
            const earnings = entry.settlement?.earnings
            return (
              <SectionCard
                key={shipment.id}
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono">{shipment.id}</span>
                    <StatusBadge domain="shipment" status={shipment.status} size="sm" withTooltip />
                  </span>
                }
                description={
                  entry.seller ? (
                    <Link to={`/admin/sellers/${entry.seller.id}`} className="text-link hover:underline">
                      {entry.seller.displayName}
                    </Link>
                  ) : (
                    'Seller removed'
                  )
                }
                actions={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <IconButton label={`Actions for ${shipment.id}`} size="sm" variant="outline" icon={<Ellipsis aria-hidden />} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        icon={<Truck aria-hidden />}
                        onSelect={() => deferred(() => openUpdate(shipment.id, shipment.status))}
                      >
                        Update status
                      </DropdownMenuItem>
                      {entry.canCancel ? (
                        <DropdownMenuItem
                          destructive
                          icon={<Ban aria-hidden />}
                          onSelect={() =>
                            deferred(() => {
                              setReason(CANCEL_REASONS[0] ?? '')
                              setDialog({ kind: 'cancel-shipment', shipmentId: shipment.id })
                            })
                          }
                        >
                          Cancel shipment
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
              >
                <div className="flex flex-col gap-5">
                  <ul className="flex flex-col divide-y divide-border-subtle">
                    {entry.items.map((item) => (
                      <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                        <Img image={item.image} alt="" ratio="square" width={120} sizes="64px" className="size-16 shrink-0 rounded-thumb" />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <p className="line-clamp-2 type-body text-fg">{item.title}</p>
                          <p className="type-caption text-fg-muted">
                            {item.variantLabel || 'Single variant'} · HSN {item.hsn}
                          </p>
                          <p className="type-caption text-fg-muted">
                            Qty {formatNumber(item.qty)} · GST {item.gstRate}% ({formatINR(gstAmount(item.price * item.qty, item.gstRate))})
                          </p>
                        </div>
                        <p className="shrink-0 type-body text-fg tabular">{formatINR(item.price * item.qty)}</p>
                      </li>
                    ))}
                  </ul>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <h3 className="type-label text-fg">Timeline</h3>
                      <OrderTimeline events={shipment.events} />
                    </div>
                    <div className="flex flex-col gap-3">
                      <h3 className="type-label text-fg">Package</h3>
                      <DescriptionList
                        layout="inline"
                        items={[
                          { term: 'Courier', detail: shipment.courier ?? 'Not handed over yet' },
                          ...(shipment.awb ? [{ term: 'AWB', detail: shipment.awb, copyValue: shipment.awb }] : []),
                          {
                            term: 'Weight',
                            detail: shipment.package ? `${shipment.package.weightKg} kg` : 'Not packed yet',
                          },
                          {
                            term: 'Dimensions',
                            detail: shipment.package ? `${shipment.package.dimensionsCm.join(' × ')} cm` : '—',
                          },
                          { term: 'Dispatch by', detail: formatDateTime(shipment.slaDueAt) },
                          { term: 'Promised by', detail: formatDate(shipment.promisedBy) },
                        ]}
                      />
                      {earnings ? (
                        <div className="flex flex-col gap-1 rounded-card bg-surface-2 p-3">
                          <p className="type-caption text-fg-muted">Seller settlement</p>
                          <p className="type-body text-fg tabular">
                            {formatINR(earnings.net, { decimals: 2 })} net of {formatINR(earnings.deductions, { decimals: 2 })} in fees
                          </p>
                          {entry.settlement?.couponFundedByPlatform ? (
                            <p className="type-caption text-fg-muted">
                              {formatINR(shipment.totals.coupon)} coupon funded by Chowk — it does not reduce the payout.
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {entry.return ? (
                    <div className="flex flex-col gap-1.5 rounded-card border border-warning-border bg-warning-subtle p-3">
                      <p className="flex flex-wrap items-center gap-2 type-label text-fg">
                        Return {entry.return.id}
                        <StatusBadge domain="return" status={entry.return.status} size="sm" withTooltip />
                        {entry.return.escalated ? (
                          <Badge tone="danger" size="sm" variant="outline">
                            Escalated
                          </Badge>
                        ) : null}
                      </p>
                      <p className="type-body text-fg">{entry.return.reason}</p>
                      <p className="type-caption text-fg-muted">
                        {formatINR(entry.return.refundAmount)} to be refunded to{' '}
                        {entry.return.refundTo === 'upi' ? 'the shopper’s UPI ID' : 'the original payment method'} ·
                        requested {formatRelative(entry.return.requestedAt)}
                      </p>
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            )
          })}

          <SectionCard title="Payment" description="What the shopper paid, and anything sent back.">
            <div className="flex flex-col gap-4">
              <DescriptionList
                columns={2}
                items={[
                  { term: 'Method', detail: PAYMENT_METHOD_META[order.payment.method].label },
                  { term: 'Instrument', detail: order.payment.detail },
                  { term: 'Transaction reference', detail: order.payment.txnRef, copyValue: order.payment.txnRef },
                  { term: 'Status', detail: <StatusBadge domain="payment" status={order.payment.status} size="sm" withTooltip /> },
                  { term: 'Paid at', detail: order.payment.paidAt ? formatDateTime(order.payment.paidAt) : 'Not collected yet' },
                  ...(order.payment.failureReason ? [{ term: 'Failure reason', detail: order.payment.failureReason }] : []),
                ]}
              />
              {order.payment.refunds.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <h3 className="type-label text-fg">Refunds</h3>
                  <ul className="flex flex-col divide-y divide-border-subtle">
                    {order.payment.refunds.map((refund) => (
                      <li key={refund.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                        <span className="flex min-w-0 flex-col">
                          <span className="type-body text-fg">{refund.reason}</span>
                          <span className="type-caption text-fg-muted">
                            {refund.status === 'processed' ? 'Processed' : 'Initiated'} · {formatDateTime(refund.at)}
                          </span>
                        </span>
                        <span className="shrink-0 type-body text-fg tabular">{formatINR(refund.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Price breakdown" description="Every line the shopper saw, plus who funded the coupon.">
            <dl className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="type-body text-fg-muted">Total MRP</dt>
                <dd className="type-body text-fg tabular">{formatINR(order.totals.mrp)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="type-body text-fg-muted">Discount on MRP</dt>
                <dd className="type-body text-discount tabular">−{formatINR(order.totals.discount)}</dd>
              </div>
              {order.totals.coupon > 0 ? (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="type-body text-fg-muted">
                    Coupon {order.couponCode}
                    <span className="block type-caption">
                      Funded by {order.couponFundedBy === 'seller' ? 'the seller' : 'Chowk'}
                    </span>
                  </dt>
                  <dd className="type-body text-discount tabular">−{formatINR(order.totals.coupon)}</dd>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-3">
                <dt className="type-body text-fg-muted">Delivery</dt>
                <dd className="type-body text-fg tabular">
                  {order.totals.shipping > 0 ? formatINR(order.totals.shipping) : 'Free'}
                </dd>
              </div>
              {order.totals.codFee > 0 ? (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="type-body text-fg-muted">Cash-on-delivery fee</dt>
                  <dd className="type-body text-fg tabular">{formatINR(order.totals.codFee)}</dd>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-3 border-t border-border-subtle pt-2">
                <dt className="type-label text-fg">Total paid</dt>
                <dd className="type-price text-fg">{formatINR(order.totals.total)}</dd>
              </div>
            </dl>
            {/* Outside the <dl>: only dt/dd pairs may sit directly inside one. */}
            <p className="pt-2 type-caption text-fg-muted">Inclusive of all taxes.</p>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-4">
          <SectionCard title="Shopper">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={customer?.name ?? 'Chowk shopper'} />
                <div className="flex min-w-0 flex-col">
                  {customer ? (
                    <Link to={`/admin/users/${customer.id}`} className="type-label text-link hover:underline">
                      {customer.name}
                    </Link>
                  ) : (
                    <span className="type-label text-fg">Deleted account</span>
                  )}
                  <span className="type-caption text-fg-muted">
                    {customer ? maskEmail(customer.email) : 'No contact details'}
                  </span>
                </div>
              </div>
              <DescriptionList
                items={[
                  { term: 'Mobile', detail: customer ? maskPhone(customer.phone) : '—' },
                  {
                    term: 'Delivery address',
                    detail: `${order.shipTo.name}, ${order.shipTo.line1}${order.shipTo.line2 ? `, ${order.shipTo.line2}` : ''}, ${order.shipTo.city}, ${order.shipTo.state} ${order.shipTo.pin}`,
                  },
                  ...(order.billing
                    ? [{ term: 'GST invoice', detail: `${order.billing.businessName} · ${order.billing.gstin}` }]
                    : []),
                ]}
              />
              {customer ? (
                <Button variant="outline" size="sm" leftIcon={<User aria-hidden />} asChild>
                  <Link to={`/admin/users/${customer.id}`}>View shopper</Link>
                </Button>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            title="Internal notes"
            description="Visible to the marketplace team only."
            actions={
              <Button size="sm" variant="outline" onClick={() => { setNote(''); setDialog({ kind: 'note' }) }}>
                Add note
              </Button>
            }
          >
            {order.notes.length === 0 ? (
              <EmptyState
                variant="compact"
                title="No notes yet"
                description="Add a note so the next person picking this up knows what happened."
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border-subtle">
                {order.notes.map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
                    <p className="type-body text-fg">{entry.text}</p>
                    <p className="type-caption text-fg-muted">
                      {entry.by} · {formatRelative(entry.at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Audit log" description="Every change the marketplace team made.">
            <AuditLog
              entries={audit}
              emptyTitle="Nothing recorded yet"
              emptyDescription="Status overrides, refunds and notes are logged here."
            />
          </SectionCard>
        </div>
      </div>

      <Dialog open={dialog?.kind === 'note'} onOpenChange={(open) => !open && close()}>
        <DialogContent
          title="Add an internal note"
          description="Notes stay inside the marketplace team — the shopper and the seller never see them."
          footer={
            <>
              <Button variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button disabled={note.trim().length === 0} onClick={submitNote}>
                Add note
              </Button>
            </>
          }
        >
          <Field label="Note">
            {({ id }) => (
              <Textarea id={id} rows={4} value={note} onChange={(event) => setNote(event.target.value)} autoFocus />
            )}
          </Field>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog?.kind === 'update'} onOpenChange={(open) => !open && close()}>
        <DialogContent
          title="Update shipment status"
          description="This overrides the normal flow, so the note is required. The shopper is told the status changed."
          footer={
            <>
              <Button variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button disabled={note.trim().length === 0} onClick={submitOverride}>
                Update status
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Field label="New status">
              {({ id }) => (
                <Select
                  id={id}
                  value={nextStatus}
                  onValueChange={(value) => setNextStatus(value as ShipmentStatus)}
                  options={statusOptions('shipment').map((option) => ({ value: option.value, label: option.label }))}
                />
              )}
            </Field>
            <Field label="Why are you overriding this?" hint="The note is written to the shipment timeline and the audit log.">
              {({ id }) => (
                <Textarea id={id} rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
              )}
            </Field>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog?.kind === 'cancel-shipment' || dialog?.kind === 'cancel-order'} onOpenChange={(open) => !open && close()}>
        <DialogContent
          title={dialog?.kind === 'cancel-order' ? 'Cancel this order?' : 'Cancel this shipment?'}
          description={
            dialog?.kind === 'cancel-order'
              ? `${cancellable.length} of ${detail.shipments.length} ${pluralize(detail.shipments.length, 'shipment')} can still be cancelled. Stock goes back on sale and prepaid amounts are refunded.`
              : 'Stock goes back on sale and any prepaid amount is sent for refund.'
          }
          footer={
            <>
              <Button variant="outline" onClick={close}>
                Keep the order
              </Button>
              <Button
                variant="danger"
                disabled={dialog?.kind === 'cancel-order' && cancellable.length === 0}
                onClick={dialog?.kind === 'cancel-order' ? submitCancelOrder : submitCancelShipment}
              >
                {dialog?.kind === 'cancel-order' ? 'Cancel order' : 'Cancel shipment'}
              </Button>
            </>
          }
        >
          {dialog?.kind === 'cancel-order' && cancellable.length === 0 ? (
            <p className="type-body text-fg-muted">
              Every shipment in this order has been packed, shipped or already cancelled. Raise a return instead.
            </p>
          ) : (
            <fieldset className="flex flex-col gap-2">
              <legend className="pb-2 type-label text-fg">Reason</legend>
              <RadioGroup
                aria-label="Cancellation reason"
                variant="card"
                value={reason}
                onValueChange={setReason}
                options={CANCEL_REASONS.map((entry) => ({ value: entry, label: entry }))}
              />
            </fieldset>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialog?.kind === 'refund'} onOpenChange={(open) => !open && close()}>
        <DialogContent
          title="Initiate refund"
          description="Refunds are raised against a return. Cancel a shipment instead if it has not been dispatched."
          footer={
            <>
              <Button variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button disabled={refundable.length === 0 || !refundId} onClick={submitRefund}>
                Refund to the shopper
              </Button>
            </>
          }
        >
          {refundable.length === 0 ? (
            <p className="type-body text-fg-muted">
              There is nothing to refund on this order. A refund can be raised once a return has been approved, or by
              cancelling a shipment that has not been dispatched.
            </p>
          ) : (
            <fieldset className="flex flex-col gap-2">
              <legend className="pb-2 type-label text-fg">Which return?</legend>
              <RadioGroup
                aria-label="Return to refund"
                variant="card"
                value={refundId}
                onValueChange={setRefundId}
                options={refundable.map((request) => ({
                  value: request.id,
                  label: `${request.id} · ${request.shipmentId}`,
                  description: `${request.reason} · refund to ${request.refundTo === 'upi' ? 'UPI' : 'the original payment method'}`,
                  meta: formatINR(request.refundAmount),
                }))}
              />
            </fieldset>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
