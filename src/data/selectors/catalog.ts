// Catalogue reads: the category tree, one product, and the rails the storefront
// home page is built from. Everything takes a `View` and returns plain data.

import { DEMO_NOW } from '../constants'
import { discountPercent } from '@/lib/pricing'
import { stockStatus, type StockStatus } from '@/lib/status'
import { estimateDelivery, type DeliveryEstimate } from './delivery'
import type { View } from '../view'
import type { Category, ID, ISODate, Product, ProductOffer, Rating, Seller, Variant } from '../types'

// ── Product helpers ───────────────────────────────────────────────────────

export function activeVariants(product: Product): Variant[] {
  const active = product.variants.filter((variant) => variant.active)
  return active.length > 0 ? active : product.variants
}

/** The price a card shows: the cheapest active variant. */
export function productPrice(product: Product): number {
  return Math.min(...activeVariants(product).map((variant) => variant.price))
}

export function productMrp(product: Product): number {
  const cheapest = activeVariants(product).reduce((best, variant) => (variant.price < best.price ? variant : best))
  return cheapest.mrp
}

export function productDiscount(product: Product): number {
  return discountPercent(productMrp(product), productPrice(product))
}

export function productStock(product: Product): number {
  return activeVariants(product).reduce((sum, variant) => sum + variant.stock, 0)
}

export function productStockStatus(product: Product): StockStatus {
  const total = productStock(product)
  const threshold = Math.max(...activeVariants(product).map((variant) => variant.lowStockAt))
  return stockStatus(total, threshold)
}

/** Is this deal still running? */
export function isDealLive(product: Product, now: ISODate = DEMO_NOW): boolean {
  return product.tags.includes('deal') && (!product.dealEndsAt || product.dealEndsAt > now)
}

/** Shoppers only see live listings from active sellers. */
export function isShoppable(view: View, product: Product): boolean {
  if (product.status !== 'live') return false
  return view.sellerById.get(product.sellerId)?.status === 'active'
}

export function shoppableProducts(view: View): Product[] {
  return view.products.filter((product) => isShoppable(view, product))
}

/** Offers from other sellers, hidden when that seller is not active. */
export function visibleOffers(view: View, product: Product): (ProductOffer & { seller: Seller })[] {
  return product.otherOffers
    .map((offer) => ({ offer, seller: view.sellerById.get(offer.sellerId) }))
    .filter((entry): entry is { offer: ProductOffer; seller: Seller } => entry.seller?.status === 'active')
    .map((entry) => ({ ...entry.offer, seller: entry.seller }))
    .sort((a, b) => a.price - b.price)
}

// ── Categories ────────────────────────────────────────────────────────────

export interface CategoryNode extends Category {
  children: CategoryNode[]
  productCount: number
}

/** Top-level categories with their leaves and live product counts. */
export function getCategoryTree(view: View): CategoryNode[] {
  const countOf = (categoryId: ID): number =>
    (view.productsByCategory.get(categoryId) ?? []).filter((product) => isShoppable(view, product)).length

  const build = (category: Category): CategoryNode => ({
    ...category,
    productCount: countOf(category.id),
    children: (view.childrenByCategory.get(category.id) ?? []).map(build),
  })
  return view.rootCategories.map(build)
}

export function getCategoryBySlug(view: View, slug: string): Category | undefined {
  return view.categoryBySlug.get(slug)
}

/** Root → leaf, for breadcrumbs. */
export function getCategoryPath(view: View, categoryId: ID): Category[] {
  return (view.pathByCategory.get(categoryId) ?? [])
    .map((id) => view.categoryById.get(id))
    .filter((category): category is Category => Boolean(category))
}

export function getCategoryChildren(view: View, categoryId: ID): Category[] {
  return view.childrenByCategory.get(categoryId) ?? []
}

// ── One product ───────────────────────────────────────────────────────────

export interface ProductDetail {
  product: Product
  seller: Seller | undefined
  category: Category | undefined
  path: Category[]
  price: number
  mrp: number
  discount: number
  stock: number
  stockStatus: StockStatus
  offers: (ProductOffer & { seller: Seller })[]
  /** Ratings recomputed from published reviews, falling back to the seeded rating. */
  rating: Rating
  reviewCount: number
  /** True when the listing is hidden from shoppers (suspended seller, blocked listing…). */
  unavailable: boolean
  unavailableReason?: string
}

export function getProductBySlug(view: View, slug: string): ProductDetail | null {
  const product = view.productBySlug.get(slug)
  if (!product) return null
  return getProductDetail(view, product.id)
}

export function getProductDetail(view: View, productId: ID): ProductDetail | null {
  const product = view.productById.get(productId)
  if (!product) return null
  const seller = view.sellerById.get(product.sellerId)
  const reviews = (view.reviewsByProduct.get(product.id) ?? []).filter((review) => review.status === 'published')

  let unavailableReason: string | undefined
  if (seller?.status === 'suspended') unavailableReason = 'This seller is not taking orders at the moment.'
  else if (product.status === 'blocked') unavailableReason = 'This listing has been taken down.'
  else if (product.status !== 'live') unavailableReason = 'This listing is not live yet.'

  return {
    product,
    seller,
    category: view.categoryById.get(product.categoryId),
    path: getCategoryPath(view, product.categoryId),
    price: productPrice(product),
    mrp: productMrp(product),
    discount: productDiscount(product),
    stock: productStock(product),
    stockStatus: productStockStatus(product),
    offers: visibleOffers(view, product),
    rating: product.rating,
    reviewCount: reviews.length,
    unavailable: Boolean(unavailableReason),
    unavailableReason,
  }
}

