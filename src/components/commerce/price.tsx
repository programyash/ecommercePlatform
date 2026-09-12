import { formatINR } from '@/lib/format'
import { cn } from '@/lib/cn'

const sizeClass = {
  sm: { price: 'text-sm', mrp: 'text-xs', off: 'text-xs' },
  md: { price: 'text-base', mrp: 'text-sm', off: 'text-sm' },
  lg: { price: 'text-xl', mrp: 'text-sm', off: 'text-sm' },
  xl: { price: 'text-2xl sm:text-3xl', mrp: 'text-base', off: 'text-base' },
} as const

interface PriceProps {
  price: number
  mrp?: number
  size?: keyof typeof sizeClass
  /** Adds the "Inclusive of all taxes" line required on product pages. */
  inclusive?: boolean
  className?: string
}

export function discountPercent(mrp: number, price: number): number {
  if (!mrp || mrp <= price) return 0
  return Math.round(((mrp - price) / mrp) * 100)
}

/**
 * The price is one screen-reader sentence ("MRP ₹22,999, price ₹17,999, 22% off")
 * so the strike-through does not have to be interpreted visually.
 */
export function Price({ price, mrp, size = 'md', inclusive = false, className }: PriceProps) {
  const off = mrp ? discountPercent(mrp, price) : 0
  const sizes = sizeClass[size]
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="sr-only">
          {off ? `MRP ${formatINR(mrp!)}, price ${formatINR(price)}, ${off}% off` : `Price ${formatINR(price)}`}
        </span>
        <span aria-hidden className={cn('type-price text-price', sizes.price)}>
          {formatINR(price)}
        </span>
        {off > 0 ? (
          <>
            <span aria-hidden className={cn('text-mrp line-through', sizes.mrp)}>
              {formatINR(mrp!)}
            </span>
            <span aria-hidden className={cn('font-semibold text-discount', sizes.off)}>
              {off}% off
            </span>
          </>
        ) : null}
      </p>
      {inclusive ? <p className="type-caption text-fg-muted">Inclusive of all taxes</p> : null}
    </div>
  )
}
