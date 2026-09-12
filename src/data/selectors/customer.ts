// What a shopper sees: their orders, one order in full, and the coupons that
// would actually apply to what is in the cart.

import { DEMO_NOW } from '../constants'
import { toDayKey } from '@/lib/date'
import { evaluateCoupon, type CouponLine } from '@/lib/pricing'
import { deriveOrderSummary, type StatusTone } from '@/lib/status'
import { categoryPath } from '../generate/orders'
import type { View } from '../view'
import type {
  Coupon,
  ID,
  ISODate,
  Order,
  OrderItem,
  PaymentMethod,
  Product,
  ReturnRequest,
  Seller,
  Shipment,
} from '../types'

export interface OrderShipmentView {
  shipment: Shipment
  seller: Seller | undefined
  items: OrderItem[]
  return?: ReturnRequest
  /** Can the shopper still cancel this shipment? */
  canCancel: boolean
  /** Can the shopper still raise a return? */
  canReturn: boolean
  /** Days left to raise a return, when the window is still open. */
  returnWindowDays: number
}

export interface OrderView {
  order: Order
  shipments: OrderShipmentView[]
  items: OrderItem[]
  summary: { label: string; tone: StatusTone }
  sellers: Seller[]
  units: number
}

const RETURNABLE_DAYS_FALLBACK = 7

function buildOrderView(view: View, order: Order, now: ISODate): OrderView {
  const shipments = (view.shipmentsByOrder.get(order.id) ?? []).map((shipment) => {
    const items = view.itemsByShipment.get(shipment.id) ?? []
    const request = shipment.returnId ? view.returnById.get(shipment.returnId) : undefined
    const product = items[0] ? view.productById.get(items[0].productId) : undefined
    const window = product?.returnDays ?? RETURNABLE_DAYS_FALLBACK
    const deliveredDays = shipment.deliveredAt
      ? Math.floor((new Date(now).getTime() - new Date(shipment.deliveredAt).getTime()) / 86_400_000)
      : Infinity
    return {
      shipment,
      seller: view.sellerById.get(shipment.sellerId),
      items,
      ...(request ? { return: request } : {}),
      canCancel: shipment.status === 'placed' || shipment.status === 'confirmed',
      canReturn: shipment.status === 'delivered' && !shipment.returnId && window > 0 && deliveredDays <= window,
      returnWindowDays: Number.isFinite(deliveredDays) ? Math.max(0, window - deliveredDays) : window,
    }
  })

  const sellers = shipments
    .map((entry) => entry.seller)
    .filter((seller): seller is Seller => Boolean(seller))

  return {
    order,
    shipments,
    items: shipments.flatMap((entry) => entry.items),
    summary: deriveOrderSummary(shipments.map((entry) => entry.shipment)),
    sellers,
    units: shipments.reduce((sum, entry) => sum + entry.items.reduce((count, item) => count + item.qty, 0), 0),
  }
}

export interface CustomerOrderFilters {
  /** 'open' | 'delivered' | 'cancelled' | 'returns' */
  status?: 'all' | 'open' | 'delivered' | 'cancelled' | 'returns'
  q?: string
  /** Only orders placed in the last N days. */
  days?: number
  now?: ISODate
}

export function getCustomerOrders(view: View, customerId: ID, filters: CustomerOrderFilters = {}): OrderView[] {
  const now = filters.now ?? DEMO_NOW
  const query = filters.q?.toLowerCase().trim()
  const cutoff = filters.days ? toDayKey(new Date(new Date(now).getTime() - filters.days * 86_400_000)) : undefined

  return (view.ordersByCustomer.get(customerId) ?? [])
    .filter((order) => !cutoff || toDayKey(order.placedAt) >= cutoff)
    .map((order) => buildOrderView(view, order, now))
    .filter((entry) => {
      switch (filters.status) {
        case 'open':
          return entry.shipments.some((shipment) => shipment.shipment.status !== 'delivered' && shipment.shipment.status !== 'cancelled')
        case 'delivered':
          return entry.shipments.some((shipment) => shipment.shipment.status === 'delivered')
        case 'cancelled':
          return entry.shipments.some((shipment) => shipment.shipment.status === 'cancelled')
        case 'returns':
          return entry.shipments.some((shipment) => Boolean(shipment.return))
        default:
          return true
      }
    })
    .filter((entry) => {
      if (!query) return true
      if (entry.order.id.toLowerCase().includes(query)) return true
      return entry.items.some((item) => item.title.toLowerCase().includes(query))
    })
}

