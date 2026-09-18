import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { Product } from '@/data/types'
import { IconButton } from '@/components/ui/icon-button'
import { cn } from '@/lib/cn'
import { ProductCard } from './product-card'

interface ProductRailProps {
  title: string
  products: Product[]
  /** "View all" destination. */
  href?: string
  /** Extra element beside the title (a countdown, a tagline). */
  meta?: ReactNode
  getCardProps?: (product: Product) => { deliveryNote?: string; sellerName?: string; wishlisted?: boolean }
  onToggleWishlist?: (productId: string) => void
  className?: string
}

/** Horizontally scrolling shelf. Scroll-snap on touch, arrow buttons from md up. */
export function ProductRail({ title, products, href, meta, getCardProps, onToggleWishlist, className }: ProductRailProps) {
  const trackRef = useRef<HTMLDivElement>(null)

  const scrollBy = (direction: 1 | -1) => {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({ left: direction * Math.max(240, track.clientWidth * 0.8), behavior: 'smooth' })
  }

  if (products.length === 0) return null

  return (
    <section className={cn('flex flex-col gap-3', className)} aria-labelledby={`rail-${title.replace(/\W+/g, '-')}`}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-3">
          <h2 id={`rail-${title.replace(/\W+/g, '-')}`} className="type-h2 text-fg">
            {title}
          </h2>
          {meta}
        </div>
        <div className="flex items-center gap-1">
          {href ? (
            <Link to={href} className="type-label text-link hover:underline underline-offset-2">
              View all
            </Link>
          ) : null}
          <div className="hidden items-center gap-1 md:flex">
            <IconButton label="Scroll left" icon={<ChevronLeft aria-hidden />} variant="outline" size="sm" onClick={() => scrollBy(-1)} />
            <IconButton label="Scroll right" icon={<ChevronRight aria-hidden />} variant="outline" size="sm" onClick={() => scrollBy(1)} />
          </div>
        </div>
      </div>
      <div
        ref={trackRef}
        className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth px-1 pb-2 no-scrollbar"
      >
        {products.map((product) => (
          <div key={product.id} className="snap-start">
            <ProductCard product={product} variant="rail" onToggleWishlist={onToggleWishlist} {...getCardProps?.(product)} />
          </div>
        ))}
      </div>
    </section>
  )
}
