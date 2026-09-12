import { ShoppingBag } from 'lucide-react'
import { Link } from 'react-router'
import { useCart, useDb, type CartLine as CartLineState } from '@/data'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Sheet, SheetClose, SheetContent } from '@/components/ui/sheet'
import { CartLine } from '@/components/commerce/cart-line'
import { formatINR } from '@/lib/format'

interface CartDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lines: CartLineState[]
}

/** Quick view of the bag from the header; the full cart page does the rest. */
export function CartDrawer({ open, onOpenChange, lines }: CartDrawerProps) {
  const setQty = useCart((state) => state.setQty)
  const remove = useCart((state) => state.remove)

  const rows = useDb(
    (view) =>
      lines.flatMap((line) => {
        const product = view.products.find((item) => item.id === line.productId)
        const variant = product?.variants.find((item) => item.id === line.variantId)
        if (!product || !variant) return []
        return [{ line, product, variant }]
      }),
    [lines],
  )

  const subtotal = rows.reduce((sum, row) => sum + row.variant.price * row.line.qty, 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        title="Your bag"
        description={rows.length ? `${rows.length} ${rows.length === 1 ? 'item' : 'items'}` : undefined}
        footer={
          rows.length ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="type-body text-fg-muted">Subtotal</span>
                <span className="type-price text-lg">{formatINR(subtotal)}</span>
              </div>
              <div className="flex gap-2">
                <SheetClose asChild>
                  <Button variant="outline" fullWidth asChild>
                    <Link to="/cart">View bag</Link>
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button fullWidth asChild>
                    <Link to="/checkout/address">Checkout</Link>
                  </Button>
                </SheetClose>
              </div>
            </div>
          ) : undefined
        }
      >
        {rows.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag aria-hidden />}
            title="Your bag is empty"
            description="Items you add will show up here."
            action={
              <SheetClose asChild>
                <Button size="sm">Continue shopping</Button>
              </SheetClose>
            }
          />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {rows.map(({ line, product, variant }) => (
              <li key={line.lineId}>
                <CartLine
                  line={{
                    lineId: line.lineId,
                    productSlug: product.slug,
                    title: product.title,
                    brand: product.brand,
                    image: variant.media?.[0] ?? product.media[0] ?? 'rack-tees',
                    variantLabel: Object.values(variant.options).join(' · ') || undefined,
                    price: variant.price,
                    mrp: variant.mrp,
                    qty: line.qty,
                    maxQty: Math.min(5, variant.stock),
                  }}
                  onQtyChange={(lineId, qty) => setQty(lineId, qty, variant.stock)}
                  onRemove={remove}
                />
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  )
}
