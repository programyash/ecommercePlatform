// Admin reads. Marketplace totals are the same facts the seller screens use, so
// platform GMV always equals the sum of the sellers' GMV for the same range.

import { DEMO_NOW } from '../constants'
import { previousRange, rangeFromPreset, toDayKey } from '@/lib/date'
import { gstBreakup, isIntraState } from '@/lib/tax'
import { couponStatus } from '@/lib/pricing'
import { stockStatus, type StatusTone, type StockStatus } from '@/lib/status'
import { buildSeries, kpi, shipmentFacts, totalsOf, totalsWithPrevious } from './metrics'
import type { View } from '../view'
import type {
  Coupon,
  CouponStatus,
  Customer,
  DateRange,
  ID,
  ISODate,
  Kpi,
  Order,
  Payout,
  PaymentMethod,
  Product,
  ReturnRequest,
  Review,
  SeriesPoint,
  Seller,
  SellerStatus,
  Shipment,
  ShipmentStatus,
} from '../types'

// ── Dashboard ─────────────────────────────────────────────────────────────

export function getAdminKpis(view: View, range: DateRange): Kpi[] {
  const { current, previous } = totalsWithPrevious(view, range)
  const earlier = previousRange(range)

  const joinedIn = (window: DateRange): number =>
    view.customers.filter((customer) => {
      const day = toDayKey(customer.joinedAt)
      return day >= window.from && day <= window.to
    }).length

  const activeSellersIn = (window: DateRange): number => {
    const sellers = new Set<ID>()
    for (const fact of shipmentFacts(view, window)) if (fact.live) sellers.add(fact.shipment.sellerId)
    return sellers.size
  }

  const paymentSuccess = (window: DateRange): number => {
    let total = 0
    let good = 0
    for (const order of view.orders) {
      const day = toDayKey(order.placedAt)
      if (day < window.from || day > window.to) continue
      total += 1
      if (order.payment.status !== 'failed') good += 1
    }
    return total > 0 ? good / total : 0
  }

  const returnRate = current.delivered > 0 ? current.returns / current.delivered : 0
  const previousReturnRate = previous.delivered > 0 ? previous.returns / previous.delivered : 0

  return [
    kpi('gmv', 'GMV', current.gmv, previous.gmv, 'inr', { href: '/admin/reports?report=sales' }),
    kpi('net_revenue', 'Net revenue', current.netRevenue, previous.netRevenue, 'inr', { href: '/admin/reports?report=sales' }),
    kpi('orders', 'Orders', current.orders, previous.orders, 'number', { href: '/admin/orders' }),
    kpi('aov', 'Average order value', current.aov, previous.aov, 'inr'),
    kpi('new_shoppers', 'New shoppers', joinedIn(range), joinedIn(earlier), 'number', { href: '/admin/users' }),
    kpi('active_sellers', 'Active sellers', activeSellersIn(range), activeSellersIn(earlier), 'number', { href: '/admin/sellers' }),
    kpi('return_rate', 'Return rate', returnRate, previousReturnRate, 'percent', { positiveIsGood: false }),
    kpi('payment_success', 'Payment success rate', paymentSuccess(range), paymentSuccess(earlier), 'percent'),
  ]
}

export function getPlatformSeries(view: View, range: DateRange, compare = true): SeriesPoint[] {
  return buildSeries(view, range, { compare })
}

export interface AttentionItem {
  id: string
  label: string
  count: number
  href: string
  tone: StatusTone
}

/** "Needs attention": the queues someone has to clear today. */
export function getNeedsAttention(view: View, now: ISODate = DEMO_NOW): AttentionItem[] {
  const applications = view.sellers.filter((seller) => seller.status === 'under_review').length
  const listings = view.products.filter((product) => product.status === 'pending').length
  const escalated = view.returns.filter((entry) => entry.escalated && entry.status !== 'refunded' && entry.status !== 'rejected').length
  const payoutsOnHold = view.payouts.filter((payout) => payout.status === 'on_hold').length
  const missed = view.shipments.filter(
    (shipment) => (shipment.status === 'placed' || shipment.status === 'confirmed') && shipment.slaDueAt < now,
  ).length
  const flagged = view.reviews.filter((review) => review.status === 'flagged').length

  const items: AttentionItem[] = [
    { id: 'applications', label: `${applications} seller ${applications === 1 ? 'application' : 'applications'}`, count: applications, href: '/admin/sellers?tab=pending', tone: 'warning' },
    { id: 'listings', label: `${listings} ${listings === 1 ? 'listing' : 'listings'} to review`, count: listings, href: '/admin/products?tab=moderation', tone: 'warning' },
    { id: 'returns', label: `${escalated} escalated ${escalated === 1 ? 'return' : 'returns'}`, count: escalated, href: '/admin/orders?view=returns', tone: 'danger' },
    { id: 'payouts', label: `${payoutsOnHold} ${payoutsOnHold === 1 ? 'payout' : 'payouts'} on hold`, count: payoutsOnHold, href: '/admin/payouts?status=on_hold', tone: 'warning' },
    { id: 'dispatch', label: `${missed} missed dispatch ${missed === 1 ? 'deadline' : 'deadlines'}`, count: missed, href: '/admin/orders?view=attention', tone: 'danger' },
    { id: 'reviews', label: `${flagged} flagged ${flagged === 1 ? 'review' : 'reviews'}`, count: flagged, href: '/admin/reviews?tab=flagged', tone: 'warning' },
  ]
  return items.filter((item) => item.count > 0)
}

