import { Plus, Store } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import type { Product, Variant } from '@/data'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Img } from '@/components/ui/img'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Price } from '@/components/commerce/price'
import { Rating } from '@/components/commerce/rating'
import { formatINR, pluralWithCount } from '@/lib/format'

export interface BundleItem {
  product: Product
  variant: Variant
}

/** "Frequently bought together": the open product plus cheaper items from its aisle. */
export function FrequentlyBought({ items, onAdd }: { items: BundleItem[]; onAdd: (items: BundleItem[]) => void }) {
  const optional = items.slice(1)
  const [skipped, setSkipped] = useState<string[]>([])
  const chosen = items.filter((item, index) => index === 0 || !skipped.includes(item.product.id))
  const total = chosen.reduce((sum, item) => sum + item.variant.price, 0)
  const mrpTotal = chosen.reduce((sum, item) => sum + item.variant.mrp, 0)

  if (optional.length === 0) return null

  return (
    <section aria-labelledby="bundle-heading" className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 sm:p-5">
      <h2 id="bundle-heading" className="type-h2 text-fg">
        Frequently bought together
      </h2>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <ul className="flex min-w-0 flex-col gap-3">
          {items.map((item, index) => {
            const included = index === 0 || !skipped.includes(item.product.id)
            return (
              <li key={item.product.id} className="flex items-center gap-3">
                <Checkbox
                  checked={included}
                  disabled={index === 0}
                  aria-label={index === 0 ? `${item.product.title} (this item)` : `Include ${item.product.title}`}
                  onCheckedChange={(checked) =>
                    setSkipped((current) =>
                      checked === true
                        ? current.filter((id) => id !== item.product.id)
                        : [...current, item.product.id],
                    )
                  }
                />
                <Link
                  to={`/p/${item.product.slug}`}
                  className="shrink-0 rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Img
                    image={item.variant.media?.[0] ?? item.product.media[0] ?? 'rack-tees'}
                    alt={item.product.title}
                    ratio="square"
                    width={160}
                    sizes="56px"
                    className="w-14 rounded-card"
                  />
                </Link>
                <div className="flex min-w-0 flex-col">
                  <p className="type-caption text-fg-muted">{index === 0 ? 'This item' : 'Add'}</p>
                  <Link
                    to={`/p/${item.product.slug}`}
                    className="line-clamp-1 type-label text-fg hover:text-primary hover:underline underline-offset-2"
                  >
                    {item.product.title}
                  </Link>
                  <Price price={item.variant.price} mrp={item.variant.mrp} size="sm" />
                </div>
              </li>
            )
          })}
        </ul>
        <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
          <p className="type-body text-fg-muted">
            Total for {pluralWithCount(chosen.length, 'item')}:{' '}
            <span className="type-price text-base text-price">{formatINR(total)}</span>
          </p>
          {mrpTotal > total ? (
            <p className="type-caption text-discount">You save {formatINR(mrpTotal - total)}</p>
          ) : null}
          <Button leftIcon={<Plus aria-hidden />} onClick={() => onAdd(chosen)}>
            Add {chosen.length} to bag
          </Button>
        </div>
      </div>
    </section>
  )
}

export interface OfferRow {
  sellerId: string
  sellerName: string
  sellerSlug: string
  rating: number | null
  ratingCount: number
  price: number
  mrp: number
  stock: number
  /** "Delivery by Tue, 15 Sep", once the shopper has set a PIN code. */
  deliveryLabel?: string
}

interface OtherSellersSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productTitle: string
  rows: OfferRow[]
  onAdd: (row: OfferRow) => void
}

/** Every seller offering this product, each with its own price, date and Add. */
export function OtherSellersSheet({ open, onOpenChange, productTitle, rows, onAdd }: OtherSellersSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" title="Other sellers" description={productTitle}>
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.sellerId} className="flex flex-col gap-2 rounded-card border border-border p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  to={`/store/${row.sellerSlug}`}
                  className="inline-flex items-center gap-1.5 type-label text-link hover:underline underline-offset-2"
                >
                  <Store aria-hidden className="size-3.5" />
                  {row.sellerName}
                </Link>
                {row.rating ? <Rating value={row.rating} count={row.ratingCount} /> : null}
              </div>
              <Price price={row.price} mrp={row.mrp} />
              {row.deliveryLabel ? <p className="type-caption text-success-subtle-fg">{row.deliveryLabel}</p> : null}
              {row.stock > 0 && row.stock <= 5 ? (
                <p className="type-caption text-warning-subtle-fg">Only {row.stock} left</p>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                className="self-start"
                disabled={row.stock <= 0}
                onClick={() => onAdd(row)}
              >
                {row.stock > 0 ? 'Add to bag' : 'Out of stock'}
              </Button>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  )
}
