// The Seller Hub reads. Orders are shipments (the unit a seller actually packs),
// and every number here comes from the same facts the admin screens use.

import { DEMO_NOW } from '../constants'
import { rangeFromPreset, toDayKey } from '@/lib/date'
import { buyerDisplayName } from '@/lib/mask'
import { computeSettlement } from '@/lib/settlement'
import {
  isOpenShipmentStatus,
  nextShipmentAction,
  SELLER_ORDER_TABS,
  stockStatus,
  type SellerOrderTabId,
  type StockStatus,
} from '@/lib/status'
import { productPrice, productStock } from './catalog'
import { buildSeries, kpi, totalsWithPrevious } from './metrics'
import type { View } from '../view'
import type {
  DateRange,
  ID,
  ISODate,
  Kpi,
  Order,
  OrderItem,
  Payout,
  Product,
  Review,
  ReturnRequest,
  SeriesPoint,
  Seller,
  Shipment,
  Variant,
} from '../types'

// ── Orders ────────────────────────────────────────────────────────────────

export interface SellerShipmentRow {
  shipment: Shipment
  order: Order
  items: OrderItem[]
  /** "Priya N., Kochi" — sellers never see the full name or phone. */
  buyer: string
  buyerPin: string
  amount: number
  units: number
  prepaid: boolean
  dueAt: ISODate
  overdue: boolean
  /** "Confirm" / "Mark as packed" / "Hand over" / null. */
  action: string | null
  return?: ReturnRequest
}

export interface SellerOrderFilters {
  tab?: SellerOrderTabId | 'all'
  q?: string
  payment?: 'all' | 'prepaid' | 'cod'
  /** 'due_today' or 'overdue'. */
  due?: 'all' | 'due_today' | 'overdue'
  now?: ISODate
}

function toRow(view: View, shipment: Shipment, now: ISODate): SellerShipmentRow | null {
  const order = view.orderById.get(shipment.orderId)
  if (!order) return null
  const items = view.itemsByShipment.get(shipment.id) ?? []
  const customer = view.customerById.get(order.customerId)
  return {
    shipment,
    order,
    items,
    buyer: buyerDisplayName(customer?.name ?? 'Chowk shopper', order.shipTo.city),
    buyerPin: order.shipTo.pin,
    amount: shipment.totals.total,
    units: items.reduce((sum, item) => sum + item.qty, 0),
    prepaid: order.payment.method !== 'cod',
    dueAt: shipment.slaDueAt,
    overdue: isOpenShipmentStatus(shipment.status) && shipment.slaDueAt < now,
    action: nextShipmentAction(shipment.status),
    ...(shipment.returnId ? { return: view.returnById.get(shipment.returnId) } : {}),
  }
}

export function getSellerShipments(view: View, sellerId: ID, filters: SellerOrderFilters = {}): SellerShipmentRow[] {
  const now = filters.now ?? DEMO_NOW
  const tab = filters.tab ?? 'all'
  const tabConfig = SELLER_ORDER_TABS.find((entry) => entry.id === tab)
  const query = filters.q?.toLowerCase().trim()

  return (view.shipmentsBySeller.get(sellerId) ?? [])
    .map((shipment) => toRow(view, shipment, now))
    .filter((row): row is SellerShipmentRow => Boolean(row))
    .filter((row) => {
      if (tab === 'all' || !tabConfig) return true
      if (tabConfig.returnsOnly) return Boolean(row.shipment.returnId)
      return tabConfig.statuses.includes(row.shipment.status)
    })
    .filter((row) => {
      if (!filters.payment || filters.payment === 'all') return true
      return filters.payment === 'prepaid' ? row.prepaid : !row.prepaid
    })
    .filter((row) => {
      if (!filters.due || filters.due === 'all') return true
      if (filters.due === 'overdue') return row.overdue
      return toDayKey(row.dueAt) === toDayKey(now) && isOpenShipmentStatus(row.shipment.status)
    })
    .filter((row) => {
      if (!query) return true
      return (
        row.shipment.id.toLowerCase().includes(query) ||
        row.order.id.toLowerCase().includes(query) ||
        row.buyer.toLowerCase().includes(query) ||
        row.items.some((item) => item.title.toLowerCase().includes(query) || item.variantLabel.toLowerCase().includes(query))
      )
    })
    .sort((a, b) => {
      const openA = isOpenShipmentStatus(a.shipment.status) ? 0 : 1
      const openB = isOpenShipmentStatus(b.shipment.status) ? 0 : 1
      if (openA !== openB) return openA - openB
      return a.dueAt < b.dueAt ? -1 : 1
    })
}