export function getOrdersByStatus(view: View, range: DateRange): { status: ShipmentStatus; count: number }[] {
  const counts = new Map<ShipmentStatus, number>()
  for (const fact of shipmentFacts(view, range)) {
    counts.set(fact.shipment.status, (counts.get(fact.shipment.status) ?? 0) + 1)
  }
  const order: ShipmentStatus[] = ['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled']
  return order.map((status) => ({ status, count: counts.get(status) ?? 0 })).filter((row) => row.count > 0)
}

export function getPaymentMix(view: View, range: DateRange): { method: PaymentMethod; orders: number; value: number; share: number }[] {
  const counts = new Map<PaymentMethod, { orders: number; value: number }>()
  let total = 0
  for (const order of view.orders) {
    const day = toDayKey(order.placedAt)
    if (day < range.from || day > range.to) continue
    if (order.payment.status === 'failed') continue
    const row = counts.get(order.payment.method) ?? { orders: 0, value: 0 }
    row.orders += 1
    row.value += order.totals.total
    counts.set(order.payment.method, row)
    total += 1
  }
  return [...counts.entries()]
    .map(([method, row]) => ({ method, orders: row.orders, value: Math.round(row.value), share: total > 0 ? row.orders / total : 0 }))
    .sort((a, b) => b.orders - a.orders)
}

export function getCategoryShare(view: View, range: DateRange): { categoryId: ID; name: string; gmv: number; share: number }[] {
  const byRoot = new Map<ID, number>()
  let total = 0
  for (const fact of shipmentFacts(view, range)) {
    if (!fact.live) continue
    for (const item of view.itemsByShipment.get(fact.shipment.id) ?? []) {
      const product = view.productById.get(item.productId)
      if (!product) continue
      const root = (view.pathByCategory.get(product.categoryId) ?? [])[0]
      if (!root) continue
      const value = item.price * item.qty
      byRoot.set(root, (byRoot.get(root) ?? 0) + value)
      total += value
    }
  }
  return [...byRoot.entries()]
    .map(([categoryId, gmv]) => ({
      categoryId,
      name: view.categoryById.get(categoryId)?.name ?? categoryId,
      gmv: Math.round(gmv),
      share: total > 0 ? gmv / total : 0,
    }))
    .sort((a, b) => b.gmv - a.gmv)
}

export function getTopSellers(
  view: View,
  range: DateRange,
  limit = 5,
): { seller: Seller; gmv: number; orders: number; returnRate: number }[] {
  const rows = new Map<ID, { gmv: number; orders: number; delivered: number; returns: number }>()
  for (const fact of shipmentFacts(view, range)) {
    const row = rows.get(fact.shipment.sellerId) ?? { gmv: 0, orders: 0, delivered: 0, returns: 0 }
    row.gmv += fact.revenue
    if (fact.live) row.orders += 1
    if (fact.shipment.status === 'delivered') row.delivered += 1
    if (fact.shipment.returnId) row.returns += 1
    rows.set(fact.shipment.sellerId, row)
  }
  return [...rows.entries()]
    .map(([sellerId, row]) => {
      const seller = view.sellerById.get(sellerId)
      return seller
        ? { seller, gmv: Math.round(row.gmv), orders: row.orders, returnRate: row.delivered > 0 ? row.returns / row.delivered : 0 }
        : null
    })
    .filter((row): row is { seller: Seller; gmv: number; orders: number; returnRate: number } => Boolean(row))
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, limit)
}

export function getTopRegions(
  view: View,
  range: DateRange,
  limit = 5,
): { state: string; city: string; gmv: number; orders: number }[] {
  const rows = new Map<string, { state: string; city: string; gmv: number; orders: number }>()
  for (const fact of shipmentFacts(view, range)) {
    if (!fact.live) continue
    const key = `${fact.order.shipTo.state}|${fact.order.shipTo.city}`
    const row = rows.get(key) ?? { state: fact.order.shipTo.state, city: fact.order.shipTo.city, gmv: 0, orders: 0 }
    row.gmv += fact.revenue
    row.orders += 1
    rows.set(key, row)
  }
  return [...rows.values()]
    .map((row) => ({ ...row, gmv: Math.round(row.gmv) }))
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, limit)
}

