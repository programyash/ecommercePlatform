import { PackageSearch, SlidersHorizontal, ArrowDownUp } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import {
  DEFAULT_SETTINGS,
  getCategoryBySlug,
  getCategoryChildren,
  getCategoryPath,
  getDeliveryEstimate,
  lookupPin,
  searchProducts,
  useCart,
  useDb,
  useDemoQuery,
  useWishlist,
  type Product,
  type SearchResult,
} from '@/data'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Pagination } from '@/components/ui/pagination'
import { RadioGroup } from '@/components/ui/radio-group'
import { Select } from '@/components/ui/select'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { DeliveryPinSheet } from '@/components/commerce/delivery-pin-sheet'
import { ProductGrid } from '@/components/commerce/product-grid'
import type { Crumb } from '@/components/ui/breadcrumbs'
import { cn } from '@/lib/cn'
import { formatDayShort, formatINR, formatNumber, formatRangeLabel, pluralWithCount } from '@/lib/format'
import { useMediaQuery } from '@/lib/use-media-query'
import { FilterPanel } from './filter-panel'
import { listingFilters, SORT_OPTIONS, useListingState } from './use-listing'

const PAGE_SIZE = 24

export interface ListingScope {
  /** Category owned by the route; its children become links, not filters. */
  categorySlug?: string
  sellerId?: string
  /** Narrowing the preset applies on top of the shopper's filters. */
  minDiscount?: number
}

interface ListingViewProps {
  scope: ListingScope
  /** Falls back to the category name on category routes. */
  title?: string
  documentTitle?: string
  breadcrumbs?: Crumb[]
  description?: ReactNode
  /** Above the page header — the seller banner on a storefront. */
  intro?: ReactNode
  /** Extra facts beside the product count. */
  meta?: ReactNode
  actions?: ReactNode
  /** Between the header and the results: "did you mean", matching sellers, offers. */
  banner?: (result: SearchResult) => ReactNode
  /** Below the results: rails, policies. */
  footer?: ReactNode
  empty?: { title: string; description: string }
  showSellerFacet?: boolean
  /** Replaces the whole results area (a suspended store, an empty search box). */
  unavailable?: ReactNode
}

/** Sub-category shortcut: a chip that navigates rather than filters. */
function LinkChip({ to, current, children }: { to: string; current?: boolean; children: ReactNode }) {
  return (
    <Link
      to={to}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'inline-flex h-8 max-w-full items-center rounded-pill border px-3 text-sm whitespace-nowrap transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        current
          ? 'border-primary bg-primary-subtle font-medium text-primary-subtle-fg'
          : 'border-border bg-surface text-fg hover:border-border-strong hover:bg-surface-2',
      )}
    >
      {children}
    </Link>
  )
}

function FilterSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex flex-col gap-2.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="h-3.5 w-3/5" />
        </div>
      ))}
    </div>
  )
}

/**
 * One listing implementation. The category, search, deals and seller screens are
 * presets of it: they change the scope, the heading and the banner, nothing else.
 */
