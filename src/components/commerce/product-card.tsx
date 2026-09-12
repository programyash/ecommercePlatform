import { Heart } from 'lucide-react'
import { Link } from 'react-router'
import type { Product, Variant } from '@/data/types'
import { Badge } from '@/components/ui/badge'
import { Img } from '@/components/ui/img'
import { cn } from '@/lib/cn'
import { Price } from './price'
import { Rating } from './rating'

/** The variant a card represents: the cheapest in-stock one, else the first. */
export function defaultVariant(product: Product): Variant {
  const inStock = product.variants.filter((variant) => variant.active && variant.stock > 0)
  const pool = inStock.length ? inStock : product.variants
  return pool.reduce((cheapest, variant) => (variant.price < cheapest.price ? variant : cheapest), pool[0]!)
}

export function totalStock(product: Product): number {
  return product.variants.reduce((sum, variant) => sum + (variant.active ? variant.stock : 0), 0)
}

interface ProductCardProps {
  product: Product
  /** e.g. "Free delivery by Tue, 15 Sep" — shown once the shopper has set a PIN code. */
  deliveryNote?: string
  sellerName?: string
  wishlisted?: boolean
  onToggleWishlist?: (productId: string) => void
  variant?: 'grid' | 'rail' | 'compact'
  /** Eager-load the image (first row of the first screen only). */
  priority?: boolean
  className?: string
}

export function ProductCard({
  product,
  deliveryNote,
  sellerName,
  wishlisted = false,
  onToggleWishlist,
  variant = 'grid',
  priority = false,
  className,
}: ProductCardProps) {
  const chosen = defaultVariant(product)
  const stock = totalStock(product)
  const outOfStock = stock === 0
  const lowStock = !outOfStock && stock <= (chosen.lowStockAt || 5)
  const hoverImage = product.media[1]
  const tag = product.tags[0]
  const compact = variant === 'compact'

  return (
    <article
      className={cn(
        'group relative flex flex-col rounded-card bg-surface transition-shadow duration-200 ease-standard',
        variant !== 'compact' && 'hover:shadow-raised',
        variant === 'rail' && 'w-44 shrink-0 sm:w-52',
        className,
      )}
    >
      <Link
        to={`/p/${product.slug}`}
        className="flex flex-1 flex-col gap-2 rounded-card p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <div className="relative overflow-hidden rounded-card bg-surface-2">
          <Img
            image={product.media[0] ?? 'rack-tees'}
            alt={product.title}
            ratio="product"
            priority={priority}
            width={compact ? 200 : 420}
            sizes={compact ? '120px' : '(min-width: 1280px) 300px, (min-width: 768px) 30vw, 45vw'}
            className={cn(hoverImage && 'transition-opacity duration-200 group-hover:opacity-0')}
          />
          {hoverImage ? (
            <Img
              image={hoverImage}
              alt=""
              ratio="product"
              width={420}
              sizes="(min-width: 1280px) 300px, (min-width: 768px) 30vw, 45vw"
              className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            />
          ) : null}
          {tag && !outOfStock ? (
            <Badge
              // Only "Deal" earns the savings orange; Bestseller and New are not money off.
              tone={tag === 'deal' ? 'accent' : tag === 'new' ? 'info' : 'neutral'}
              variant="solid"
              size="sm"
              className="absolute top-2 left-2"
            >
              {tag === 'deal' ? 'Deal' : tag === 'new' ? 'New' : 'Bestseller'}
            </Badge>
          ) : null}
          {outOfStock ? (
            <div className="absolute inset-0 grid place-items-center bg-surface/75">
              <span className="rounded-badge bg-surface px-2 py-1 type-caption font-semibold text-fg-muted">Out of stock</span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-1 px-1 pb-1">
          <p className="type-label truncate text-fg">{product.brand}</p>
          <p className={cn('type-body text-fg-muted', compact ? 'line-clamp-1' : 'line-clamp-2')}>{product.title}</p>
          {!compact ? <Rating value={product.rating.avg} count={product.rating.count} /> : null}
          <Price price={chosen.price} mrp={chosen.mrp} size={compact ? 'sm' : 'md'} className="mt-0.5" />
          {sellerName ? <p className="type-caption truncate text-fg-subtle">Sold by {sellerName}</p> : null}
          {deliveryNote && !outOfStock ? <p className="type-caption text-success-subtle-fg">{deliveryNote}</p> : null}
          {lowStock ? <p className="type-caption font-medium text-warning-subtle-fg">Only {stock} left</p> : null}
          {product.swatches?.length ? (
            <div className="mt-1 flex items-center gap-1">
              {product.swatches.slice(0, 5).map((swatch) => (
                <span
                  key={swatch.name}
                  title={swatch.name}
                  className="size-3 rounded-full border border-border"
                  style={{ backgroundColor: swatch.hex }}
                />
              ))}
              {product.swatches.length > 5 ? (
                <span className="type-caption text-fg-subtle">+{product.swatches.length - 5}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </Link>

      {onToggleWishlist ? (
        <button
          type="button"
          onClick={() => onToggleWishlist(product.id)}
          aria-pressed={wishlisted}
          aria-label={wishlisted ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`}
          className={cn(
            'absolute top-3.5 right-3.5 grid size-8 place-items-center rounded-full bg-surface/90 shadow-card backdrop-blur-sm transition-colors',
            'hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            wishlisted ? 'text-primary' : 'text-fg-muted',
          )}
        >
          <Heart aria-hidden className={cn('size-4', wishlisted && 'fill-current')} />
        </button>
      ) : null}
    </article>
  )
}
