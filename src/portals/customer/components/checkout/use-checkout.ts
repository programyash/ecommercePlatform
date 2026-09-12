// One read for the whole checkout: the lines being bought, the shipment each seller
// will send, the delivery promise for the chosen address and the money, computed by
// the same `computeCartSummary` the cart and `placeOrder` use.

import { useMemo } from 'react'
import {
  estimateDelivery,
  getAvailableCoupons,
  isFirstOrder,
  useCart,
  useDemoQuery,
  useSession,
  type Address,
  type Coupon,
  type CouponOffer,
  type Customer,
  type DeliveryEstimate,
  type DeliverySpeed,
  type ID,
  type PaymentMethod,
  type PlatformSettings,
  type Product,
  type Seller,
  type Variant,
} from '@/data'
import { computeCartSummary, type CartSellerGroup, type CartSummary } from '@/lib/pricing'

export interface CheckoutLineView {
  lineId: string
  product: Product
  variant: Variant
  qty: number
  /** Units still available; the line is blocked when this is below `qty`. */
  stock: number
  variantLabel: string
}

export interface CheckoutShipmentView {
  sellerId: ID
  seller: Seller | undefined
  lines: CheckoutLineView[]
  group: CartSellerGroup
  estimate: DeliveryEstimate | null
  express: boolean
  /** Whole days the seller needs before hand-over. */
  dispatchDays: number
}

export interface CheckoutData {
  customer: Customer | undefined
  address: Address | undefined
  addresses: Address[]
  lines: CheckoutLineView[]
  shipments: CheckoutShipmentView[]
  summary: CartSummary
  settings: PlatformSettings
  coupon: Coupon | null
  coupons: CouponOffer[]
  /** Why the order cannot be placed yet, in the shopper's words. */
  blockedReason?: string
  /** True when the chosen PIN code is outside the delivery network. */
  pinUnserviceable: boolean
}

export interface CheckoutState {
  status: 'loading' | 'success' | 'empty' | 'error'
  data: CheckoutData | undefined
  retry: () => void
  /** No lines to check out — the shopper needs to fill the bag first. */
  isEmpty: boolean
  draftAddressId?: ID
  deliverySpeed: Record<ID, DeliverySpeed>
  paymentMethod?: PaymentMethod
  gstInvoice?: { gstin: string; businessName: string }
  couponCode: string | null
}

function labelOf(variant: Variant): string {
  const parts = Object.values(variant.options).filter(Boolean)
  return parts.length ? parts.join(' · ') : 'Standard'
}

/** Everything the three checkout steps render, in one memoised read. */
export function useCheckout(): CheckoutState {
  const customerId = useSession((state) => state.customerId)
  const signedIn = useSession((state) => state.customerSignedIn)
  const cartLines = useCart((state) => state.lines)
  const buyNow = useCart((state) => state.buyNow)
  const couponCode = useCart((state) => state.couponCode)
  const draft = useCart((state) => state.checkout)

  const active = useMemo(() => (buyNow ? [buyNow] : cartLines), [buyNow, cartLines])
  const linesKey = useMemo(() => active.map((line) => `${line.lineId}@${line.qty}`).join(','), [active])
  const speedKey = useMemo(() => JSON.stringify(draft.deliverySpeed), [draft.deliverySpeed])

  const query = useDemoQuery(
    (view): CheckoutData | null => {
      if (active.length === 0) return null
      const customer = signedIn ? view.customerById.get(customerId) : undefined
      const addresses = customer?.addresses ?? []
      const address =
        addresses.find((entry) => entry.id === draft.addressId) ??
        addresses.find((entry) => entry.id === customer?.defaultAddressId)

      const lines: CheckoutLineView[] = []
      for (const line of active) {
        const product = view.productById.get(line.productId)
        const variant = product?.variants.find((entry) => entry.id === line.variantId)
        if (!product || !variant) continue
        lines.push({
          lineId: line.lineId,
          product,
          variant,
          qty: line.qty,
          stock: variant.stock,
          variantLabel: labelOf(variant),
        })
      }

      const coupon = couponCode ? (view.couponByCode.get(couponCode) ?? null) : null
      const summary = computeCartSummary({
        lines: lines.map((line) => ({
          lineId: line.lineId,
          productId: line.product.id,
          variantId: line.variant.id,
          sellerId: line.product.sellerId,
          categoryPath: view.pathByCategory.get(line.product.categoryId) ?? [line.product.categoryId],
          qty: line.qty,
          mrp: line.variant.mrp,
          price: line.variant.price,
          gstRate: line.product.gstRate,
          stock: line.variant.stock,
          cod: line.product.cod,
        })),
        settings: view.settings,
        coupon,
        couponContext: {
          isFirstOrder: isFirstOrder(view, customerId),
          categoryNames: (coupon?.categoryIds ?? [])
            .map((id) => view.categoryById.get(id)?.name.toLowerCase())
            .filter((name): name is string => Boolean(name)),
          sellerName: coupon?.sellerId ? view.sellerById.get(coupon.sellerId)?.displayName : undefined,
        },
        speedBySeller: draft.deliverySpeed,
        paymentMethod: draft.paymentMethod,
        pin: address?.pin ?? null,
      })

      const shipments: CheckoutShipmentView[] = summary.groups.map((group) => {
        const groupLines = lines.filter((line) => group.lineIds.includes(line.lineId))
        const seller = view.sellerById.get(group.sellerId)
        const dispatchDays = groupLines.reduce((most, line) => Math.max(most, line.product.dispatchDays), 1)
        return {
          sellerId: group.sellerId,
          seller,
          lines: groupLines,
          group,
          express: group.express,
          dispatchDays,
          estimate: address
            ? estimateDelivery({
                pin: address.pin,
                fromStateCode: seller?.stateCode ?? '29',
                dispatchDays,
                value: group.itemsTotal,
                cod: groupLines.every((line) => line.product.cod),
                settings: view.settings,
                express: group.express,
              })
            : null,
        }
      })

      const outOfStock = lines.find((line) => line.stock < line.qty)
      const pinUnserviceable = shipments.some((shipment) => shipment.estimate?.serviceable === false)

      return {
        customer,
        address,
        addresses,
        lines,
        shipments,
        summary,
        settings: view.settings,
        coupon,
        coupons: getAvailableCoupons(view, {
          customerId,
          lines: active.map((line) => ({
            lineId: line.lineId,
            productId: line.productId,
            variantId: line.variantId,
            qty: line.qty,
          })),
          paymentMethod: draft.paymentMethod,
        }),
        blockedReason: outOfStock
          ? `${outOfStock.product.title} is out of stock. Remove it from your bag to continue.`
          : pinUnserviceable
            ? `We don’t deliver to ${address?.pin ?? 'this PIN code'} yet. Choose another address.`
            : undefined,
        pinUnserviceable,
      }
    },
    [customerId, signedIn, linesKey, couponCode, draft.addressId, speedKey, draft.paymentMethod],
  )

  return {
    status: active.length === 0 ? 'empty' : query.status,
    data: query.data ?? undefined,
    retry: query.retry,
    isEmpty: active.length === 0 || query.status === 'empty',
    draftAddressId: draft.addressId,
    deliverySpeed: draft.deliverySpeed,
    paymentMethod: draft.paymentMethod,
    gstInvoice: draft.gstInvoice,
    couponCode,
  }
}
