// The seed database: built once, lazily, then treated as immutable. Everything a
// portal shows is either in here or in the overlay of changes the demo has made
// (see view.ts). Building is deterministic — same data on every load.

import { DEFAULT_SETTINGS } from './constants'
import { generateAudit } from './generate/audit'
import { generateCustomers } from './generate/customers'
import { generateMetrics } from './generate/metrics'
import { generateNotifications } from './generate/notifications'
import { generateOrders, type OrderWorld } from './generate/orders'
import { generatePayouts } from './generate/payouts'
import { generateReviews } from './generate/reviews'
import { generateStoryOrders } from './generate/story-orders'
import { SEED_ADMINS, SEED_ROLES } from './seed/admin'
import { SEED_CATEGORIES } from './seed/categories'
import { SEED_COUPONS } from './seed/coupons'
import { SEED_CUSTOMERS } from './seed/customers'
import { SEED_PRODUCTS } from './seed/products'
import { SEED_SELLERS } from './seed/sellers'
import type {
  AdminUser,
  AuditEntry,
  Category,
  Coupon,
  Customer,
  DailyMetric,
  DayKey,
  ID,
  Notification,
  Order,
  OrderItem,
  Payout,
  PlatformSettings,
  Product,
  ReturnRequest,
  Review,
  Role,
  Seller,
  Shipment,
} from './types'

/** The raw collections, before indexing. The overlay merges at this level. */
export interface DbCore {
  settings: PlatformSettings
  categories: Category[]
  products: Product[]
  sellers: Seller[]
  customers: Customer[]
  orders: Order[]
  shipments: Shipment[]
  items: OrderItem[]
  returns: ReturnRequest[]
  reviews: Review[]
  payouts: Payout[]
  coupons: Coupon[]
  notifications: Notification[]
  audit: AuditEntry[]
  metrics: DailyMetric[]
  roles: Role[]
  admins: AdminUser[]
}

export interface Db {
  settings: PlatformSettings

  categories: Category[]
  rootCategories: Category[]
  categoryById: Map<ID, Category>
  categoryBySlug: Map<string, Category>
  childrenByCategory: Map<ID, Category[]>
  /** Root → leaf ids for every category. */
  pathByCategory: Map<ID, ID[]>

  products: Product[]
  productById: Map<ID, Product>
  productBySlug: Map<string, Product>
  /** Products filed under a category *or any of its descendants*. */
  productsByCategory: Map<ID, Product[]>
  productsBySeller: Map<ID, Product[]>

  sellers: Seller[]
  sellerById: Map<ID, Seller>
  sellerBySlug: Map<string, Seller>

  customers: Customer[]
  customerById: Map<ID, Customer>

  orders: Order[]
  orderById: Map<ID, Order>
  ordersByCustomer: Map<ID, Order[]>

  shipments: Shipment[]
  shipmentById: Map<ID, Shipment>
  shipmentsByOrder: Map<ID, Shipment[]>
  shipmentsBySeller: Map<ID, Shipment[]>

  items: OrderItem[]
  itemById: Map<ID, OrderItem>
  itemsByShipment: Map<ID, OrderItem[]>

  returns: ReturnRequest[]
  returnById: Map<ID, ReturnRequest>
  returnByShipment: Map<ID, ReturnRequest>

  reviews: Review[]
  reviewById: Map<ID, Review>
  reviewsByProduct: Map<ID, Review[]>
  reviewsBySeller: Map<ID, Review[]>

  payouts: Payout[]
  payoutById: Map<ID, Payout>
  payoutsBySeller: Map<ID, Payout[]>

  coupons: Coupon[]
  couponByCode: Map<string, Coupon>

  notifications: Notification[]
  audit: AuditEntry[]
  metrics: DailyMetric[]
  metricByDay: Map<DayKey, DailyMetric>

  roles: Role[]
  admins: AdminUser[]
  adminById: Map<ID, AdminUser>
}

function groupBy<T>(items: readonly T[], key: (item: T) => ID | undefined): Map<ID, T[]> {
  const map = new Map<ID, T[]>()
  for (const item of items) {
    const id = key(item)
    if (id === undefined) continue
    const list = map.get(id)
    if (list) list.push(item)
    else map.set(id, [item])
  }
  return map
}

function byId<T extends { id: ID }>(items: readonly T[]): Map<ID, T> {
  return new Map(items.map((item) => [item.id, item]))
}

function buildCategoryIndexes(categories: Category[]) {
  const categoryById = byId(categories)
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]))
  const childrenByCategory = groupBy(categories, (category) => category.parentId ?? undefined)
  for (const list of childrenByCategory.values()) list.sort((a, b) => a.sortOrder - b.sortOrder)

  const pathByCategory = new Map<ID, ID[]>()
  for (const category of categories) {
    const path: ID[] = []
    let current: Category | undefined = category
    let guard = 0
    while (current && guard < 8) {
      path.unshift(current.id)
      current = current.parentId ? categoryById.get(current.parentId) : undefined
      guard += 1
    }
    pathByCategory.set(category.id, path)
  }
  return { categoryById, categoryBySlug, childrenByCategory, pathByCategory }
}