export function getSellerTabCounts(view: View, sellerId: ID): Record<SellerOrderTabId, number> {
  const counts = {
    new: 0, to_pack: 0, ready_to_ship: 0, in_transit: 0, delivered: 0, cancelled: 0, returns: 0,
  } satisfies Record<SellerOrderTabId, number>
  for (const shipment of view.shipmentsBySeller.get(sellerId) ?? []) {
    if (shipment.returnId) counts.returns += 1
    for (const tab of SELLER_ORDER_TABS) {
      if (!tab.returnsOnly && tab.statuses.includes(shipment.status)) counts[tab.id] += 1
    }
  }
  return counts
}

export interface SellerShipmentDetail extends SellerShipmentRow {
  seller: Seller | undefined
  /** What this shipment earns the seller once it is settled. */
  earnings: ReturnType<typeof computeSettlement>
  /** Platform-funded coupons do not reduce the payout. */
  couponFundedByPlatform: boolean
  payout?: Payout
}

export function getSellerShipmentDetail(view: View, shipmentId: ID, now: ISODate = DEMO_NOW): SellerShipmentDetail | null {
  const shipment = view.shipmentById.get(shipmentId)
  if (!shipment) return null
  const row = toRow(view, shipment, now)
  if (!row) return null
  const items = row.items
  let commissionValue = 0
  let value = 0
  let gstRate: OrderItem['gstRate'] = 18
  for (const item of items) {
    const product = view.productById.get(item.productId)
    const category = product ? view.categoryById.get(product.categoryId) : undefined
    const lineValue = item.price * item.qty
    commissionValue += lineValue * (category?.commissionPct ?? 10)
    value += lineValue
    gstRate = item.gstRate
  }
  const sellerFunded = row.order.couponFundedBy === 'seller'
  const saleAmount = shipment.totals.price - (sellerFunded ? shipment.totals.coupon : 0)
  const earnings = computeSettlement(
    [{ id: shipment.id, saleAmount, commissionPct: value > 0 ? commissionValue / value : 10, gstRate }],
    view.settings,
  )
  return {
    ...row,
    seller: view.sellerById.get(shipment.sellerId),
    earnings,
    couponFundedByPlatform: shipment.totals.coupon > 0 && !sellerFunded,
    ...(shipment.payoutId ? { payout: view.payoutById.get(shipment.payoutId) } : {}),
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────

export function getSellerKpis(view: View, sellerId: ID, range: DateRange): Kpi[] {
  const { current, previous } = totalsWithPrevious(view, range, sellerId)
  const seller = view.sellerById.get(sellerId)
  const returnRate = current.delivered > 0 ? current.returns / current.delivered : 0
  const previousReturnRate = previous.delivered > 0 ? previous.returns / previous.delivered : 0

  return [
    kpi('net_sales', 'Net sales', current.gmv, previous.gmv, 'inr', { href: '/seller/sales' }),
    kpi('orders', 'Orders', current.shipments, previous.shipments, 'number', { href: '/seller/orders' }),
    kpi('units', 'Units', current.units, previous.units, 'number'),
    kpi('aov', 'Average order value', current.aov, previous.aov, 'inr'),
    kpi('return_rate', 'Return rate', returnRate, previousReturnRate, 'percent', { positiveIsGood: false }),
    kpi('rating', 'Rating', seller?.rating ?? 0, seller?.rating ?? 0, 'rating', { href: '/seller/reviews' }),
  ]
}

export function getSellerSeries(view: View, sellerId: ID, range: DateRange, compare = true): SeriesPoint[] {
  return buildSeries(view, range, { sellerId, compare })
}

export interface ActionItem {
  id: string
  label: string
  count: number
  href: string
  tone: 'neutral' | 'info' | 'warning' | 'danger'
}

/** The "Action needed" rail: everything waiting for this seller right now. */
export function getSellerActionItems(view: View, sellerId: ID, now: ISODate = DEMO_NOW): ActionItem[] {
  const shipments = view.shipmentsBySeller.get(sellerId) ?? []
  const today = toDayKey(now)
  const toDispatch = shipments.filter(
    (shipment) => (shipment.status === 'confirmed' || shipment.status === 'packed') && toDayKey(shipment.slaDueAt) <= today,
  ).length
  const toConfirm = shipments.filter((shipment) => shipment.status === 'placed').length
  const overdue = shipments.filter((shipment) => isOpenShipmentStatus(shipment.status) && shipment.slaDueAt < now).length
  const returns = shipments.filter((shipment) => {
    const request = shipment.returnId ? view.returnById.get(shipment.returnId) : undefined
    return request?.status === 'requested'
  }).length

  const products = view.productsBySeller.get(sellerId) ?? []
  const lowStock = products.filter((product) => product.status === 'live').reduce(
    (count, product) => count + product.variants.filter((variant) => variant.active && variant.stock > 0 && variant.stock <= variant.lowStockAt).length,
    0,
  )
  const rejected = products.filter((product) => product.status === 'rejected').length
  const pending = products.filter((product) => product.status === 'pending').length
  const reviewsToReply = (view.reviewsBySeller.get(sellerId) ?? []).filter(
    (review) => review.status === 'published' && !review.sellerReply,
  ).length

  const items: ActionItem[] = [
    { id: 'dispatch', label: `${toDispatch} ${toDispatch === 1 ? 'order' : 'orders'} to dispatch by 2:00 PM today`, count: toDispatch, href: '/seller/orders?tab=to_pack', tone: 'warning' },
    { id: 'confirm', label: `${toConfirm} to confirm`, count: toConfirm, href: '/seller/orders?tab=new', tone: 'info' },
    { id: 'overdue', label: `${overdue} past the dispatch deadline`, count: overdue, href: '/seller/orders?due=overdue', tone: 'danger' },
    { id: 'low_stock', label: `${lowStock} low-stock ${lowStock === 1 ? 'variant' : 'variants'}`, count: lowStock, href: '/seller/inventory?low=1', tone: 'warning' },
    { id: 'rejected', label: `${rejected} rejected ${rejected === 1 ? 'listing' : 'listings'}`, count: rejected, href: '/seller/products?tab=rejected', tone: 'danger' },
    { id: 'pending', label: `${pending} ${pending === 1 ? 'listing' : 'listings'} in review`, count: pending, href: '/seller/products?tab=pending', tone: 'neutral' },
    { id: 'returns', label: `${returns} return ${returns === 1 ? 'request' : 'requests'}`, count: returns, href: '/seller/orders?tab=returns', tone: 'warning' },
    { id: 'reviews', label: `${reviewsToReply} ${reviewsToReply === 1 ? 'review' : 'reviews'} to reply to`, count: reviewsToReply, href: '/seller/reviews?filter=unanswered', tone: 'info' },
  ]
  return items.filter((item) => item.count > 0)
}

// ── Catalogue and stock ───────────────────────────────────────────────────

export type SellerProductTab = 'all' | 'live' | 'pending' | 'rejected' | 'draft' | 'inactive'

export function getSellerProducts(view: View, sellerId: ID, filters: { tab?: SellerProductTab; q?: string } = {}): Product[] {
  const query = filters.q?.toLowerCase().trim()
  return (view.productsBySeller.get(sellerId) ?? [])
    .filter((product) => {
      switch (filters.tab) {
        case 'live':
          return product.status === 'live'
        case 'pending':
          return product.status === 'pending'
        case 'rejected':
          return product.status === 'rejected' || product.status === 'blocked'
        case 'draft':
          return product.status === 'draft'
        case 'inactive':
          return product.status === 'inactive'
        default:
          return true
      }
    })
    .filter((product) => !query || product.title.toLowerCase().includes(query) || product.brand.toLowerCase().includes(query))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
}

export interface InventoryRow {
  product: Product
  variant: Variant
  status: StockStatus
  /** Units sold in the last 30 days, for "sells out in about N days". */
  sold30: number
  daysOfCover: number | null
}

export function getSellerInventory(
  view: View,
  sellerId: ID,
  filters: { lowOnly?: boolean; q?: string; now?: ISODate } = {},
): InventoryRow[] {
  const now = filters.now ?? DEMO_NOW
  const range = rangeFromPreset('30d', now)
  const sold = new Map<ID, number>()
  for (const shipment of view.shipmentsBySeller.get(sellerId) ?? []) {
    if (shipment.status === 'cancelled') continue
    const order = view.orderById.get(shipment.orderId)
    if (!order || toDayKey(order.placedAt) < range.from) continue
    for (const item of view.itemsByShipment.get(shipment.id) ?? []) {
      sold.set(item.variantId, (sold.get(item.variantId) ?? 0) + item.qty)
    }
  }

  const query = filters.q?.toLowerCase().trim()
  const rows: InventoryRow[] = []
  for (const product of view.productsBySeller.get(sellerId) ?? []) {
    if (product.status === 'draft') continue
    if (query && !product.title.toLowerCase().includes(query) && !product.brand.toLowerCase().includes(query)) continue
    for (const variant of product.variants) {
      const sold30 = sold.get(variant.id) ?? 0
      const perDay = sold30 / 30
      rows.push({
        product,
        variant,
        status: stockStatus(variant.stock, variant.lowStockAt),
        sold30,
        daysOfCover: perDay > 0 ? Math.round(variant.stock / perDay) : null,
      })
    }
  }
  return rows
    .filter((row) => !filters.lowOnly || row.status !== 'in_stock')
    .sort((a, b) => a.variant.stock - b.variant.stock)
}

// ── Money ─────────────────────────────────────────────────────────────────

export function getSellerPayouts(view: View, sellerId: ID): Payout[] {
  return (view.payoutsBySeller.get(sellerId) ?? [])
    .slice()
    .sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor))
}