export function ListingView({
  scope,
  title,
  documentTitle,
  breadcrumbs,
  description,
  intro,
  meta,
  actions,
  banner,
  footer,
  empty,
  showSellerFacet = true,
  unavailable,
}: ListingViewProps) {
  const controls = useListingState()
  const { state } = controls
  const pin = useCart((cart) => cart.pin)
  const setPin = useCart((cart) => cart.setPin)
  const wishlist = useWishlist((store) => store.ids)
  const toggleWishlist = useWishlist((store) => store.toggle)

  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)

  // Pages on wide screens, "Load more" below them — the URL stays the same either way.
  const wide = useMediaQuery('(min-width: 64rem)')

  const chrome = useDb(
    (view) => {
      const category = scope.categorySlug ? getCategoryBySlug(view, scope.categorySlug) : undefined
      const children = category ? getCategoryChildren(view, category.id) : []
      const parent = category?.parentId ? view.categoryById.get(category.parentId) : undefined
      return {
        category,
        parent,
        path: category ? getCategoryPath(view, category.id) : [],
        children,
        // A leaf shows its siblings instead, so browsing sideways stays one tap away.
        siblings: children.length === 0 && parent ? getCategoryChildren(view, parent.id) : [],
      }
    },
    [scope.categorySlug],
  )

  const minDiscount = Math.max(scope.minDiscount ?? 0, state.minDiscount ?? 0)
  const query = useDemoQuery(
    (view) => {
      const result = searchProducts(view, {
        ...(state.q ? { q: state.q } : {}),
        ...(scope.categorySlug ? { categorySlug: scope.categorySlug } : state.cat ? { categorySlug: state.cat } : {}),
        ...(scope.sellerId ? { sellerId: scope.sellerId } : {}),
        filters: { ...listingFilters(state, pin), ...(minDiscount ? { minDiscount } : {}) },
        sort: state.sort,
        page: wide ? state.page : 1,
        pageSize: wide ? PAGE_SIZE : PAGE_SIZE * state.page,
      })
      return {
        result,
        deliveryFor: (product: Product) => (pin ? getDeliveryEstimate(view, pin, product.id) : null),
      }
    },
    [state, scope.categorySlug, scope.sellerId, minDiscount, pin, wide],
  )

  const data = query.data
  const result = data?.result
  const heading = title ?? chrome.category?.name ?? 'Products'
  const crumbs: Crumb[] =
    breadcrumbs ??
    (chrome.category
      ? [
          { label: 'Home', to: '/' },
          ...chrome.path.map((entry, index) => ({
            label: entry.name,
            ...(index < chrome.path.length - 1 ? { to: `/c/${entry.slug}` } : {}),
          })),
        ]
      : [{ label: 'Home', to: '/' }, { label: heading }])

  const cardProps = (product: Product) => {
    const estimate = data?.deliveryFor(product)
    return {
      wishlisted: wishlist.includes(product.id),
      ...(estimate?.serviceable ? { deliveryNote: `Free delivery by ${formatDayShort(estimate.date)}` } : {}),
    }
  }

  // Applied-filter chips. Each one removes exactly the filter it names.
  const chips: { id: string; label: string; remove: () => void }[] = []
  if (state.cat && !scope.categorySlug) {
    const label = result?.facets.categories.find((entry) => entry.value === state.cat)?.label ?? state.cat
    chips.push({ id: `cat-${state.cat}`, label, remove: () => controls.setCategory(null) })
  }
  for (const brand of state.brands) {
    chips.push({ id: `brand-${brand}`, label: brand, remove: () => controls.toggleBrand(brand) })
  }
  for (const sellerId of state.sellers) {
    const label = result?.facets.sellers.find((entry) => entry.value === sellerId)?.label ?? sellerId
    chips.push({ id: `seller-${sellerId}`, label, remove: () => controls.toggleSeller(sellerId) })
  }
  for (const [key, values] of Object.entries(state.attributes)) {
    for (const value of values) {
      chips.push({ id: `${key}-${value}`, label: value, remove: () => controls.toggleAttribute(key, value) })
    }
  }
  if (state.minPrice !== null || state.maxPrice !== null) {
    const label =
      state.minPrice !== null && state.maxPrice !== null
        ? `${formatINR(state.minPrice)} – ${formatINR(state.maxPrice)}`
        : state.maxPrice !== null
          ? `Under ${formatINR(state.maxPrice + 1)}`
          : `${formatINR(state.minPrice ?? 0)} and above`
    chips.push({ id: 'price', label, remove: () => controls.setPrice(null, null) })
  }
  if (state.minRating) {
    chips.push({ id: 'rating', label: `${state.minRating}★ and above`, remove: () => controls.setRating(null) })
  }
  if (state.minDiscount) {
    chips.push({ id: 'discount', label: `${state.minDiscount}% off or more`, remove: () => controls.setDiscount(null) })
  }
  if (state.fast) chips.push({ id: 'fast', label: 'Get it in 2 days', remove: () => controls.setFast(false) })
  if (state.cod) chips.push({ id: 'cod', label: 'Cash on delivery', remove: () => controls.setCod(false) })
  if (state.inStockOnly) {
    chips.push({ id: 'stock', label: 'In stock only', remove: () => controls.setInStockOnly(false) })
  }

  const total = result?.total ?? 0
  const loading = query.status === 'loading'
  const showEmpty = query.status === 'empty' || (query.status === 'success' && total === 0)
  const pageCount = Math.ceil(total / PAGE_SIZE)
  const shownCount = result?.items.length ?? 0
  /** The shopper filtered while deep in the pages and landed past the end. */
  const pastLastPage = !loading && !showEmpty && shownCount === 0 && total > 0

  const sortControl = (
    <Select
      size="sm"
      aria-label="Sort products"
      leading="Sort:"
      value={state.sort}
      onValueChange={(value) => controls.setSort(value as typeof state.sort)}
      options={SORT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
      className="min-w-48"
    />
  )

  const filterPanel = result ? (
    <FilterPanel
      facets={result.facets}
      controls={controls}
      showSellers={showSellerFacet}
      {...(chrome.category && chrome.children.length > 0
        ? {
            categoryLinks: result.facets.categories.map((entry) => ({
              label: entry.label,
              count: entry.count,
              to: `/c/${chrome.category?.slug}/${entry.value}`,
            })),
          }
        : {})}
      pin={pin}
      onEditPin={() => {
        setFilterOpen(false)
        setPinOpen(true)
      }}
    />
  ) : (
    <FilterSkeleton />
  )

  return (
    <div className="mx-auto flex max-w-shop flex-col gap-5 px-4 py-5 pb-24 sm:px-6 sm:py-6 lg:px-8 lg:pb-8">
      <PageHeader
        title={heading}
        {...(documentTitle ? { documentTitle } : {})}
        breadcrumbs={crumbs}
        {...(description ? { description } : {})}
        {...(actions ? { actions } : {})}
        meta={
          <>
            {/* The results bar below already announces loading; don't say it twice. */}
            <span>{query.status === 'loading' ? ' ' : pluralWithCount(total, 'product')}</span>
            {meta}
          </>
        }
      >
        {chrome.children.length > 0 || chrome.siblings.length > 0 ? (
          <ul aria-label="Sub-categories" className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {chrome.children.length > 0
              ? chrome.children.map((child) => (
                  <li key={child.id}>
                    <LinkChip to={`/c/${chrome.category?.slug}/${child.slug}`}>{child.name}</LinkChip>
                  </li>
                ))
              : chrome.siblings.map((sibling) => (
                  <li key={sibling.id}>
                    <LinkChip
                      to={`/c/${chrome.parent?.slug}/${sibling.slug}`}
                      current={sibling.id === chrome.category?.id}
                    >
                      {sibling.name}
                    </LinkChip>
                  </li>
                ))}
          </ul>
        ) : null}
      </PageHeader>

      {intro}

      {unavailable ?? (
        <>
          {query.status === 'error' ? (
            <EmptyState
              icon={<PackageSearch aria-hidden />}
              title="We couldn’t load these products"
              description="Something went wrong on our side. Try again in a moment."
              action={<Button onClick={query.retry}>Retry</Button>}
            />
          ) : (
            <div className="grid gap-x-8 gap-y-5 lg:grid-cols-12">
              <aside aria-label="Filters" className="hidden lg:col-span-3 lg:block">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between gap-2 pb-2">
                    <h2 className="type-title text-fg">Filters</h2>
                    {controls.activeCount > 0 ? (
                      <Button variant="link" size="sm" onClick={controls.clearAll}>
                        Clear all
                      </Button>
                    ) : null}
                  </div>
                  {filterPanel}
                </div>
              </aside>

              <div className="flex min-w-0 flex-col gap-4 lg:col-span-9">
                {result && banner ? banner(result) : null}

                {chips.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {chips.map((chip) => (
                      <Chip key={chip.id} size="sm" onRemove={chip.remove} removeLabel={`Remove filter ${chip.label}`}>
                        {chip.label}
                      </Chip>
                    ))}
                    <Button variant="link" size="sm" onClick={controls.clearAll}>
                      Clear all
                    </Button>
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-3">
                  <p className="type-caption text-fg-muted" aria-live="polite">
                    {loading
                      ? 'Loading products…'
                      : total === 0
                        ? 'No products'
                        : wide
                          ? formatRangeLabel(state.page, PAGE_SIZE, total)
                          : `Showing ${formatNumber(shownCount)} of ${formatNumber(total)}`}
                  </p>
                  <div className="hidden lg:block">{sortControl}</div>
                </div>

                {pastLastPage ? (
                  <EmptyState
                    icon={<PackageSearch aria-hidden />}
                    title="Nothing on this page"
                    description={`There ${total === 1 ? 'is' : 'are'} ${pluralWithCount(total, 'product')} in this list. Go back to the first page to see them.`}
                    action={
                      <Button variant="outline" onClick={() => controls.setPage(1)}>
                        Go to the first page
                      </Button>
                    }
                  />
                ) : showEmpty ? (
                  <EmptyState
                    icon={<PackageSearch aria-hidden />}
                    title={
                      controls.activeCount > 0
                        ? 'No products match these filters'
                        : (empty?.title ?? 'Nothing to show here yet')
                    }
                    description={
                      controls.activeCount > 0
                        ? `Try removing one — you have ${pluralWithCount(controls.activeCount, 'filter')} applied.`
                        : (empty?.description ?? 'Try another category, or browse the deals of the day.')
                    }
                    action={
                      controls.activeCount > 0 ? (
                        <Button variant="outline" onClick={controls.clearAll}>
                          Clear all filters
                        </Button>
                      ) : (
                        <Button variant="outline" asChild>
                          <Link to="/deals">View deals</Link>
                        </Button>
                      )
                    }
                  />
                ) : (
                  <ProductGrid
                    products={result?.items ?? []}
                    loading={loading}
                    skeletonCount={8}
                    getCardProps={cardProps}
                    onToggleWishlist={toggleWishlist}
                  />
                )}

                {!showEmpty && !pastLastPage && !loading && total > 0 ? (
                  wide ? (
                    <Pagination
                      page={state.page}
                      pageCount={pageCount}
                      onPageChange={(next) => {
                        controls.setPage(next)
                        window.scrollTo({ top: 0 })
                      }}
                    />
                  ) : shownCount < total ? (
                    <Button variant="outline" fullWidth onClick={() => controls.setPage(state.page + 1)}>
                      Load more products
                    </Button>
                  ) : null
                ) : null}
              </div>
            </div>
          )}
        </>
      )}

      {footer}

      {/* Phones and tablets: sort and filters live in sheets behind a sticky bar. */}
      {!unavailable && query.status !== 'error' ? (
        <div className="fixed inset-x-0 bottom-tabbar z-20 border-t border-border bg-surface pb-safe md:bottom-0 lg:hidden">
          <div className="mx-auto flex max-w-shop items-stretch gap-px px-4 py-2 sm:px-6">
            <Button
              variant="ghost"
              fullWidth
              leftIcon={<ArrowDownUp aria-hidden />}
              onClick={() => setSortOpen(true)}
              aria-haspopup="dialog"
            >
              Sort
            </Button>
            <span aria-hidden className="my-1 w-px shrink-0 bg-border" />
            <Button
              variant="ghost"
              fullWidth
              leftIcon={<SlidersHorizontal aria-hidden />}
              onClick={() => setFilterOpen(true)}
              aria-haspopup="dialog"
            >
              {controls.activeCount > 0 ? `Filter (${controls.activeCount})` : 'Filter'}
            </Button>
          </div>
        </div>
      ) : null}

      <Sheet open={sortOpen} onOpenChange={setSortOpen}>
        <SheetContent side="bottom" title="Sort by" className="mx-auto max-w-md">
          <RadioGroup
            aria-label="Sort products"
            value={state.sort}
            onValueChange={(value) => {
              controls.setSort(value as typeof state.sort)
              setSortOpen(false)
            }}
            options={SORT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent
          side="full"
          title="Filters"
          bodyClassName="p-0"
          headerAction={
            controls.activeCount > 0 ? (
              <Button variant="link" size="sm" onClick={controls.clearAll}>
                Clear all
              </Button>
            ) : null
          }
          footer={
            <Button fullWidth size="lg" onClick={() => setFilterOpen(false)}>
              {loading ? 'Show products' : `Show ${pluralWithCount(total, 'product')}`}
            </Button>
          }
        >
          {result ? (
            <FilterPanel
              layout="sheet"
              facets={result.facets}
              controls={controls}
              showSellers={showSellerFacet}
              {...(chrome.category && chrome.children.length > 0
                ? {
                    categoryLinks: result.facets.categories.map((entry) => ({
                      label: entry.label,
                      count: entry.count,
                      to: `/c/${chrome.category?.slug}/${entry.value}`,
                    })),
                  }
                : {})}
              pin={pin}
              onEditPin={() => {
                setFilterOpen(false)
                setPinOpen(true)
              }}
            />
          ) : (
            <div className="p-4">
              <FilterSkeleton />
            </div>
          )}
        </SheetContent>
      </Sheet>

      <DeliveryPinSheet
        open={pinOpen}
        onOpenChange={setPinOpen}
        {...(pin ? { pin } : {})}
        onApply={setPin}
        lookup={(value) => {
          const info = lookupPin(value)
          if (!info) return { ok: false, message: 'Enter a valid 6-digit PIN code.' }
          if (DEFAULT_SETTINGS.unserviceablePins.includes(value)) {
            return {
              ok: false,
              message: `We don’t deliver to ${value} yet. Try another PIN code, or save this item to your wishlist.`,
            }
          }
          return { ok: true, city: info.city, state: info.state }
        }}
      />
    </div>
  )
}
