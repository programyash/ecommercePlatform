// Listing, search, deals and store pages are all the same query with different
// presets, so there is one implementation: filter → facet → sort → page.

import { DEMO_NOW } from '../constants'
import { discountPercent } from '@/lib/pricing'
import { isDealLive, isShoppable, productDiscount, productPrice, productStock } from './catalog'
import { estimateDelivery } from './delivery'
import type { View } from '../view'
import type { FacetDef, ID, ISODate, Page, Product, ProductTag } from '../types'

export type SortKey = 'relevance' | 'popularity' | 'price_asc' | 'price_desc' | 'newest' | 'discount' | 'rating'

export interface SearchFilters {
  brands?: string[]
  sellers?: ID[]
  minPrice?: number
  maxPrice?: number
  /** 4 means "4★ and above". */
  minRating?: number
  /** 25 means "25% off or more". */
  minDiscount?: number
  cod?: boolean
  /** Arrives within two days at `pin`. */
  fastDelivery?: boolean
  /** Hide out-of-stock listings (they are shown by default, marked as such). */
  inStock?: boolean
  /** Category facet values, e.g. `{ storage: ['128 GB'], colour: ['Black'] }`. */
  attributes?: Record<string, string[]>
  tags?: ProductTag[]
  pin?: string
}

export interface SearchQuery {
  q?: string
  categorySlug?: string
  categoryId?: ID
  sellerId?: ID
  filters?: SearchFilters
  sort?: SortKey
  page?: number
  pageSize?: number
  now?: ISODate
}

export interface FacetOption {
  value: string
  label: string
  count: number
}

export interface SearchFacets {
  brands: FacetOption[]
  sellers: FacetOption[]
  categories: FacetOption[]
  ratings: FacetOption[]
  discounts: FacetOption[]
  price: { min: number; max: number }
  attributes: { key: string; label: string; options: FacetOption[] }[]
  codCount: number
  fastDeliveryCount: number
  inStockCount: number
  outOfStockCount: number
}

export interface SearchResult extends Page<Product> {
  facets: SearchFacets
  /** Set when a typo probably cost the shopper their results. */
  didYouMean?: string
  /** The sellers and categories that also match the words typed. */
  matchingSellers: { id: ID; name: string; slug: string }[]
  matchingCategories: { id: ID; name: string; slug: string }[]
}

// ── Text matching ─────────────────────────────────────────────────────────

function tokens(value: string): string[] {
  return value.toLowerCase().split(/[^a-z0-9₹.]+/i).filter((token) => token.length > 1)
}

function haystack(view: View, product: Product): string {
  const category = view.categoryById.get(product.categoryId)
  return [product.title, product.brand, category?.name ?? '', product.keywords.join(' ')].join(' ').toLowerCase()
}

/** Levenshtein distance, capped — only used for "did you mean". */
function editDistance(a: string, b: string, cap = 3): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i]
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1
      current[j] = Math.min(
        (current[j - 1] ?? 0) + 1,
        (previous[j] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      )
    }
    previous = current
  }
  return previous[b.length] ?? cap + 1
}

function vocabulary(view: View): Set<string> {
  const words = new Set<string>()
  for (const product of view.products) {
    for (const token of tokens(`${product.title} ${product.brand} ${product.keywords.join(' ')}`)) words.add(token)
  }
  for (const category of view.categories) for (const token of tokens(category.name)) words.add(token)
  return words
}

let vocabularyCache: { view: View; words: Set<string> } | null = null

function vocabularyFor(view: View): Set<string> {
  if (!vocabularyCache || vocabularyCache.view !== view) vocabularyCache = { view, words: vocabulary(view) }
  return vocabularyCache.words
}

/** "wireles earbds" → "wireless earbuds", or undefined when every word is known. */
export function suggestSpelling(view: View, query: string): string | undefined {
  const words = vocabularyFor(view)
  const parts = tokens(query)
  if (parts.length === 0) return undefined
  let changed = false
  const fixed = parts.map((part) => {
    if (words.has(part) || part.length < 4) return part
    let best: { word: string; distance: number } | null = null
    for (const word of words) {
      if (Math.abs(word.length - part.length) > 2) continue
      const distance = editDistance(part, word, 2)
      if (distance <= 2 && (!best || distance < best.distance)) best = { word, distance }
      if (best?.distance === 1) break
    }
    if (best) {
      changed = true
      return best.word
    }
    return part
  })
  return changed ? fixed.join(' ') : undefined
}

function matchScore(view: View, product: Product, parts: string[]): number {
  if (parts.length === 0) return 1
  const hay = haystack(view, product)
  let score = 0
  for (const part of parts) {
    if (!hay.includes(part)) return 0
    if (product.title.toLowerCase().includes(part)) score += 3
    else if (product.brand.toLowerCase().includes(part)) score += 2
    else score += 1
  }
  return score
}

// ── Facets ────────────────────────────────────────────────────────────────

