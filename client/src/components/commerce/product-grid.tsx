import type { ReactNode } from 'react'
import type { Product } from '@/data/types'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'
import { ProductCard } from './product-card'

interface ProductGridProps {
  products: Product[]
  loading?: boolean
  empty?: ReactNode
  /** Per-product extras (delivery promise, seller name, wishlist state). */
  getCardProps?: (product: Product) => { deliveryNote?: string; sellerName?: string; wishlisted?: boolean }
  onToggleWishlist?: (productId: string) => void
  skeletonCount?: number
  className?: string
}

function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-2">
      <Skeleton className="aspect-product w-full rounded-card" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-24" />
    </div>
  )
}

export function ProductGrid({
  products,
  loading = false,
  empty,
  getCardProps,
  onToggleWishlist,
  skeletonCount = 8,
  className,
}: ProductGridProps) {
  if (!loading && products.length === 0 && empty) return <>{empty}</>

  // 2-up on phones, 3-up from tablet — two half-width cards on an iPad reads as a
  // phone layout that happened to stretch.
  return (
    <div className={cn('grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-4 md:grid-cols-3 xl:grid-cols-4', className)}>
      {loading
        ? Array.from({ length: skeletonCount }, (_, index) => <ProductCardSkeleton key={index} />)
        : products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              priority={index < 4}
              onToggleWishlist={onToggleWishlist}
              {...getCardProps?.(product)}
            />
          ))}
    </div>
  )
}