// ── Orders ────────────────────────────────────────────────────────────────

export type AdminOrderView = 'all' | 'attention' | 'cod' | 'returns' | 'cancelled'

export interface AdminOrderRow {
  order: Order
  shipments: Shipment[]
  customer: Customer | undefined
  sellers: Seller[]
  units: number
  summaryLabel: string
  summaryTone: StatusTone
}

export interface AdminOrderFilters {
  view?: AdminOrderView
  q?: string
  sellerId?: ID
  status?: ShipmentStatus
  method?: PaymentMethod
  state?: string
  minAmount?: number
  maxAmount?: number
  range?: DateRange
  now?: ISODate
  limit?: number
}

export function getAdminOrders(view: View, filters: AdminOrderFilters = {}): AdminOrderRow[] {
  const now = filters.now ?? DEMO_NOW
  const query = filters.q?.toLowerCase().trim()
  const rows: AdminOrderRow[] = []

  for (const order of view.orders) {
    if (filters.range) {
      const day = toDayKey(order.placedAt)
      if (day < filters.range.from || day > filters.range.to) continue
    }
    const shipments = view.shipmentsByOrder.get(order.id) ?? []
    if (filters.sellerId && !shipments.some((shipment) => shipment.sellerId === filters.sellerId)) continue
    if (filters.status && !shipments.some((shipment) => shipment.status === filters.status)) continue
    if (filters.method && order.payment.method !== filters.method) continue
    if (filters.state && order.shipTo.state !== filters.state) continue
    if (filters.minAmount !== undefined && order.totals.total < filters.minAmount) continue
    if (filters.maxAmount !== undefined && order.totals.total > filters.maxAmount) continue

    switch (filters.view) {
      case 'attention':
        if (
          !shipments.some(
            (shipment) => (shipment.status === 'placed' || shipment.status === 'confirmed') && shipment.slaDueAt < now,
          ) &&
          order.payment.status !== 'failed'
        ) {
          continue
        }
        break
      case 'cod':
        if (order.payment.method !== 'cod') continue
        break
      case 'returns':
        if (!shipments.some((shipment) => shipment.returnId)) continue
        break
      case 'cancelled':
        if (!shipments.some((shipment) => shipment.status === 'cancelled')) continue
        break
      default:
        break
    }

    const customer = view.customerById.get(order.customerId)
    if (query) {
      const awbs = shipments.map((shipment) => shipment.awb ?? '').join(' ')
      const haystack = `${order.id} ${customer?.name ?? ''} ${customer?.phone ?? ''} ${awbs}`.toLowerCase()
      if (!haystack.includes(query)) continue
    }

    const items = shipments.flatMap((shipment) => view.itemsByShipment.get(shipment.id) ?? [])
    const delivered = shipments.filter((shipment) => shipment.status === 'delivered').length
    const cancelled = shipments.filter((shipment) => shipment.status === 'cancelled').length
    const label =
      cancelled === shipments.length
        ? 'Cancelled'
        : delivered === shipments.length
          ? 'Delivered'
          : delivered > 0
            ? `${delivered} of ${shipments.length} delivered`
            : `${shipments.length - cancelled} in progress`
    rows.push({
      order,
      shipments,
      customer,
      sellers: shipments
        .map((shipment) => view.sellerById.get(shipment.sellerId))
        .filter((seller): seller is Seller => Boolean(seller)),
      units: items.reduce((sum, item) => sum + item.qty, 0),
      summaryLabel: label,
      summaryTone: cancelled === shipments.length ? 'danger' : delivered === shipments.length ? 'success' : 'info',
    })
    if (filters.limit && rows.length >= filters.limit) break
  }
  return rows
}

export function getRecentOrders(view: View, limit = 8): AdminOrderRow[] {
  return getAdminOrders(view, { limit })
}

// ── People ────────────────────────────────────────────────────────────────

export interface CustomerRow {
  customer: Customer
  orders: number
  spend: number
  returns: number
  returnRatio: number
  lastOrderAt?: ISODate
}

export function getCustomers(view: View, filters: { q?: string; status?: 'all' | 'active' | 'blocked'; limit?: number } = {}): CustomerRow[] {
  const query = filters.q?.toLowerCase().trim()
  const rows: CustomerRow[] = []
  for (const customer of view.customers) {
    if (filters.status && filters.status !== 'all' && customer.status !== filters.status) continue
    if (query && !`${customer.name} ${customer.email} ${customer.phone}`.toLowerCase().includes(query)) continue
    const orders = view.ordersByCustomer.get(customer.id) ?? []
    let spend = 0
    let returns = 0
    for (const order of orders) {
      if (order.payment.status !== 'failed') spend += order.totals.total
      for (const shipmentId of order.shipmentIds) {
        if (view.shipmentById.get(shipmentId)?.returnId) returns += 1
      }
    }
    rows.push({
      customer,
      orders: orders.length,
      spend,
      returns,
      returnRatio: orders.length > 0 ? returns / orders.length : 0,
      ...(orders[0] ? { lastOrderAt: orders[0].placedAt } : {}),
    })
  }
  return rows.sort((a, b) => b.spend - a.spend).slice(0, filters.limit ?? rows.length)
}

