import { Link } from 'react-router'
import type { MediaRef } from '@/data/images'
import { Button } from '@/components/ui/button'
import { Img } from '@/components/ui/img'
import { cn } from '@/lib/cn'
import { Price } from './price'
import { QuantityStepper } from './quantity-stepper'

export interface CartLineData {
  lineId: string
  productSlug: string
  title: string
  brand: string
  image: MediaRef
  variantLabel?: string
  price: number
  mrp?: number
  qty: number
  maxQty: number
  /** Inline warnings: out of stock, price drop, quantity capped. */
  notice?: { tone: 'info' | 'warning' | 'danger'; message: string }
}

interface CartLineProps {
  line: CartLineData
  onQtyChange?: (lineId: string, qty: number) => void
  onRemove?: (lineId: string) => void
  onSaveForLater?: (lineId: string) => void
  onMoveToCart?: (lineId: string) => void
  /** Read-only rendering for checkout and order pages. */
  readOnly?: boolean
  className?: string
}

export function CartLine({
  line,
  onQtyChange,
  onRemove,
  onSaveForLater,
  onMoveToCart,
  readOnly = false,
  className,
}: CartLineProps) {
  return (
    <div className={cn('flex gap-3 py-4', className)}>
      <Link to={`/p/${line.productSlug}`} className="shrink-0 rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <Img image={line.image} alt={line.title} ratio="square" width={200} sizes="88px" className="w-20 rounded-card sm:w-24" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div className="flex min-w-0 flex-col">
            <p className="type-label text-fg">{line.brand}</p>
            <Link to={`/p/${line.productSlug}`} className="line-clamp-2 type-body text-fg-muted hover:text-fg hover:underline underline-offset-2">
              {line.title}
            </Link>
            {line.variantLabel ? <p className="type-caption text-fg-subtle">{line.variantLabel}</p> : null}
          </div>
          <Price price={line.price * line.qty} mrp={line.mrp ? line.mrp * line.qty : undefined} size="sm" />
        </div>

        {line.notice ? (
          <p
            className={cn(
              'type-caption',
              line.notice.tone === 'danger' && 'text-danger-subtle-fg',
              line.notice.tone === 'warning' && 'text-warning-subtle-fg',
              line.notice.tone === 'info' && 'text-success-subtle-fg',
            )}
          >
            {line.notice.message}
          </p>
        ) : null}

        {!readOnly ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
            {onQtyChange ? (
              <QuantityStepper
                size="sm"
                value={line.qty}
                max={line.maxQty}
                onChange={(qty) => onQtyChange(line.lineId, qty)}
                onRemove={onRemove ? () => onRemove(line.lineId) : undefined}
                label={`Quantity of ${line.title}`}
              />
            ) : null}
            {onSaveForLater ? (
              <Button variant="link" size="sm" onClick={() => onSaveForLater(line.lineId)}>
                Save for later
              </Button>
            ) : null}
            {onMoveToCart ? (
              <Button variant="link" size="sm" onClick={() => onMoveToCart(line.lineId)}>
                Move to bag
              </Button>
            ) : null}
            {onRemove ? (
              <Button variant="link" size="sm" className="text-fg-muted" onClick={() => onRemove(line.lineId)}>
                Remove
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="type-caption text-fg-muted">Quantity: {line.qty}</p>
        )}
      </div>
    </div>
  )
}
