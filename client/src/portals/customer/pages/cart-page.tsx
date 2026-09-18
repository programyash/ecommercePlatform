import { Heart, MapPin, ShoppingBag, Store, Truck } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Link, useNavigate } from 'react-router'
import {
  DEFAULT_SETTINGS,
  DEMO_NOW,
  getAvailableCoupons,
  getDeliveryEstimate,
  getSimilarProducts,
  isFirstOrder,
  lookupPin,
  MAX_QTY_PER_LINE,
  useCart,
  useDemoQuery,
  useSession,
  useWishlist,
  type CartLine as CartLineState,
  type Product,
} from '@/data'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { CartLine } from '@/components/commerce/cart-line'
import { CouponField, type AvailableCoupon, type CouponResult } from '@/components/commerce/coupon-field'
import { DeliveryPinSheet } from '@/components/commerce/delivery-pin-sheet'
import { OrderSummary, type SummaryLine } from '@/components/commerce/order-summary'
import { ProductRail } from '@/components/commerce/product-rail'
import { computeCartSummary, evaluateCoupon, freeDeliveryHint, type CartSummaryLine } from '@/lib/pricing'
import { formatDayShort, formatINR, pluralWithCount } from '@/lib/format'
import { useMediaQuery } from '@/lib/use-media-query'

function CartSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="flex flex-col gap-4 lg:col-span-8">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-card border border-border p-4">
            <Skeleton className="h-4 w-56" />
            <div className="flex gap-3">
              <Skeleton className="size-20 rounded-card" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-8 w-28 rounded-control" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="lg:col-span-4">
        <Skeleton className="h-72 w-full rounded-card" />
      </div>
    </div>
  )
}