export interface CustomerDetail extends CustomerRow {
  recentOrders: AdminOrderRow[]
  reviews: Review[]
}

export function getCustomerDetail(view: View, customerId: ID): CustomerDetail | null {
  const customer = view.customerById.get(customerId)
  if (!customer) return null
  const row = getCustomers(view, {}).find((entry) => entry.customer.id === customerId)
  const orders = (view.ordersByCustomer.get(customerId) ?? []).slice(0, 20)
  const rows = orders
    .map((order) => getAdminOrders(view, { q: order.id, limit: 1 })[0])
    .filter((entry): entry is AdminOrderRow => Boolean(entry))
  return {
    ...(row ?? { customer, orders: 0, spend: 0, returns: 0, returnRatio: 0 }),
    recentOrders: rows,
    reviews: view.reviews.filter((review) => review.customerId === customerId),
  }
}

export type SellerTab = 'all' | 'pending' | 'action_required' | 'active' | 'suspended' | 'rejected'

export interface SellerRow {
  seller: Seller
  gmv90: number
  orders90: number
  liveProducts: number
  kycVerified: number
  kycRequired: number
  waitingDays: number
}

export function getSellers(view: View, filters: { tab?: SellerTab; q?: string; now?: ISODate } = {}): SellerRow[] {
  const now = filters.now ?? DEMO_NOW
  const range = rangeFromPreset('90d', now)
  const query = filters.q?.toLowerCase().trim()
  const gmvBySeller = new Map<ID, { gmv: number; orders: number }>()
  for (const fact of shipmentFacts(view, range)) {
    const row = gmvBySeller.get(fact.shipment.sellerId) ?? { gmv: 0, orders: 0 }
    row.gmv += fact.revenue
    if (fact.live) row.orders += 1
    gmvBySeller.set(fact.shipment.sellerId, row)
  }

  return view.sellers
    .filter((seller) => {
      switch (filters.tab) {
        case 'pending':
          return seller.status === 'under_review'
        case 'action_required':
          return seller.status === 'action_required'
        case 'active':
          return seller.status === 'active'
        case 'suspended':
          return seller.status === 'suspended'
        case 'rejected':
          return seller.status === 'rejected'
        default:
          return true
      }
    })
    .filter((seller) => !query || `${seller.displayName} ${seller.legalName} ${seller.city} ${seller.ownerName}`.toLowerCase().includes(query))
    .map((seller) => {
      const totals = gmvBySeller.get(seller.id) ?? { gmv: 0, orders: 0 }
      const required = seller.kyc.filter((item) => item.required)
      const submitted = seller.submittedAt ?? seller.joinedAt
      return {
        seller,
        gmv90: Math.round(totals.gmv),
        orders90: totals.orders,
        liveProducts: (view.productsBySeller.get(seller.id) ?? []).filter((product) => product.status === 'live').length,
        kycVerified: required.filter((item) => item.status === 'verified').length,
        kycRequired: required.length,
        waitingDays: Math.max(0, Math.floor((new Date(now).getTime() - new Date(submitted).getTime()) / 86_400_000)),
      }
    })
    .sort((a, b) => {
      if (filters.tab === 'pending') return b.waitingDays - a.waitingDays
      return b.gmv90 - a.gmv90
    })
}

export interface SellerDetail extends SellerRow {
  products: Product[]
  recentShipments: Shipment[]
  payouts: Payout[]
  reviews: Review[]
  /** Every required KYC item verified? Approval is blocked until then. */
  canApprove: boolean
  blockingItems: string[]
}

export function getSellerDetail(view: View, sellerId: ID, now: ISODate = DEMO_NOW): SellerDetail | null {
  const row = getSellers(view, { now }).find((entry) => entry.seller.id === sellerId)
  if (!row) return null
  const blocking = row.seller.kyc.filter((item) => item.required && item.status !== 'verified')
  return {
    ...row,
    products: view.productsBySeller.get(sellerId) ?? [],
    recentShipments: (view.shipmentsBySeller.get(sellerId) ?? []).slice(0, 20),
    payouts: view.payoutsBySeller.get(sellerId) ?? [],
    reviews: view.reviewsBySeller.get(sellerId) ?? [],
    canApprove: blocking.length === 0,
    blockingItems: blocking.map((item) => item.label),
  }
}

