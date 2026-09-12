import { ShoppingBag } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { isShoppable, shoppableProducts, useCart, useDb, type Product } from '@/data'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { defaultVariant } from '@/components/commerce/product-card'
import { usePageTitle } from '@/lib/use-page-title'

/** The showcase pair: two sellers, so the demo bag always splits into two shipments. */
const SHOWCASE_SLUGS = ['voltix-nova-5g', 'kaira-embroidered-cotton-kurta-set']

function pickSamples(products: Product[]): Product[] {
  const sellers = new Set<string>()
  const picks: Product[] = []
  for (const product of products) {
    if (sellers.has(product.sellerId)) continue
    sellers.add(product.sellerId)
    picks.push(product)
    if (picks.length === 2) break
  }
  return picks
}

/**
 * Checkout with nothing to buy. The sample bag is a reviewer's shortcut into the flow —
 * it adds two real catalogue products from two sellers, exactly as the storefront would.
 */
export function EmptyBag() {
  usePageTitle('Checkout')
  const add = useCart((state) => state.add)

  const samples = useDb((view) => {
    const showcase = SHOWCASE_SLUGS.map((slug) => view.productBySlug.get(slug)).filter(
      (product): product is Product => Boolean(product) && isShoppable(view, product as Product),
    )
    return showcase.length === 2 ? showcase : pickSamples(shoppableProducts(view))
  }, [])

  return (
    <div className="mx-auto flex max-w-form flex-col gap-4 py-6">
      <h1 className="sr-only">Checkout</h1>
      <div className="rounded-card border border-border bg-surface">
        <EmptyState
          icon={<ShoppingBag aria-hidden />}
          title="Your bag is empty"
          description="Add something to your bag and we’ll take you through delivery, summary and payment."
          action={
            <Button asChild>
              <Link to="/">Continue shopping</Link>
            </Button>
          }
          secondaryAction={
            samples.length > 0 ? (
              <Button
                variant="outline"
                onClick={() => {
                  for (const product of samples) {
                    const variant = defaultVariant(product)
                    add({
                      productId: product.id,
                      variantId: variant.id,
                      sellerId: product.sellerId,
                      qty: 1,
                      stock: variant.stock,
                    })
                  }
                  toast.success('Sample bag added', {
                    description: `${samples.length} items from ${samples.length} sellers, so the order splits into ${samples.length} shipments.`,
                  })
                }}
              >
                Fill a sample bag
              </Button>
            ) : null
          }
        />
      </div>
      <p className="text-center type-caption text-fg-subtle">
        Every product, price and seller in this demo is synthetic.
      </p>
    </div>
  )
}
