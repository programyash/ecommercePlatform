import { RotateCcw } from 'lucide-react'
import { Link } from 'react-router'
import type { OrderView } from '@/data'
import { Button } from '@/components/ui/button'
import { Img } from '@/components/ui/img'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDate, formatDayShort, formatINR, pluralWithCount } from '@/lib/format'

interface OrderCardProps {
  order: OrderView
  onBuyAgain?: (order: OrderView) => void
}

function shipmentLine(entry: OrderView['shipments'][number]): string {
  const { shipment } = entry
  if (shipment.status === 'delivered') {
    return shipment.deliveredAt ? `Delivered on ${formatDayShort(shipment.deliveredAt)}` : 'Delivered'
  }
  if (shipment.status === 'cancelled') {
    return shipment.cancelReason ? `Cancelled · ${shipment.cancelReason}` : 'Cancelled'
  }
  return `Arriving by ${formatDayShort(shipment.promisedBy)}`
}

/**
 * One order in a list. A customer order carries no status of its own, so the card
 * summarises its shipments ("1 of 2 delivered") and badges each one separately.
 */
export function OrderCard({ order, onBuyAgain }: OrderCardProps) {
  const returned = order.shipments.find((entry) => entry.return)

  return (
    <article className="flex flex-col rounded-card border border-border bg-surface">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-border-subtle px-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            to={`/account/orders/${order.order.id}`}
            className="type-label text-fg hover:text-primary hover:underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Order {order.order.id}
          </Link>
          <p className="type-caption text-fg-muted">
            Placed {formatDate(order.order.placedAt)} · {pluralWithCount(order.units, 'item')} ·{' '}
            {pluralWithCount(order.shipments.length, 'shipment')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <p className="type-price text-base text-fg">{formatINR(order.order.totals.total)}</p>
          <p className="type-caption text-fg-muted">{order.summary.label}</p>
        </div>
      </header>

      <ul className="flex flex-col divide-y divide-border-subtle">
        {order.shipments.map((entry) => (
          <li key={entry.shipment.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
            <ul className="flex shrink-0 items-center gap-2">
              {entry.items.slice(0, 3).map((item) => (
                <li key={item.id}>
                  <Img
                    image={item.image}
                    alt={item.title}
                    ratio="square"
                    width={120}
                    sizes="48px"
                    className="w-12 rounded-card ring-1 ring-border"
                  />
                </li>
              ))}
              {entry.items.length > 3 ? (
                <li className="grid size-12 place-items-center rounded-card bg-surface-2 type-caption text-fg-muted">
                  +{entry.items.length - 3}
                </li>
              ) : null}
            </ul>

            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="line-clamp-1 type-body text-fg">
                {entry.items[0]?.title}
                {entry.items.length > 1 ? ` and ${entry.items.length - 1} more` : ''}
              </p>
              <p className="type-caption text-fg-muted">
                {entry.seller ? `Sold by ${entry.seller.displayName} · ` : ''}
                {shipmentLine(entry)}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {entry.return ? <StatusBadge domain="return" status={entry.return.status} size="sm" /> : null}
              <StatusBadge domain="shipment" status={entry.shipment.status} size="sm" />
            </div>
          </li>
        ))}
      </ul>

      <footer className="flex flex-wrap items-center gap-2 border-t border-border-subtle px-4 py-3">
        <Button size="sm" variant="outline" asChild>
          <Link to={`/account/orders/${order.order.id}`}>View details</Link>
        </Button>
        {onBuyAgain ? (
          <Button size="sm" variant="ghost" leftIcon={<RotateCcw aria-hidden />} onClick={() => onBuyAgain(order)}>
            Buy it again
          </Button>
        ) : null}
        {returned ? (
          <p className="ml-auto type-caption text-fg-muted">
            Refund of {formatINR(returned.return?.refundAmount ?? 0)} to your original payment method
          </p>
        ) : null}
      </footer>
    </article>
  )
}