/** Seller applications, oldest first. */
export function getApprovalQueue(view: View, now: ISODate = DEMO_NOW): SellerRow[] {
  return getSellers(view, { tab: 'pending', now })
}

// ── Catalogue ─────────────────────────────────────────────────────────────

export interface ModerationRow {
  product: Product
  seller: Seller | undefined
  submittedAt?: ISODate
  changes: string[]
  waitingHours: number
}

export function getModerationQueue(view: View, now: ISODate = DEMO_NOW): ModerationRow[] {
  return view.products
    .filter((product) => product.status === 'pending')
    .map((product) => ({
      product,
      seller: view.sellerById.get(product.sellerId),
      submittedAt: product.moderation?.submittedAt,
      changes: product.moderation?.changes ?? [],
      waitingHours: product.moderation?.submittedAt
        ? Math.max(0, Math.round((new Date(now).getTime() - new Date(product.moderation.submittedAt).getTime()) / 3_600_000))
        : 0,
    }))
    .sort((a, b) => b.waitingHours - a.waitingHours)
}

export interface LowStockRow {
  product: Product
  seller: Seller | undefined
  variantId: ID
  sku: string
  label: string
  stock: number
  status: StockStatus
}

/** Out-of-stock and low-stock variants across every active seller. */
export function getLowStock(view: View, filters: { sellerId?: ID; includeInStock?: boolean } = {}): LowStockRow[] {
  const rows: LowStockRow[] = []
  for (const product of view.products) {
    if (product.status !== 'live') continue
    if (filters.sellerId && product.sellerId !== filters.sellerId) continue
    for (const variant of product.variants) {
      if (!variant.active) continue
      const status = stockStatus(variant.stock, variant.lowStockAt)
      if (!filters.includeInStock && status === 'in_stock') continue
      rows.push({
        product,
        seller: view.sellerById.get(product.sellerId),
        variantId: variant.id,
        sku: variant.sku,
        label: Object.values(variant.options).join(' · ') || 'Single variant',
        stock: variant.stock,
        status,
      })
    }
  }
  return rows.sort((a, b) => a.stock - b.stock)
}

// ── Money and trust ───────────────────────────────────────────────────────

export interface PayoutRow {
  payout: Payout
  seller: Seller | undefined
  shipments: number
}

export function getPayoutBatches(view: View, filters: { status?: Payout['status']; sellerId?: ID; q?: string } = {}): PayoutRow[] {
  const query = filters.q?.toLowerCase().trim()
  return view.payouts
    .filter((payout) => !filters.status || payout.status === filters.status)
    .filter((payout) => !filters.sellerId || payout.sellerId === filters.sellerId)
    .filter((payout) => {
      if (!query) return true
      const seller = view.sellerById.get(payout.sellerId)
      return `${payout.id} ${seller?.displayName ?? ''} ${payout.utr ?? ''}`.toLowerCase().includes(query)
    })
    .map((payout) => ({ payout, seller: view.sellerById.get(payout.sellerId), shipments: payout.shipmentIds.length }))
    .sort((a, b) => b.payout.scheduledFor.localeCompare(a.payout.scheduledFor))
}

export interface CouponRow {
  coupon: Coupon
  status: CouponStatus
  seller?: Seller
  categories: string[]
}

export function getCoupons(view: View, now: ISODate = DEMO_NOW): CouponRow[] {
  return view.coupons
    .map((coupon) => ({
      coupon,
      status: couponStatus(coupon, now),
      ...(coupon.sellerId ? { seller: view.sellerById.get(coupon.sellerId) } : {}),
      categories: (coupon.categoryIds ?? [])
        .map((id) => view.categoryById.get(id)?.name)
        .filter((name): name is string => Boolean(name)),
    }))
    .sort((a, b) => a.status.localeCompare(b.status) || b.coupon.used - a.coupon.used)
}

export interface ReviewRow {
  review: Review
  product: Product | undefined
  seller: Seller | undefined
  customerName: string
}

export function getFlaggedReviews(view: View, filters: { tab?: 'flagged' | 'removed' | 'all' } = {}): ReviewRow[] {
  return view.reviews
    .filter((review) => {
      if (filters.tab === 'removed') return review.status === 'removed'
      if (filters.tab === 'all') return true
      return review.status === 'flagged'
    })
    .map((review) => ({
      review,
      product: view.productById.get(review.productId),
      seller: view.sellerById.get(review.sellerId),
      customerName: view.customerById.get(review.customerId)?.name ?? 'Chowk shopper',
    }))
    .sort((a, b) => (a.review.createdAt < b.review.createdAt ? 1 : -1))
}

/** Returns that need a marketplace decision. */
export function getEscalatedReturns(view: View): { request: ReturnRequest; shipment: Shipment | undefined; seller: Seller | undefined }[] {
  return view.returns
    .filter((request) => request.escalated && request.status !== 'refunded' && request.status !== 'rejected')
    .map((request) => {
      const shipment = view.shipmentById.get(request.shipmentId)
      return { request, shipment, seller: shipment ? view.sellerById.get(shipment.sellerId) : undefined }
    })
}