/** Index a set of collections. Used for the seed database and for every merged view. */
export function indexDb(core: DbCore): Db {
  const categories = core.categories
  const { categoryById, categoryBySlug, childrenByCategory, pathByCategory } = buildCategoryIndexes(categories)
  const rootCategories = categories.filter((category) => category.parentId === null)
  const { products, sellers, customers, orders, shipments, items, returns, reviews, payouts, coupons } = core

  const productsByCategory = new Map<ID, Product[]>()
  for (const product of products) {
    for (const categoryId of pathByCategory.get(product.categoryId) ?? [product.categoryId]) {
      const list = productsByCategory.get(categoryId)
      if (list) list.push(product)
      else productsByCategory.set(categoryId, [product])
    }
  }

  const returnByShipment = new Map<ID, ReturnRequest>()
  for (const entry of returns) returnByShipment.set(entry.shipmentId, entry)

  const shipmentsBySeller = groupBy(shipments, (shipment) => shipment.sellerId)
  for (const list of shipmentsBySeller.values()) list.sort((a, b) => (a.slaDueAt < b.slaDueAt ? 1 : -1))

  return {
    settings: core.settings,
    categories,
    rootCategories,
    categoryById,
    categoryBySlug,
    childrenByCategory,
    pathByCategory,

    products,
    productById: byId(products),
    productBySlug: new Map(products.map((product) => [product.slug, product])),
    productsByCategory,
    productsBySeller: groupBy(products, (product) => product.sellerId),

    sellers,
    sellerById: byId(sellers),
    sellerBySlug: new Map(sellers.map((seller) => [seller.slug, seller])),

    customers,
    customerById: byId(customers),

    orders,
    orderById: byId(orders),
    ordersByCustomer: groupBy(orders, (order) => order.customerId),

    shipments,
    shipmentById: byId(shipments),
    shipmentsByOrder: groupBy(shipments, (shipment) => shipment.orderId),
    shipmentsBySeller,

    items,
    itemById: byId(items),
    itemsByShipment: groupBy(items, (item) => item.shipmentId),

    returns,
    returnById: byId(returns),
    returnByShipment,

    reviews,
    reviewById: byId(reviews),
    reviewsByProduct: groupBy(reviews, (review) => review.productId),
    reviewsBySeller: groupBy(reviews, (review) => review.sellerId),

    payouts,
    payoutById: byId(payouts),
    payoutsBySeller: groupBy(payouts, (payout) => payout.sellerId),

    coupons,
    couponByCode: new Map(coupons.map((coupon) => [coupon.code, coupon])),

    notifications: core.notifications,
    audit: core.audit,
    metrics: core.metrics,
    metricByDay: new Map(core.metrics.map((metric) => [metric.day, metric])),

    roles: core.roles,
    admins: core.admins,
    adminById: byId(core.admins),
  }
}

function buildCore(): DbCore {
  const settings = DEFAULT_SETTINGS
  const categories = SEED_CATEGORIES.slice().sort((a, b) => a.sortOrder - b.sortOrder)

  const sellers = SEED_SELLERS
  const products = SEED_PRODUCTS
  const customers: Customer[] = [...SEED_CUSTOMERS, ...generateCustomers()]
  const coupons = SEED_COUPONS

  const world: OrderWorld = { products, customers, sellers, categories, coupons, settings }
  const history = generateOrders(world)
  const story = generateStoryOrders(world)

  const orders = [...history.orders, ...story.orders].sort((a, b) => (a.placedAt < b.placedAt ? 1 : -1))
  const shipments = [...history.shipments, ...story.shipments]
  const items = [...history.items, ...story.items]
  const returns = [...history.returns, ...story.returns]

  // Payouts stamp `payoutId` on the shipments they settle.
  const payouts = generatePayouts({ sellers, orders, shipments, items, products, categories, returns, settings })

  const reviews = generateReviews({ products, categories, customers, orders, shipments, items })
  const metrics = generateMetrics({ orders, shipments, items, customers })
  const notifications = generateNotifications({ orders, shipments, customers, sellers, products, reviews, payouts, returns })
  const audit = generateAudit({ sellers, products, orders, shipments, reviews, payouts, coupons })

  return {
    settings,
    categories,
    products,
    sellers,
    customers,
    orders,
    shipments,
    items,
    returns,
    reviews,
    payouts,
    coupons,
    notifications,
    audit,
    metrics,
    roles: SEED_ROLES,
    admins: SEED_ADMINS,
  }
}

let cachedCore: DbCore | null = null
let cachedDb: Db | null = null

/** The seed collections, generated once. */
export function getDbCore(): DbCore {
  if (!cachedCore) cachedCore = buildCore()
  return cachedCore
}

/** The seed database, indexed. Built on first use, then reused for the life of the tab. */
export function getDb(): Db {
  if (!cachedDb) cachedDb = indexDb(getDbCore())
  return cachedDb
}