/** The next payout the seller is waiting for. */
export function getNextPayout(view: View, sellerId: ID): Payout | null {
  return (
    getSellerPayouts(view, sellerId)
      .filter((payout) => payout.status !== 'paid' && payout.status !== 'failed')
      .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))[0] ?? null
  )
}

// ── Reviews ───────────────────────────────────────────────────────────────

export interface SellerReviewRow {
  review: Review
  product: Product | undefined
  customerName: string
}

export function getSellerReviews(
  view: View,
  sellerId: ID,
  filters: { filter?: 'all' | 'unanswered' | 'critical' | 'flagged'; q?: string } = {},
): SellerReviewRow[] {
  const query = filters.q?.toLowerCase().trim()
  return (view.reviewsBySeller.get(sellerId) ?? [])
    .filter((review) => {
      switch (filters.filter) {
        case 'unanswered':
          return review.status === 'published' && !review.sellerReply
        case 'critical':
          return review.rating <= 2
        case 'flagged':
          return review.status === 'flagged'
        default:
          return review.status !== 'removed'
      }
    })
    .filter((review) => !query || review.title.toLowerCase().includes(query) || review.body.toLowerCase().includes(query))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((review) => ({
      review,
      product: view.productById.get(review.productId),
      customerName: buyerDisplayName(view.customerById.get(review.customerId)?.name ?? 'Chowk shopper'),
    }))
}

