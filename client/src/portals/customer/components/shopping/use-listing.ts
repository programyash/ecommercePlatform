// The listing's whole state lives in the URL, so back, forward, a refresh and a
// shared link all restore the same shortlist. Category, search, deals and the
// seller storefront read the same state through this hook.

import { useCallback } from 'react'
import { useUrlParams } from '@/lib/use-url-state'
import type { SearchFilters, SortKey } from '@/data'

/** Category facet values are namespaced so `f_storage=128 GB` cannot clash with `sort`. */
const ATTR_PREFIX = 'f_'

export const SORT_OPTIONS: readonly { value: SortKey; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'popularity', label: 'Popularity' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest first' },
  { value: 'discount', label: 'Discount' },
  { value: 'rating', label: 'Customer rating' },
]

const SORT_VALUES = new Set<string>(SORT_OPTIONS.map((option) => option.value))

export interface ListingState {
  /** Free-text query; the search screen owns it, the rest inherit it from the URL. */
  q: string
  /** Category chosen as a filter (search, deals, store); '' on category routes. */
  cat: string
  sort: SortKey
  page: number
  brands: string[]
  sellers: string[]
  minPrice: number | null
  maxPrice: number | null
  minRating: number | null
  minDiscount: number | null
  cod: boolean
  fast: boolean
  /** "Include out of stock" unticked — the URL only carries the narrower view. */
  inStockOnly: boolean
  attributes: Record<string, string[]>
}

export interface ListingControls {
  state: ListingState
  setQ: (value: string) => void
  setCategory: (slug: string | null) => void
  setSort: (sort: SortKey) => void
  setPage: (page: number) => void
  toggleBrand: (value: string) => void
  toggleSeller: (value: string) => void
  toggleAttribute: (key: string, value: string) => void
  setPrice: (min: number | null, max: number | null) => void
  setRating: (value: number | null) => void
  setDiscount: (value: number | null) => void
  setCod: (on: boolean) => void
  setFast: (on: boolean) => void
  setInStockOnly: (on: boolean) => void
  clearAll: () => void
  /** How many filters the shopper has applied (sort and page are not filters). */
  activeCount: number
}

function readNumber(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key)
  if (raw === null || raw.trim() === '') return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function toggle(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value]
}

export function useListingState(): ListingControls {
  const { params, setParams } = useUrlParams()

  const attributes: Record<string, string[]> = {}
  for (const key of new Set(params.keys())) {
    if (key.startsWith(ATTR_PREFIX)) {
      const values = params.getAll(key)
      if (values.length > 0) attributes[key.slice(ATTR_PREFIX.length)] = values
    }
  }

  const rawSort = params.get('sort') ?? 'relevance'
  const state: ListingState = {
    q: params.get('q') ?? '',
    cat: params.get('cat') ?? '',
    sort: (SORT_VALUES.has(rawSort) ? rawSort : 'relevance') as SortKey,
    page: Math.max(1, readNumber(params, 'page') ?? 1),
    brands: params.getAll('brand'),
    sellers: params.getAll('seller'),
    minPrice: readNumber(params, 'min'),
    maxPrice: readNumber(params, 'max'),
    minRating: readNumber(params, 'rating'),
    minDiscount: readNumber(params, 'disc'),
    cod: params.get('cod') === '1',
    fast: params.get('fast') === '1',
    inStockOnly: params.get('stock') === 'in',
    attributes,
  }

  const setQ = useCallback((value: string) => setParams({ q: value }, { resetPage: true }), [setParams])
  const setCategory = useCallback((slug: string | null) => setParams({ cat: slug }, { resetPage: true }), [setParams])
  const setSort = useCallback(
    (sort: SortKey) => setParams({ sort: sort === 'relevance' ? null : sort }, { resetPage: true }),
    [setParams],
  )
  const setPage = useCallback((page: number) => setParams({ page: page <= 1 ? null : page }), [setParams])

  const brands = state.brands
  const sellers = state.sellers
  const toggleBrand = useCallback(
    (value: string) => setParams({ brand: toggle(brands, value) }, { resetPage: true }),
    [brands, setParams],
  )
  const toggleSeller = useCallback(
    (value: string) => setParams({ seller: toggle(sellers, value) }, { resetPage: true }),
    [sellers, setParams],
  )
  const toggleAttribute = useCallback(
    (key: string, value: string) =>
      setParams({ [`${ATTR_PREFIX}${key}`]: toggle(params.getAll(`${ATTR_PREFIX}${key}`), value) }, { resetPage: true }),
    [params, setParams],
  )

  const setPrice = useCallback(
    (min: number | null, max: number | null) => setParams({ min, max }, { resetPage: true }),
    [setParams],
  )
  const setRating = useCallback((value: number | null) => setParams({ rating: value }, { resetPage: true }), [setParams])
  const setDiscount = useCallback((value: number | null) => setParams({ disc: value }, { resetPage: true }), [setParams])
  const setCod = useCallback((on: boolean) => setParams({ cod: on ? '1' : null }, { resetPage: true }), [setParams])
  const setFast = useCallback((on: boolean) => setParams({ fast: on ? '1' : null }, { resetPage: true }), [setParams])
  const setInStockOnly = useCallback(
    (on: boolean) => setParams({ stock: on ? 'in' : null }, { resetPage: true }),
    [setParams],
  )

  const attributeKeys = Object.keys(attributes)
  const clearAll = useCallback(() => {
    const patch: Record<string, null> = {
      cat: null,
      brand: null,
      seller: null,
      min: null,
      max: null,
      rating: null,
      disc: null,
      cod: null,
      fast: null,
      stock: null,
    }
    for (const key of attributeKeys) patch[`${ATTR_PREFIX}${key}`] = null
    setParams(patch, { resetPage: true })
  }, [attributeKeys, setParams])

  const activeCount =
    state.brands.length +
    state.sellers.length +
    attributeKeys.reduce((sum, key) => sum + (attributes[key]?.length ?? 0), 0) +
    (state.cat ? 1 : 0) +
    (state.minPrice !== null || state.maxPrice !== null ? 1 : 0) +
    (state.minRating ? 1 : 0) +
    (state.minDiscount ? 1 : 0) +
    (state.cod ? 1 : 0) +
    (state.fast ? 1 : 0) +
    (state.inStockOnly ? 1 : 0)

  return {
    state,
    setQ,
    setCategory,
    setSort,
    setPage,
    toggleBrand,
    toggleSeller,
    toggleAttribute,
    setPrice,
    setRating,
    setDiscount,
    setCod,
    setFast,
    setInStockOnly,
    clearAll,
    activeCount,
  }
}

/** Turn the URL state into the filter object `searchProducts` expects. */
export function listingFilters(state: ListingState, pin: string | null): SearchFilters {
  const filters: SearchFilters = {}
  if (state.brands.length > 0) filters.brands = state.brands
  if (state.sellers.length > 0) filters.sellers = state.sellers
  if (state.minPrice !== null) filters.minPrice = state.minPrice
  if (state.maxPrice !== null) filters.maxPrice = state.maxPrice
  if (state.minRating) filters.minRating = state.minRating
  if (state.minDiscount) filters.minDiscount = state.minDiscount
  if (state.cod) filters.cod = true
  if (state.inStockOnly) filters.inStock = true
  if (pin) filters.pin = pin
  if (state.fast && pin) filters.fastDelivery = true
  const attributeKeys = Object.keys(state.attributes)
  if (attributeKeys.length > 0) filters.attributes = state.attributes
  return filters
}