function attributeValue(product: Product, facet: FacetDef): string[] {
  if (facet.source.kind === 'axis') {
    const axis = facet.source.axis
    const values = product.variants
      .filter((variant) => variant.active)
      .map((variant) => variant.options[axis])
      .filter((value): value is string => Boolean(value))
    return [...new Set(values)]
  }
  const label = facet.source.label.toLowerCase()
  for (const group of product.specs) {
    for (const item of group.items) {
      if (item.label.toLowerCase() === label) return [item.value]
    }
  }
  return []
}

function countOptions(values: { value: string; label?: string }[]): FacetOption[] {
  const counts = new Map<string, { label: string; count: number }>()
  for (const entry of values) {
    const current = counts.get(entry.value)
    if (current) current.count += 1
    else counts.set(entry.value, { label: entry.label ?? entry.value, count: 1 })
  }
  return [...counts.entries()]
    .map(([value, entry]) => ({ value, label: entry.label, count: entry.count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

// ── The query ─────────────────────────────────────────────────────────────

export function searchProducts(view: View, query: SearchQuery = {}): SearchResult {
  const now = query.now ?? DEMO_NOW
  const filters = query.filters ?? {}
  const page = Math.max(1, query.page ?? 1)
  const pageSize = query.pageSize ?? 24

  const category = query.categoryId
    ? view.categoryById.get(query.categoryId)
    : query.categorySlug
      ? view.categoryBySlug.get(query.categorySlug)
      : undefined

  let pool = category ? (view.productsByCategory.get(category.id) ?? []) : view.products
  pool = pool.filter((product) => isShoppable(view, product))
  if (query.sellerId) pool = pool.filter((product) => product.sellerId === query.sellerId)
  if (filters.tags?.length) pool = pool.filter((product) => filters.tags?.some((tag) => product.tags.includes(tag)))

  const parts = tokens(query.q ?? '')
  const scored = pool
    .map((product) => ({ product, score: matchScore(view, product, parts) }))
    .filter((entry) => entry.score > 0)

  // Facets are counted on everything that matched the words and the category.
  const facetPool = scored.map((entry) => entry.product)
  const deliveryDays = new Map<ID, number>()
  if (filters.pin) {
    for (const product of facetPool) {
      const seller = view.sellerById.get(product.sellerId)
      const estimate = estimateDelivery({
        pin: filters.pin,
        fromStateCode: seller?.stateCode ?? '29',
        dispatchDays: product.dispatchDays,
        value: productPrice(product),
        cod: product.cod,
        settings: view.settings,
        now,
      })
      deliveryDays.set(product.id, estimate.serviceable ? estimate.days : 99)
    }
  }

  const facetCategories = category
    ? (view.childrenByCategory.get(category.id) ?? [])
    : view.rootCategories
  const facetPoolIds = new Set(facetPool.map((product) => product.id))
  const categoryCounts = facetCategories.map((child) => ({
    value: child.slug,
    label: child.name,
    count: (view.productsByCategory.get(child.id) ?? []).filter((product) => facetPoolIds.has(product.id)).length,
  }))

  const prices = facetPool.map(productPrice)
  const facets: SearchFacets = {
    brands: countOptions(facetPool.map((product) => ({ value: product.brand }))),
    sellers: countOptions(
      facetPool.map((product) => ({
        value: product.sellerId,
        label: view.sellerById.get(product.sellerId)?.displayName ?? product.sellerId,
      })),
    ),
    categories: categoryCounts.filter((entry) => entry.count > 0),
    ratings: [4, 3].map((min) => ({
      value: String(min),
      label: `${min}★ and above`,
      count: facetPool.filter((product) => product.rating.avg >= min).length,
    })),
    discounts: [10, 25, 50].map((min) => ({
      value: String(min),
      label: `${min}% off or more`,
      count: facetPool.filter((product) => productDiscount(product) >= min).length,
    })),
    price: { min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 },
    attributes: (category?.facets ?? []).map((facet) => ({
      key: facet.key,
      label: facet.label,
      options: countOptions(
        facetPool.flatMap((product) => attributeValue(product, facet).map((value) => ({ value }))),
      ),
    })).filter((entry) => entry.options.length > 1),
    codCount: facetPool.filter((product) => product.cod).length,
    fastDeliveryCount: filters.pin ? facetPool.filter((product) => (deliveryDays.get(product.id) ?? 99) <= 2).length : 0,
    inStockCount: facetPool.filter((product) => productStock(product) > 0).length,
    outOfStockCount: facetPool.filter((product) => productStock(product) === 0).length,
  }

  // Filters.
  let matched = scored
  if (filters.brands?.length) matched = matched.filter((entry) => filters.brands?.includes(entry.product.brand))
  if (filters.sellers?.length) matched = matched.filter((entry) => filters.sellers?.includes(entry.product.sellerId))
  if (filters.minPrice !== undefined) matched = matched.filter((entry) => productPrice(entry.product) >= (filters.minPrice ?? 0))
  if (filters.maxPrice !== undefined) matched = matched.filter((entry) => productPrice(entry.product) <= (filters.maxPrice ?? Infinity))
  if (filters.minRating) matched = matched.filter((entry) => entry.product.rating.avg >= (filters.minRating ?? 0))
  if (filters.minDiscount) matched = matched.filter((entry) => productDiscount(entry.product) >= (filters.minDiscount ?? 0))
  if (filters.cod) matched = matched.filter((entry) => entry.product.cod)
  if (filters.inStock) matched = matched.filter((entry) => productStock(entry.product) > 0)
  if (filters.fastDelivery && filters.pin) {
    matched = matched.filter((entry) => (deliveryDays.get(entry.product.id) ?? 99) <= 2)
  }
  if (filters.attributes) {
    for (const [key, values] of Object.entries(filters.attributes)) {
      if (!values.length) continue
      const facet = category?.facets.find((entry) => entry.key === key)
      if (!facet) continue
      matched = matched.filter((entry) => attributeValue(entry.product, facet).some((value) => values.includes(value)))
    }
  }

  // Sort.
  const sort = query.sort ?? 'relevance'
  const sorted = matched.slice().sort((a, b) => {
    switch (sort) {
      case 'price_asc':
        return productPrice(a.product) - productPrice(b.product)
      case 'price_desc':
        return productPrice(b.product) - productPrice(a.product)
      case 'newest':
        return a.product.createdAt < b.product.createdAt ? 1 : -1
      case 'discount':
        return productDiscount(b.product) - productDiscount(a.product)
      case 'rating':
        return b.product.rating.avg - a.product.rating.avg || b.product.rating.count - a.product.rating.count
      case 'popularity':
        return b.product.rating.count - a.product.rating.count
      default: {
        const stockA = productStock(a.product) > 0 ? 1 : 0
        const stockB = productStock(b.product) > 0 ? 1 : 0
        const dealA = isDealLive(a.product, now) ? 1 : 0
        const dealB = isDealLive(b.product, now) ? 1 : 0
        return (
          b.score - a.score ||
          stockB - stockA ||
          dealB - dealA ||
          b.product.rating.count - a.product.rating.count
        )
      }
    }
  })

  const total = sorted.length
  const start = (page - 1) * pageSize
  const items = sorted.slice(start, start + pageSize).map((entry) => entry.product)

  const didYouMean = parts.length > 0 && total < 3 ? suggestSpelling(view, query.q ?? '') : undefined
  const lowered = (query.q ?? '').toLowerCase().trim()
  const matchingSellers = lowered
    ? view.sellers
        .filter((seller) => seller.status === 'active' && seller.displayName.toLowerCase().includes(lowered))
        .slice(0, 4)
        .map((seller) => ({ id: seller.id, name: seller.displayName, slug: seller.slug }))
    : []
  const matchingCategories = lowered
    ? view.categories
        .filter((entry) => entry.name.toLowerCase().includes(lowered))
        .slice(0, 4)
        .map((entry) => ({ id: entry.id, name: entry.name, slug: entry.slug }))
    : []

  return {
    items,
    total,
    page,
    pageSize,
    facets,
    ...(didYouMean && didYouMean !== lowered ? { didYouMean } : {}),
    matchingSellers,
    matchingCategories,
  }
}

/** Search suggestions for the header: products, categories and sellers. */
export interface Suggestion {
  kind: 'product' | 'category' | 'seller'
  label: string
  href: string
  meta?: string
}

export function getSearchSuggestions(view: View, query: string, limit = 8): Suggestion[] {
  const lowered = query.toLowerCase().trim()
  if (lowered.length < 2) return []
  const parts = tokens(lowered)
  const suggestions: Suggestion[] = []

  for (const category of view.categories) {
    if (category.name.toLowerCase().includes(lowered)) {
      suggestions.push({ kind: 'category', label: category.name, href: `/c/${category.slug}`, meta: 'Category' })
    }
    if (suggestions.length >= 3) break
  }
  for (const seller of view.sellers) {
    if (seller.status === 'active' && seller.displayName.toLowerCase().includes(lowered)) {
      suggestions.push({ kind: 'seller', label: seller.displayName, href: `/store/${seller.slug}`, meta: `${seller.city} · Seller` })
    }
    if (suggestions.length >= 5) break
  }
  const products = view.products
    .filter((product) => isShoppable(view, product) && matchScore(view, product, parts) > 0)
    .sort((a, b) => b.rating.count - a.rating.count)
    .slice(0, limit)
  for (const product of products) {
    suggestions.push({
      kind: 'product',
      label: product.title,
      href: `/p/${product.slug}`,
      meta: `₹${productPrice(product).toLocaleString('en-IN')} · ${discountPercent(productMrpSafe(product), productPrice(product))}% off`,
    })
    if (suggestions.length >= limit) break
  }
  return suggestions.slice(0, limit)
}

function productMrpSafe(product: Product): number {
  return Math.max(...product.variants.map((variant) => variant.mrp))
}
