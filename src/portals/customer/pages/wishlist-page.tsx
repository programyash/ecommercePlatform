import { Heart, TriangleAlert } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { getProductsByIds, isDealLive, useCart, useDemoQuery, useWishlist, type Product } from '@/data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { ProductCard, defaultVariant, totalStock } from '@/components/commerce/product-card'
import { formatINR, pluralWithCount } from '@/lib/format'

/** Saved products, with a way straight into the bag. */
export default function WishlistPage() {
  const ids = useWishlist((state) => state.ids)
  const remove = useWishlist((state) => state.remove)
  const toggle = useWishlist((state) => state.toggle)
  const add = useCart((state) => state.add)
  const navigate = useNavigate()

  const query = useDemoQuery((view) => getProductsByIds(view, ids), [ids])
  // `?demo=empty` forces the empty state even when something is saved.
  const products = query.status === 'empty' ? [] : (query.data ?? [])

  const moveToCart = (product: Product) => {
    const variant = defaultVariant(product)
    add({ productId: product.id, variantId: variant.id, sellerId: product.sellerId, qty: 1, stock: variant.stock })
    remove(product.id)
    toast.success('Moved to your bag', {
      description: product.title,
      action: { label: 'View bag', onClick: () => void navigate('/cart') },
    })
  }

  return (
    <>
      <PageHeader
        title="Your wishlist"
        documentTitle="Wishlist"
        breadcrumbs={[{ label: 'My account', to: '/account' }, { label: 'Wishlist' }]}
        description="Saved for later. Prices and delivery dates update on their own."
        meta={query.status === 'success' ? <span>{pluralWithCount(products.length, 'item')}</span> : null}
      />

      {query.status === 'error' ? (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState
            icon={<TriangleAlert aria-hidden />}
            title="We couldn’t load your wishlist"
            description="Something went wrong on our side. Try again in a moment."
            action={<Button onClick={query.retry}>Retry</Button>}
          />
        </div>
      ) : query.status === 'loading' ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-80 rounded-card" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState
            icon={<Heart aria-hidden />}
            title="Your wishlist is empty"
            description="Tap the heart on any product to save it. We’ll tell you if the price drops."
            action={
              <Button asChild>
                <Link to="/">Start shopping</Link>
              </Button>
            }
            secondaryAction={
              <Button variant="outline" asChild>
                <Link to="/deals">See today’s deals</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => {
            const variant = defaultVariant(product)
            const stock = totalStock(product)
            const saving = Math.max(0, variant.mrp - variant.price)
            return (
              <li key={product.id} className="flex flex-col gap-2">
                <ProductCard product={product} wishlisted onToggleWishlist={toggle} />
                {isDealLive(product) && saving > 0 ? (
                  <Badge tone="accent" size="sm" className="mx-1 self-start">
                    Deal price · you save {formatINR(saving)}
                  </Badge>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 px-1">
                  <Button size="sm" disabled={stock === 0} onClick={() => moveToCart(product)}>
                    {stock === 0 ? 'Out of stock' : 'Move to bag'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(product.id)}>
                    Remove
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