/** The bag: lines grouped by seller, a coupon that explains itself, and one total. */
export default function CartPage() {
  const navigate = useNavigate()
  const lines = useCart((cart) => cart.lines)
  const saved = useCart((cart) => cart.saved)
  const couponCode = useCart((cart) => cart.couponCode)
  const pin = useCart((cart) => cart.pin)
  const setPin = useCart((cart) => cart.setPin)
  const setQty = useCart((cart) => cart.setQty)
  const remove = useCart((cart) => cart.remove)
  const add = useCart((cart) => cart.add)
  const saveForLater = useCart((cart) => cart.saveForLater)
  const moveToCart = useCart((cart) => cart.moveToCart)
  const removeSaved = useCart((cart) => cart.removeSaved)
  const setCoupon = useCart((cart) => cart.setCoupon)
  const wishlistCount = useWishlist((store) => store.ids.length)
  const toggleWishlist = useWishlist((store) => store.toggle)
  const { customerId, customerSignedIn } = useSession()

  const [pinOpen, setPinOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const wide = useMediaQuery('(min-width: 64rem)')

  const query = useDemoQuery(
    (view) => {
      const resolve = (line: CartLineState) => {
        const product = view.productById.get(line.productId)
        const variant = product?.variants.find((entry) => entry.id === line.variantId)
        if (!product || !variant) return null
        return { line, product, variant, seller: view.sellerById.get(product.sellerId) }
      }
      const rows = lines.map(resolve).filter((row): row is NonNullable<typeof row> => row !== null)
      const savedRows = saved.map(resolve).filter((row): row is NonNullable<typeof row> => row !== null)

      const summaryLines: CartSummaryLine[] = rows.map((row) => ({
        lineId: row.line.lineId,
        productId: row.product.id,
        variantId: row.variant.id,
        sellerId: row.product.sellerId,
        categoryPath: view.pathByCategory.get(row.product.categoryId) ?? [],
        qty: row.line.qty,
        mrp: row.variant.mrp,
        price: row.variant.price,
        gstRate: row.product.gstRate,
        stock: row.variant.stock,
        cod: row.product.cod,
      }))

      const coupon = couponCode ? (view.couponByCode.get(couponCode) ?? null) : null
      const firstOrder = isFirstOrder(view, customerId)
      const couponContext = {
        isFirstOrder: firstOrder,
        categoryNames: (coupon?.categoryIds ?? [])
          .map((id) => view.categoryById.get(id)?.name.toLowerCase())
          .filter((name): name is string => Boolean(name)),
        ...(coupon?.sellerId ? { sellerName: view.sellerById.get(coupon.sellerId)?.displayName } : {}),
        now: DEMO_NOW,
      }

      const summary = computeCartSummary({
        lines: summaryLines,
        settings: view.settings,
        coupon,
        couponContext,
        pin,
      })

      // One block per seller, with the slowest item's date as the shipment's date.
      const groups = summary.groups.map((group) => {
        const groupRows = rows.filter((row) => row.product.sellerId === group.sellerId)
        const dates = pin
          ? groupRows
              .map((row) => getDeliveryEstimate(view, pin, row.product.id))
              .filter((estimate) => estimate?.serviceable)
              .map((estimate) => estimate?.date ?? '')
              .filter(Boolean)
          : []
        return {
          group,
          rows: groupRows,
          seller: view.sellerById.get(group.sellerId),
          deliveryDate: dates.length > 0 ? dates.sort().slice(-1)[0] : undefined,
        }
      })

      const available: AvailableCoupon[] = getAvailableCoupons(view, {
        customerId,
        lines: rows.map((row) => ({
          lineId: row.line.lineId,
          productId: row.product.id,
          variantId: row.variant.id,
          qty: row.line.qty,
        })),
      }).map((offer) => ({
        coupon: offer.coupon,
        result: offer.applicable
          ? { ok: true, discount: offer.discount }
          : { ok: false, ...(offer.reason ? { reason: offer.reason } : {}) },
      }))

      const couponLines = summaryLines.map((line) => ({
        lineId: line.lineId,
        sellerId: line.sellerId,
        categoryPath: line.categoryPath,
        value: line.price * line.qty,
      }))
      const cartTotal = couponLines.reduce((sum, line) => sum + line.value, 0)

      const address = customerSignedIn
        ? view.customerById
            .get(customerId)
            ?.addresses.find((entry) => entry.id === view.customerById.get(customerId)?.defaultAddressId)
        : undefined

      return {
        rows,
        savedRows,
        groups,
        summary,
        available,
        address,
        recommended: rows[0] ? getSimilarProducts(view, rows[0].product.id, 12) : [],
        checkCoupon: (code: string): CouponResult => {
          const entry = view.couponByCode.get(code)
          if (!entry) return { ok: false, reason: `We don’t recognise ${code}. Check the code and try again.` }
          return evaluateCoupon(entry, {
            lines: couponLines,
            cartTotal,
            isFirstOrder: firstOrder,
            categoryNames: (entry.categoryIds ?? [])
              .map((id) => view.categoryById.get(id)?.name.toLowerCase())
              .filter((name): name is string => Boolean(name)),
            ...(entry.sellerId ? { sellerName: view.sellerById.get(entry.sellerId)?.displayName } : {}),
            now: DEMO_NOW,
          })
        },
      }
    },
    [lines, saved, couponCode, pin, customerId, customerSignedIn],
  )

  const data = query.data
  const rows = data?.rows ?? []
  const summary = data?.summary
  const isEmpty = query.status === 'empty' || rows.length === 0
  const blocked = rows.filter((row) => row.variant.stock <= 0 || row.line.qty > row.variant.stock)
  const blockedReason =
    blocked.length === 0
      ? null
      : blocked.some((row) => row.variant.stock <= 0)
        ? 'Remove the out-of-stock item to place your order.'
        : 'Reduce the quantity on the items marked above to place your order.'

  const summaryLines: SummaryLine[] = summary
    ? [
        { label: `Price (${pluralWithCount(summary.units, 'item')})`, amount: summary.mrpTotal },
        ...(summary.discount > 0
          ? [{ label: 'Discount', amount: summary.discount, kind: 'discount' as const }]
          : []),
        ...(summary.couponDiscount > 0
          ? [
              {
                label: `Coupon ${summary.couponCode ?? ''}`.trim(),
                amount: summary.couponDiscount,
                kind: 'discount' as const,
              },
            ]
          : []),
        {
          label: 'Delivery',
          amount: summary.delivery,
          kind: summary.delivery === 0 ? ('free' as const) : ('default' as const),
          hint: `Free on orders of ${formatINR(DEFAULT_SETTINGS.freeDeliveryThreshold)} and above.`,
        },
      ]
    : []

  const placeOrder = (
    <div className="flex flex-col gap-2">
      <Button
        fullWidth
        size="lg"
        disabled={blocked.length > 0}
        onClick={() => void navigate('/checkout/address')}
      >
        Place order
      </Button>
      {blockedReason ? <p className="type-caption text-danger-subtle-fg">{blockedReason}</p> : null}
    </div>
  )

  const priceDetails = summary ? (
    <OrderSummary
      lines={summaryLines}
      total={summary.total}
      savings={summary.youSave}
      sticky
      cta={placeOrder}
      note={
        <div className="flex flex-col gap-1">
          {freeDeliveryHint(summary) ? <p>{freeDeliveryHint(summary)}</p> : null}
          <p>Prices include all taxes. You can still change the address and payment method at checkout.</p>
        </div>
      }
    />
  ) : null

  return (
    <div className="mx-auto flex max-w-shop flex-col gap-6 px-4 py-5 pb-32 sm:px-6 sm:py-6 lg:px-8 lg:pb-10">
      <PageHeader
        title="Your bag"
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Bag' }]}
        meta={
          query.status === 'loading' ? null : (
            <>
              <span>{pluralWithCount(isEmpty ? 0 : (summary?.units ?? 0), 'item')}</span>
              {saved.length > 0 ? <span>{pluralWithCount(saved.length, 'item')} saved for later</span> : null}
            </>
          )
        }
      />

      {query.status === 'error' ? (
        <EmptyState
          icon={<ShoppingBag aria-hidden />}
          title="We couldn’t load your cart"
          description="Something went wrong on our side. Try again in a moment."
          action={<Button onClick={query.retry}>Retry</Button>}
        />
      ) : query.status === 'loading' ? (
        <CartSkeleton />
      ) : isEmpty ? (
        <EmptyState
          icon={<ShoppingBag aria-hidden />}
          title="Your bag is empty"
          description={
            <>
              Items you add will show up here.{' '}
              {wishlistCount > 0 ? `You have ${pluralWithCount(wishlistCount, 'item')} in your wishlist.` : null}
              {!customerSignedIn ? (
                <span className="mt-2 block">
                  Missing something? Log in to see items you added on another device.
                </span>
              ) : null}
            </>
          }
          action={
            <Button asChild>
              <Link to="/">Continue shopping</Link>
            </Button>
          }
          secondaryAction={
            customerSignedIn ? (
              <Button variant="outline" asChild>
                <Link to="/account/wishlist">Go to wishlist</Link>
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link to="/login">Log in</Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-8">
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface-2 px-4 py-3">
              <p className="flex min-w-0 items-center gap-2 type-body text-fg">
                <MapPin aria-hidden className="size-4 shrink-0 text-fg-muted" />
                {data?.address ? (
                  <span className="min-w-0">
                    Deliver to <span className="type-label">{data.address.name}</span>, {data.address.city}{' '}
                    {data.address.pin}
                  </span>
                ) : pin ? (
                  <span>
                    Deliver to <span className="type-label">{pin}</span>
                    {lookupPin(pin) ? ` · ${lookupPin(pin)?.city}` : ''}
                  </span>
                ) : (
                  <span>Add a PIN code to see delivery dates</span>
                )}
              </p>
              <Button variant="link" size="sm" onClick={() => setPinOpen(true)}>
                Change
              </Button>
            </section>

            {(data?.groups ?? []).map(({ group, rows: groupRows, seller, deliveryDate }) => (
              <section
                key={group.sellerId}
                aria-label={`Items sold by ${seller?.displayName ?? 'seller'}`}
                className="flex flex-col rounded-card border border-border bg-surface"
              >
                <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border-subtle px-4 py-3">
                  <p className="flex min-w-0 items-center gap-2 type-body text-fg-muted">
                    <Store aria-hidden className="size-4 shrink-0 text-fg-subtle" />
                    Sold by{' '}
                    {seller ? (
                      <Link
                        to={`/store/${seller.slug}`}
                        className="type-label text-link hover:underline underline-offset-2"
                      >
                        {seller.displayName}
                      </Link>
                    ) : (
                      'a Chowk seller'
                    )}
                    {seller ? ` · Ships from ${seller.city}` : ''}
                  </p>
                  {deliveryDate ? (
                    <p className="flex items-center gap-1.5 type-caption text-success-subtle-fg">
                      <Truck aria-hidden className="size-3.5" />
                      Delivery by {formatDayShort(deliveryDate)}
                    </p>
                  ) : null}
                </header>

                <ul className="divide-y divide-border-subtle px-4">
                  {groupRows.map((row) => {
                    const stock = row.variant.stock
                    const capped = row.line.qty > stock && stock > 0
                    const label = Object.values(row.variant.options).filter(Boolean).join(' · ')
                    return (
                      <li key={row.line.lineId}>
                        <CartLine
                          line={{
                            lineId: row.line.lineId,
                            productSlug: row.product.slug,
                            title: row.product.title,
                            brand: row.product.brand,
                            image: row.variant.media?.[0] ?? row.product.media[0] ?? 'rack-tees',
                            ...(label ? { variantLabel: label } : {}),
                            price: row.variant.price,
                            mrp: row.variant.mrp,
                            qty: row.line.qty,
                            maxQty: Math.max(1, Math.min(MAX_QTY_PER_LINE, stock)),
                            ...(stock <= 0
                              ? { notice: { tone: 'danger' as const, message: 'Out of stock — remove it to continue.' } }
                              : capped
                                ? {
                                    notice: {
                                      tone: 'warning' as const,
                                      message: `Only ${stock} left — reduce the quantity to continue.`,
                                    },
                                  }
                                : stock <= row.variant.lowStockAt
                                  ? {
                                      notice: {
                                        tone: 'warning' as const,
                                        message: `Only ${stock} left in stock.`,
                                      },
                                    }
                                  : {}),
                          }}
                          onQtyChange={(lineId, next) => setQty(lineId, next, stock)}
                          onSaveForLater={(lineId) => {
                            saveForLater(lineId)
                            toast.success('Saved for later', {
                              description: row.product.title,
                              action: { label: 'Undo', onClick: () => moveToCart(lineId) },
                            })
                          }}
                          onRemove={(lineId) => {
                            remove(lineId)
                            toast.success('Item removed', {
                              description: row.product.title,
                              action: {
                                label: 'Undo',
                                onClick: () =>
                                  add({
                                    productId: row.product.id,
                                    variantId: row.variant.id,
                                    sellerId: row.product.sellerId,
                                    qty: row.line.qty,
                                    stock,
                                  }),
                              },
                            })
                          }}
                        />
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}

            {(data?.savedRows.length ?? 0) > 0 ? (
              <section aria-labelledby="saved-heading" className="flex flex-col rounded-card border border-border bg-surface">
                <h2 id="saved-heading" className="border-b border-border-subtle px-4 py-3 type-title text-fg">
                  Saved for later ({data?.savedRows.length})
                </h2>
                <ul className="divide-y divide-border-subtle px-4">
                  {(data?.savedRows ?? []).map((row) => {
                    const label = Object.values(row.variant.options).filter(Boolean).join(' · ')
                    return (
                      <li key={row.line.lineId}>
                        <CartLine
                          line={{
                            lineId: row.line.lineId,
                            productSlug: row.product.slug,
                            title: row.product.title,
                            brand: row.product.brand,
                            image: row.variant.media?.[0] ?? row.product.media[0] ?? 'rack-tees',
                            ...(label ? { variantLabel: label } : {}),
                            price: row.variant.price,
                            mrp: row.variant.mrp,
                            qty: row.line.qty,
                            maxQty: Math.max(1, Math.min(MAX_QTY_PER_LINE, row.variant.stock)),
                            ...(row.variant.stock <= 0
                              ? { notice: { tone: 'danger' as const, message: 'Out of stock right now.' } }
                              : {}),
                          }}
                          onMoveToCart={(lineId) => {
                            moveToCart(lineId)
                            toast.success('Moved to your cart', { description: row.product.title })
                          }}
                          onRemove={(lineId) => {
                            removeSaved(lineId)
                            toast.success('Removed from saved items', { description: row.product.title })
                          }}
                        />
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}

            <ProductRail
              title="You may also like"
              products={(data?.recommended ?? []) as Product[]}
              onToggleWishlist={toggleWishlist}
            />
          </div>

          <div className="flex flex-col gap-4 lg:col-span-4">
            <div className="rounded-card border border-border bg-surface p-4">
              <CouponField
                {...(summary?.couponDiscount
                  ? { applied: { code: summary.couponCode ?? '', discount: summary.couponDiscount } }
                  : {})}
                onApply={(code) => {
                  const result = data?.checkCoupon(code) ?? { ok: false, reason: 'Try again in a moment.' }
                  if (result.ok) {
                    setCoupon(code)
                    toast.success(`${code} applied`, {
                      description: `You save ${formatINR(result.discount ?? 0)}.`,
                    })
                  }
                  return result
                }}
                onRemove={() => setCoupon(null)}
                available={data?.available ?? []}
              />
              {summary?.couponError ? (
                <div className="flex flex-wrap items-center gap-x-2 pt-2">
                  <p className="type-caption text-danger-subtle-fg">{summary.couponError}</p>
                  <Button variant="link" size="sm" onClick={() => setCoupon(null)}>
                    Remove {couponCode}
                  </Button>
                </div>
              ) : null}
            </div>

            {wide ? priceDetails : null}

            {wishlistCount > 0 ? (
              <Link
                to="/account/wishlist"
                className="flex items-center gap-2 rounded-card border border-border bg-surface px-4 py-3 type-body text-fg-muted transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Heart aria-hidden className="size-4 text-fg-subtle" />
                {pluralWithCount(wishlistCount, 'item')} in your wishlist
              </Link>
            ) : null}
          </div>
        </div>
      )}

      {/* Phones and tablets: the total and the action follow the shopper down the page. */}
      {!wide && !isEmpty && summary ? (
        <div className="fixed inset-x-0 bottom-tabbar z-20 border-t border-border bg-surface pb-safe md:bottom-0 lg:hidden">
          <div className="mx-auto flex max-w-shop items-center gap-3 px-4 py-2 sm:px-6">
            <div className="flex min-w-0 flex-col">
              <span className="type-price text-base text-fg">{formatINR(summary.total)}</span>
              <button
                type="button"
                onClick={() => setDetailsOpen(true)}
                className="type-caption text-link underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                View price details
              </button>
            </div>
            <div className="ml-auto flex min-w-0 flex-col items-end gap-1">
              <Button size="lg" disabled={blocked.length > 0} onClick={() => void navigate('/checkout/address')}>
                Place order
              </Button>
            </div>
          </div>
          {blockedReason ? (
            <p className="px-4 pb-2 type-caption text-danger-subtle-fg sm:px-6">{blockedReason}</p>
          ) : null}
        </div>
      ) : null}

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="bottom" title="Price details" className="mx-auto max-w-md" bodyClassName="p-0">
          {summary ? (
            <OrderSummary lines={summaryLines} total={summary.total} savings={summary.youSave} className="border-0" />
          ) : null}
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
              message: `We don’t deliver to ${value} yet. Try another PIN code, or save these items to your wishlist.`,
            }
          }
          return { ok: true, city: info.city, state: info.state }
        }}
      />
    </div>
  )
}