/** Rating snapshot for the dashboard: average and star counts across the store. */
export function getSellerRatingSummary(view: View, sellerId: ID): { average: number; count: number; dist: [number, number, number, number, number] } {
  const reviews = (view.reviewsBySeller.get(sellerId) ?? []).filter((review) => review.status === 'published')
  const dist: [number, number, number, number, number] = [0, 0, 0, 0, 0]
  let total = 0
  for (const review of reviews) {
    const index = 5 - review.rating
    dist[index] = (dist[index] ?? 0) + 1
    total += review.rating
  }
  const seller = view.sellerById.get(sellerId)
  return {
    average: reviews.length > 0 ? Math.round((total / reviews.length) * 10) / 10 : (seller?.rating ?? 0),
    count: reviews.length,
    dist,
  }
}

/** Best sellers for the dashboard table: units, revenue and what is left in stock. */
export function getSellerTopProducts(
  view: View,
  sellerId: ID,
  range: DateRange,
  limit = 5,
): { product: Product; units: number; revenue: number; stock: number }[] {
  const byProduct = new Map<ID, { units: number; revenue: number }>()
  for (const shipment of view.shipmentsBySeller.get(sellerId) ?? []) {
    if (shipment.status === 'cancelled') continue
    const order = view.orderById.get(shipment.orderId)
    if (!order) continue
    const day = toDayKey(order.placedAt)
    if (day < range.from || day > range.to) continue
    for (const item of view.itemsByShipment.get(shipment.id) ?? []) {
      const row = byProduct.get(item.productId) ?? { units: 0, revenue: 0 }
      row.units += item.qty
      row.revenue += item.price * item.qty
      byProduct.set(item.productId, row)
    }
  }
  return [...byProduct.entries()]
    .map(([productId, row]) => {
      const product = view.productById.get(productId)
      return product ? { product, units: row.units, revenue: Math.round(row.revenue), stock: productStock(product) } : null
    })
    .filter((row): row is { product: Product; units: number; revenue: number; stock: number } => Boolean(row))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

/** The price a seller's listing shows in its own catalogue table. */
export function sellerProductPrice(product: Product): number {
  return productPrice(product)
}