// ── Reports ───────────────────────────────────────────────────────────────

export type ReportId = 'sales' | 'orders' | 'sellers' | 'shoppers' | 'products' | 'payments' | 'tax'

export interface ReportColumn {
  key: string
  label: string
  format: 'text' | 'inr' | 'number' | 'percent'
  align?: 'left' | 'right'
}

export interface Report {
  id: ReportId
  title: string
  description: string
  kpis: Kpi[]
  series: SeriesPoint[]
  columns: ReportColumn[]
  rows: Record<string, string | number>[]
  totals?: Record<string, string | number>
}

export const REPORTS: { id: ReportId; title: string; description: string }[] = [
  { id: 'sales', title: 'Sales', description: 'GMV, net revenue and refunds over time.' },
  { id: 'orders', title: 'Orders & fulfilment', description: 'On-time dispatch, average dispatch time and cancellations by actor.' },
  { id: 'sellers', title: 'Sellers leaderboard', description: 'GMV, orders, return rate and rating by seller.' },
  { id: 'shoppers', title: 'Shoppers', description: 'New versus returning shoppers and repeat rate.' },
  { id: 'products', title: 'Products & categories', description: 'Units and revenue by category and listing.' },
  { id: 'payments', title: 'Payments', description: 'Method mix, success rate and cash on delivery.' },
  { id: 'tax', title: 'Tax', description: 'GST by state, and TCS and TDS per seller.' },
]

