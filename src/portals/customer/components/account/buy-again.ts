import { getView, useCart, type OrderView } from '@/data'

export interface BuyAgainResult {
  added: number
  unavailable: number
}

/**
 * Put everything from a past order back in the bag, keeping the exact variant where it
 * is still sold and skipping anything that has gone.
 */
export function buyAgain(order: OrderView): BuyAgainResult {
  const view = getView()
  const add = useCart.getState().add
  let added = 0
  let unavailable = 0

  for (const item of order.items) {
    const product = view.productById.get(item.productId)
    const variant =
      product?.variants.find((entry) => entry.id === item.variantId && entry.active && entry.stock > 0) ??
      product?.variants.find((entry) => entry.active && entry.stock > 0)
    if (!product || !variant || product.status !== 'live') {
      unavailable += 1
      continue
    }
    add({
      productId: product.id,
      variantId: variant.id,
      sellerId: product.sellerId,
      qty: item.qty,
      stock: variant.stock,
    })
    added += 1
  }

  return { added, unavailable }
}