export function getOrderDetail(view: View, orderId: ID, now: ISODate = DEMO_NOW): OrderView | null {
  const order = view.orderById.get(orderId)
  return order ? buildOrderView(view, order, now) : null
}

/** Every shipment of an order, for the "1 of 2 delivered" summary on a card. */
export function getOrderSummary(view: View, orderId: ID): { label: string; tone: StatusTone } {
  return deriveOrderSummary(view.shipmentsByOrder.get(orderId) ?? [])
}

/** Has this shopper ordered before? Drives WELCOME100. */
export function isFirstOrder(view: View, customerId: ID): boolean {
  return (view.ordersByCustomer.get(customerId) ?? []).length === 0
}

export interface CartContextLine {
  lineId: string
  productId: ID
  variantId: ID
  qty: number
}

export interface CouponContextInput {
  customerId?: ID
  lines: CartContextLine[]
  paymentMethod?: PaymentMethod
  now?: ISODate
}

export interface CouponOffer {
  coupon: Coupon
  applicable: boolean
  /** The discount if applied, or the reason it cannot be. */
  discount: number
  reason?: string
}

/** Every coupon a shopper could see in the cart, each with a yes or a why-not. */
export function getAvailableCoupons(view: View, input: CouponContextInput): CouponOffer[] {
  const now = input.now ?? DEMO_NOW
  const lines: CouponLine[] = []
  let cartTotal = 0
  for (const line of input.lines) {
    const product = view.productById.get(line.productId)
    const variant = product?.variants.find((entry) => entry.id === line.variantId)
    if (!product || !variant) continue
    const value = variant.price * line.qty
    cartTotal += value
    lines.push({
      lineId: line.lineId,
      sellerId: product.sellerId,
      categoryPath: categoryPath(product.categoryId, view.categories),
      value,
    })
  }

  const firstOrder = input.customerId ? isFirstOrder(view, input.customerId) : true
  return view.coupons
    .filter((coupon) => coupon.endsAt >= now || coupon.startsAt > now)
    .map((coupon) => {
      const categoryNames = (coupon.categoryIds ?? [])
        .map((id) => view.categoryById.get(id)?.name.toLowerCase())
        .filter((name): name is string => Boolean(name))
      const result = evaluateCoupon(coupon, {
        lines,
        cartTotal,
        paymentMethod: input.paymentMethod,
        isFirstOrder: firstOrder,
        categoryNames,
        sellerName: coupon.sellerId ? view.sellerById.get(coupon.sellerId)?.displayName : undefined,
        now,
      })
      return result.ok
        ? { coupon, applicable: true, discount: result.discount }
        : { coupon, applicable: false, discount: 0, reason: result.reason }
    })
    .sort((a, b) => Number(b.applicable) - Number(a.applicable) || b.discount - a.discount)
}

/** Resolve a list of product ids (wishlist, recently viewed) keeping their order. */
export function getProductsByIds(view: View, ids: readonly ID[]): Product[] {
  return ids.map((id) => view.productById.get(id)).filter((product): product is Product => Boolean(product))
}

/** Products a shopper bought before, newest first — "Buy it again". */
export function getBuyAgain(view: View, customerId: ID, limit = 12): Product[] {
  const seen = new Set<ID>()
  const products: Product[] = []
  for (const order of view.ordersByCustomer.get(customerId) ?? []) {
    for (const shipmentId of order.shipmentIds) {
      for (const item of view.itemsByShipment.get(shipmentId) ?? []) {
        if (seen.has(item.productId)) continue
        const product = view.productById.get(item.productId)
        if (!product || product.status !== 'live') continue
        seen.add(item.productId)
        products.push(product)
        if (products.length >= limit) return products
      }
    }
  }
  return products
}

/** Can this shopper review this product (did they receive it)? */
export function canReviewProduct(view: View, customerId: ID, productId: ID): boolean {
  for (const order of view.ordersByCustomer.get(customerId) ?? []) {
    for (const shipmentId of order.shipmentIds) {
      const shipment = view.shipmentById.get(shipmentId)
      if (shipment?.status !== 'delivered') continue
      if ((view.itemsByShipment.get(shipmentId) ?? []).some((item) => item.productId === productId)) return true
    }
  }
  return false
}