export function getReport(view: View, reportId: ReportId, range: DateRange, filters: { sellerId?: ID; state?: string } = {}): Report {
  const meta = REPORTS.find((entry) => entry.id === reportId) ?? REPORTS[0]
  const facts = shipmentFacts(view, range, filters.sellerId)
  const totals = totalsOf(facts, view)
  const previous = totalsOf(shipmentFacts(view, previousRange(range), filters.sellerId), view)
  const series = buildSeries(view, range, { sellerId: filters.sellerId, compare: true })
  const base = {
    id: reportId,
    title: meta?.title ?? 'Report',
    description: meta?.description ?? '',
    series,
  }

  switch (reportId) {
    case 'orders': {
      const onTime = facts.filter((fact) => {
        const shipped = fact.shipment.events.find((event) => event.code === 'shipped')
        return shipped ? shipped.at <= fact.shipment.slaDueAt : false
      }).length
      const dispatched = facts.filter((fact) => fact.shipment.events.some((event) => event.code === 'shipped')).length
      const cancelledBy = new Map<string, number>()
      for (const fact of facts) {
        if (fact.shipment.status !== 'cancelled') continue
        const by = fact.shipment.cancelledBy ?? 'customer'
        cancelledBy.set(by, (cancelledBy.get(by) ?? 0) + 1)
      }
      return {
        ...base,
        kpis: [
          kpi('shipments', 'Shipments', totals.shipments, previous.shipments, 'number'),
          kpi('on_time', 'On-time dispatch', dispatched > 0 ? onTime / dispatched : 0, 0, 'percent'),
          kpi('cancelled', 'Cancelled', totals.cancelled, previous.cancelled, 'number', { positiveIsGood: false }),
          kpi('delivered', 'Delivered', totals.delivered, previous.delivered, 'number'),
        ],
        columns: [
          { key: 'day', label: 'Day', format: 'text' },
          { key: 'shipments', label: 'Shipments', format: 'number', align: 'right' },
          { key: 'delivered', label: 'Delivered', format: 'number', align: 'right' },
          { key: 'cancelled', label: 'Cancelled', format: 'number', align: 'right' },
        ],
        rows: series.map((point) => {
          const dayFacts = facts.filter((fact) => fact.day === point.day)
          return {
            day: String(point.day),
            shipments: dayFacts.length,
            delivered: dayFacts.filter((fact) => fact.shipment.status === 'delivered').length,
            cancelled: dayFacts.filter((fact) => fact.shipment.status === 'cancelled').length,
          }
        }),
        totals: { day: 'Total', shipments: totals.shipments, delivered: totals.delivered, cancelled: totals.cancelled },
      }
    }
    case 'sellers': {
      const rows = getTopSellers(view, range, 50)
      return {
        ...base,
        kpis: [
          kpi('sellers', 'Sellers with sales', rows.length, 0, 'number'),
          kpi('gmv', 'GMV', totals.gmv, previous.gmv, 'inr'),
          kpi('aov', 'Average order value', totals.aov, previous.aov, 'inr'),
        ],
        columns: [
          { key: 'seller', label: 'Seller', format: 'text' },
          { key: 'city', label: 'City', format: 'text' },
          { key: 'gmv', label: 'GMV', format: 'inr', align: 'right' },
          { key: 'orders', label: 'Orders', format: 'number', align: 'right' },
          { key: 'returnRate', label: 'Return rate', format: 'percent', align: 'right' },
        ],
        rows: rows.map((row) => ({
          seller: row.seller.displayName,
          city: row.seller.city,
          gmv: row.gmv,
          orders: row.orders,
          returnRate: row.returnRate,
        })),
        totals: { seller: 'Total', city: '', gmv: totals.gmv, orders: totals.orders, returnRate: '' },
      }
    }
    case 'shoppers': {
      const buyers = new Map<ID, number>()
      for (const fact of facts) {
        if (!fact.live) continue
        buyers.set(fact.order.customerId, (buyers.get(fact.order.customerId) ?? 0) + 1)
      }
      const repeat = [...buyers.values()].filter((count) => count > 1).length
      const joined = view.customers.filter((customer) => {
        const day = toDayKey(customer.joinedAt)
        return day >= range.from && day <= range.to
      })
      return {
        ...base,
        kpis: [
          kpi('shoppers', 'Shoppers who bought', buyers.size, 0, 'number'),
          kpi('new', 'New shoppers', joined.length, 0, 'number'),
          kpi('repeat', 'Repeat rate', buyers.size > 0 ? repeat / buyers.size : 0, 0, 'percent'),
          kpi('aov', 'Average order value', totals.aov, previous.aov, 'inr'),
        ],
        columns: [
          { key: 'day', label: 'Day', format: 'text' },
          { key: 'newCustomers', label: 'New shoppers', format: 'number', align: 'right' },
          { key: 'orders', label: 'Orders', format: 'number', align: 'right' },
          { key: 'visitors', label: 'Visitors', format: 'number', align: 'right' },
        ],
        rows: series.map((point) => ({
          day: String(point.day),
          newCustomers: view.metricByDay.get(String(point.day))?.newCustomers ?? 0,
          orders: Number(point.orders ?? 0),
          visitors: Number(point.visitors ?? 0),
        })),
      }
    }
    case 'products': {
      const byProduct = new Map<ID, { units: number; revenue: number }>()
      for (const fact of facts) {
        if (!fact.live) continue
        for (const item of view.itemsByShipment.get(fact.shipment.id) ?? []) {
          const row = byProduct.get(item.productId) ?? { units: 0, revenue: 0 }
          row.units += item.qty
          row.revenue += item.price * item.qty
          byProduct.set(item.productId, row)
        }
      }
      const rows = [...byProduct.entries()]
        .map(([productId, row]) => {
          const product = view.productById.get(productId)
          const category = product ? view.categoryById.get(product.categoryId) : undefined
          return {
            product: product?.title ?? productId,
            category: category?.name ?? '',
            seller: product ? (view.sellerById.get(product.sellerId)?.displayName ?? '') : '',
            units: row.units,
            revenue: Math.round(row.revenue),
          }
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 50)
      return {
        ...base,
        kpis: [
          kpi('units', 'Units sold', totals.units, previous.units, 'number'),
          kpi('listings', 'Listings sold', byProduct.size, 0, 'number'),
          kpi('gmv', 'GMV', totals.gmv, previous.gmv, 'inr'),
        ],
        columns: [
          { key: 'product', label: 'Product', format: 'text' },
          { key: 'category', label: 'Category', format: 'text' },
          { key: 'seller', label: 'Seller', format: 'text' },
          { key: 'units', label: 'Units', format: 'number', align: 'right' },
          { key: 'revenue', label: 'Revenue', format: 'inr', align: 'right' },
        ],
        rows,
      }
    }
    case 'payments': {
      const mix = getPaymentMix(view, range)
      const failed = view.orders.filter((order) => {
        const day = toDayKey(order.placedAt)
        return day >= range.from && day <= range.to && order.payment.status === 'failed'
      }).length
      const attempted = view.orders.filter((order) => {
        const day = toDayKey(order.placedAt)
        return day >= range.from && day <= range.to
      }).length
      return {
        ...base,
        kpis: [
          kpi('success', 'Payment success rate', attempted > 0 ? (attempted - failed) / attempted : 0, 0, 'percent'),
          kpi('failed', 'Failed payments', failed, 0, 'number', { positiveIsGood: false }),
          kpi('cod_share', 'Cash on delivery share', mix.find((row) => row.method === 'cod')?.share ?? 0, 0, 'percent'),
          kpi('gmv', 'GMV', totals.gmv, previous.gmv, 'inr'),
        ],
        columns: [
          { key: 'method', label: 'Method', format: 'text' },
          { key: 'orders', label: 'Orders', format: 'number', align: 'right' },
          { key: 'value', label: 'Value', format: 'inr', align: 'right' },
          { key: 'share', label: 'Share', format: 'percent', align: 'right' },
        ],
        rows: mix.map((row) => ({ method: row.method.toUpperCase(), orders: row.orders, value: row.value, share: row.share })),
        totals: { method: 'Total', orders: mix.reduce((sum, row) => sum + row.orders, 0), value: mix.reduce((sum, row) => sum + row.value, 0), share: 1 },
      }
    }
    case 'tax': {
      const byState = new Map<string, { taxable: number; cgst: number; sgst: number; igst: number }>()
      for (const fact of facts) {
        if (!fact.live) continue
        const seller = view.sellerById.get(fact.shipment.sellerId)
        const intra = isIntraState(seller?.stateCode ?? '', fact.order.shipTo.stateCode)
        for (const item of view.itemsByShipment.get(fact.shipment.id) ?? []) {
          const breakup = gstBreakup(item.price * item.qty, item.gstRate, { intraState: intra })
          const row = byState.get(fact.order.shipTo.state) ?? { taxable: 0, cgst: 0, sgst: 0, igst: 0 }
          row.taxable += breakup.taxable
          row.cgst += breakup.cgst
          row.sgst += breakup.sgst
          row.igst += breakup.igst
          byState.set(fact.order.shipTo.state, row)
        }
      }
      const rows = [...byState.entries()]
        .map(([state, row]) => ({
          state,
          taxable: Math.round(row.taxable),
          cgst: Math.round(row.cgst),
          sgst: Math.round(row.sgst),
          igst: Math.round(row.igst),
          total: Math.round(row.cgst + row.sgst + row.igst),
        }))
        .sort((a, b) => b.total - a.total)
      return {
        ...base,
        kpis: [
          kpi('taxable', 'Taxable value', rows.reduce((sum, row) => sum + row.taxable, 0), 0, 'inr'),
          kpi('gst', 'GST collected', rows.reduce((sum, row) => sum + row.total, 0), 0, 'inr'),
          kpi('tcs', 'TCS', Math.round(rows.reduce((sum, row) => sum + row.taxable, 0) * (view.settings.tcsPct / 100)), 0, 'inr'),
          kpi('tds', 'TDS', Math.round(rows.reduce((sum, row) => sum + row.taxable, 0) * (view.settings.tdsPct / 100)), 0, 'inr'),
        ],
        columns: [
          { key: 'state', label: 'State', format: 'text' },
          { key: 'taxable', label: 'Taxable value', format: 'inr', align: 'right' },
          { key: 'cgst', label: 'CGST', format: 'inr', align: 'right' },
          { key: 'sgst', label: 'SGST', format: 'inr', align: 'right' },
          { key: 'igst', label: 'IGST', format: 'inr', align: 'right' },
          { key: 'total', label: 'Total GST', format: 'inr', align: 'right' },
        ],
        rows,
        totals: {
          state: 'Total',
          taxable: rows.reduce((sum, row) => sum + row.taxable, 0),
          cgst: rows.reduce((sum, row) => sum + row.cgst, 0),
          sgst: rows.reduce((sum, row) => sum + row.sgst, 0),
          igst: rows.reduce((sum, row) => sum + row.igst, 0),
          total: rows.reduce((sum, row) => sum + row.total, 0),
        },
      }
    }
    default: {
      return {
        ...base,
        kpis: [
          kpi('gmv', 'GMV', totals.gmv, previous.gmv, 'inr'),
          kpi('net_revenue', 'Net revenue', totals.netRevenue, previous.netRevenue, 'inr'),
          kpi('orders', 'Orders', totals.orders, previous.orders, 'number'),
          kpi('refunds', 'Refunds', totals.refunds, previous.refunds, 'inr', { positiveIsGood: false }),
        ],
        columns: [
          { key: 'day', label: 'Day', format: 'text' },
          { key: 'gmv', label: 'GMV', format: 'inr', align: 'right' },
          { key: 'orders', label: 'Orders', format: 'number', align: 'right' },
          { key: 'units', label: 'Units', format: 'number', align: 'right' },
        ],
        rows: series.map((point) => ({
          day: String(point.day),
          gmv: Number(point.gmv ?? 0),
          orders: Number(point.orders ?? 0),
          units: Number(point.units ?? 0),
        })),
        totals: { day: 'Total', gmv: totals.gmv, orders: totals.orders, units: totals.units },
      }
    }
  }
}

/** Seller account states, for the tabs on the sellers screen. */
export function getSellerCounts(view: View): Record<SellerStatus | 'all', number> {
  const counts: Record<SellerStatus | 'all', number> = {
    all: view.sellers.length,
    draft: 0,
    under_review: 0,
    action_required: 0,
    active: 0,
    suspended: 0,
    rejected: 0,
  }
  for (const seller of view.sellers) counts[seller.status] += 1
  return counts
}
