import type { ReactNode } from 'react'
import { OrderSummary, type SummaryLine } from '@/components/commerce/order-summary'
import { formatINR, pluralWithCount } from '@/lib/format'
import { freeDeliveryHint, type CartSummary } from '@/lib/pricing'

/** MRP, discount, coupon, delivery — the same rows the cart shows. */
function summaryLines(summary: CartSummary): SummaryLine[] {
  const lines: SummaryLine[] = [
    { label: `Price (${pluralWithCount(summary.units, 'item')})`, amount: summary.mrpTotal },
  ]
  if (summary.discount > 0) lines.push({ label: 'Discount', amount: summary.discount, kind: 'discount' })
  if (summary.couponDiscount > 0) {
    lines.push({
      label: summary.couponCode ? `Coupon ${summary.couponCode}` : 'Coupon',
      amount: summary.couponDiscount,
      kind: 'discount',
    })
  }
  lines.push({
    label: 'Delivery',
    amount: summary.deliveryBase,
    kind: summary.deliveryBase === 0 ? 'free' : 'default',
    hint:
      summary.deliveryBase === 0
        ? 'Free on orders of ₹499 and above.'
        : `Orders under ₹499 carry a ${formatINR(summary.deliveryBase)} delivery fee.`,
  })
  if (summary.expressTotal > 0) {
    lines.push({ label: 'Express delivery', amount: summary.expressTotal, hint: '₹99 per shipment sent by express.' })
  }
  if (summary.codFee > 0) lines.push({ label: 'Cash on delivery fee', amount: summary.codFee })
  return lines
}

interface PriceColumnProps {
  summary: CartSummary
  /** The single primary button for this step. The phone bar moves it — it is never copied. */
  cta: ReactNode
  /** Coupon field, shown on the summary step only. */
  coupon?: ReactNode
  note?: ReactNode
  /** Label beside the amount in the phone bar, e.g. "Payable now". */
  barLabel?: string
}

/**
 * The sticky price panel. On phones the action moves into a bar pinned to the bottom of
 * the viewport; it is the same button in the same place in the DOM, only positioned
 * differently, so the tab order never changes.
 */
export function PriceColumn({ summary, cta, coupon, note, barLabel = 'Total' }: PriceColumnProps) {
  const hint = freeDeliveryHint(summary)
  return (
    <aside className="flex flex-col gap-3 lg:sticky lg:top-24">
      {coupon ? <div className="rounded-card border border-border bg-surface p-4">{coupon}</div> : null}

      <OrderSummary
        lines={summaryLines(summary)}
        total={summary.total}
        totalLabel="Total payable"
        savings={summary.youSave}
        note={
          <>
            {hint ? <span className="block">{hint}</span> : null}
            <span className="block">Inclusive of all taxes.</span>
            {note}
          </>
        }
      />

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-4 border-t border-border bg-surface px-4 py-3 pb-safe shadow-raised lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <div className="flex min-w-0 flex-col lg:hidden">
          <span className="type-caption text-fg-muted">{barLabel}</span>
          <span className="type-price text-base text-fg">{formatINR(summary.total)}</span>
        </div>
        <div className="min-w-0 flex-1">{cta}</div>
      </div>
    </aside>
  )
}