/** Delivery promise for one product at a PIN code. */
export function getDeliveryEstimate(
  view: View,
  pin: string,
  productId: ID,
  options: { express?: boolean; now?: ISODate } = {},
): DeliveryEstimate | null {
  const product = view.productById.get(productId)
  if (!product) return null
  const seller = view.sellerById.get(product.sellerId)
  return estimateDelivery({
    pin,
    fromStateCode: seller?.stateCode ?? '29',
    dispatchDays: product.dispatchDays,
    value: productPrice(product),
    cod: product.cod,
    settings: view.settings,
    express: options.express,
    now: options.now,
  })
}

/** Same leaf category, then the same top-level category; best rated first. */
export function getSimilarProducts(view: View, productId: ID, limit = 8): Product[] {
  const product = view.productById.get(productId)
  if (!product) return []
  const path = view.pathByCategory.get(product.categoryId) ?? []
  const seen = new Set<ID>([product.id])
  const picks: Product[] = []
  for (const categoryId of [...path].reverse()) {
    const candidates = (view.productsByCategory.get(categoryId) ?? [])
      .filter((entry) => !seen.has(entry.id) && isShoppable(view, entry))
      .sort((a, b) => b.rating.avg - a.rating.avg || b.rating.count - a.rating.count)
    for (const candidate of candidates) {
      if (picks.length >= limit) break
      seen.add(candidate.id)
      picks.push(candidate)
    }
    if (picks.length >= limit) break
  }
  return picks
}

/**
 * "Frequently bought together": cheaper items from the same top-level category,
 * chosen deterministically so the trio never changes between renders.
 */
export function getFrequentlyBoughtTogether(view: View, productId: ID, limit = 2): Product[] {
  const product = view.productById.get(productId)
  if (!product) return []
  const root = (view.pathByCategory.get(product.categoryId) ?? [])[0]
  if (!root) return []
  const price = productPrice(product)
  return (view.productsByCategory.get(root) ?? [])
    .filter((entry) => entry.id !== product.id && isShoppable(view, entry) && productPrice(entry) < price)
    .sort((a, b) => b.rating.count - a.rating.count)
    .slice(0, limit)
}

// ── Rails ─────────────────────────────────────────────────────────────────

export interface Rail {
  id: string
  title: string
  subtitle?: string
  href: string
  products: Product[]
}

/** Deals: anything tagged as a deal, plus everything 30% off or more. */
export function getDeals(view: View, limit = 24, now: ISODate = DEMO_NOW): Product[] {
  return shoppableProducts(view)
    .filter((product) => isDealLive(product, now) || productDiscount(product) >= 30)
    .sort((a, b) => {
      const aDeal = isDealLive(a, now) ? 1 : 0
      const bDeal = isDealLive(b, now) ? 1 : 0
      return bDeal - aDeal || productDiscount(b) - productDiscount(a)
    })
    .slice(0, limit)
}

export function getBestsellers(view: View, limit = 12): Product[] {
  return shoppableProducts(view)
    .filter((product) => product.tags.includes('bestseller'))
    .sort((a, b) => b.rating.count - a.rating.count)
    .slice(0, limit)
}

export function getNewArrivals(view: View, limit = 12): Product[] {
  return shoppableProducts(view)
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit)
}

/** The storefront home rails, in the order the page shows them. */
export function getHomeRails(view: View, now: ISODate = DEMO_NOW): Rail[] {
  const mobiles = (view.productsByCategory.get('cat_mobiles') ?? [])
    .filter((product) => isShoppable(view, product))
    .sort((a, b) => b.rating.count - a.rating.count)
    .slice(0, 12)

  const under499 = shoppableProducts(view)
    .filter((product) => productPrice(product) <= 499)
    .sort((a, b) => productPrice(a) - productPrice(b))
    .slice(0, 12)

  return [
    { id: 'deals', title: 'Deals of the day', subtitle: 'Ends tonight', href: '/deals', products: getDeals(view, 12, now) },
    { id: 'mobiles', title: 'Top picks in mobiles', href: '/c/mobiles-tablets', products: mobiles },
    { id: 'under-499', title: 'Under ₹499', href: '/deals?max=499', products: under499 },
    { id: 'bestsellers', title: 'Bestsellers this week', href: '/search?sort=popularity', products: getBestsellers(view) },
    { id: 'new', title: 'New on Chowk', href: '/search?sort=newest', products: getNewArrivals(view) },
  ].filter((rail) => rail.products.length > 0)
}

/** Sellers for the "Top rated sellers" strip. */
export function getTopRatedSellers(view: View, limit = 6): Seller[] {
  return view.sellers
    .filter((seller) => seller.status === 'active' && seller.rating !== null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.ratingCount - a.ratingCount)
    .slice(0, limit)
}

/** Everything a seller's storefront page needs. */
export function getSellerStore(view: View, slug: string): { seller: Seller; products: Product[] } | null {
  const seller = view.sellerBySlug.get(slug)
  if (!seller) return null
  const products = (view.productsBySeller.get(seller.id) ?? []).filter((product) => product.status === 'live')
  return { seller, products: seller.status === 'active' ? products : [] }
}
