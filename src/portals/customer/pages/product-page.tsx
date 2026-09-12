import {
  BadgePercent,
  CreditCard,
  Heart,
  Link2,
  MapPin,
  PackageX,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Truck,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Link, useNavigate, useParams } from 'react-router'
import {
  DEFAULT_SETTINGS,
  DEMO_NOW,
  estimateDelivery,
  getAvailableCoupons,
  getFrequentlyBoughtTogether,
  getProductBySlug,
  getProductsByIds,
  getSimilarProducts,
  lookupPin,
  MAX_QTY_PER_LINE,
  useCart,
  useDb,
  useDemoQuery,
  useRecent,
  useSession,
  useWishlist,
  type DeliveryEstimate,
  type MediaRef,
  type ProductDetail,
  type Product,
  type Review,
  type Variant,
} from '@/data'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs, type Crumb } from '@/components/ui/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { IconButton } from '@/components/ui/icon-button'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton, SkeletonText } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { DeliveryPinSheet } from '@/components/commerce/delivery-pin-sheet'
import { Price } from '@/components/commerce/price'
import { ProductGallery } from '@/components/commerce/product-gallery'
import { ProductRail } from '@/components/commerce/product-rail'
import { QuantityStepper } from '@/components/commerce/quantity-stepper'
import { Rating } from '@/components/commerce/rating'
import { SellerCard } from '@/components/commerce/seller-card'
import { SpecsTable } from '@/components/commerce/specs-table'
import { VariantPicker } from '@/components/commerce/variant-picker'
import { formatDayShort, formatINR, formatNumber, pluralWithCount } from '@/lib/format'
import { stockStatus } from '@/lib/status'
import { useMediaQuery } from '@/lib/use-media-query'
import { usePageTitle } from '@/lib/use-page-title'
import { CartDrawer } from '../components/cart-drawer'
import { Countdown } from '../components/home/countdown'
import { FrequentlyBought, OtherSellersSheet, type BundleItem, type OfferRow } from '../components/shopping/product-extras'
import { ProductReviews } from '../components/shopping/product-reviews'
import { AXIS_LABEL, axisChoices, otherAxisSummary, useVariantSelection } from '../components/shopping/use-variant'

interface OfferLine {
  id: string
  icon: ReactNode
  title: string
  detail: string
}

/** Stable identity: the gallery restarts whenever its media array changes. */
const FALLBACK_MEDIA: MediaRef[] = ['rack-tees']

function variantLabel(variant: Variant): string {
  return Object.values(variant.options).filter(Boolean).join(' · ')
}

/** Bank, UPI, coupon and EMI offers — three up front, the rest behind "View n more". */
function OffersList({ lines, emiBase }: { lines: OfferLine[]; emiBase: number }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? lines : lines.slice(0, 3)
  const showEmi = expanded && emiBase >= 9999

  return (
    <section aria-labelledby="offers-heading" className="flex flex-col gap-2.5 rounded-card border border-border bg-surface p-3.5">
      <h2 id="offers-heading" className="type-label text-fg">
        Offers on this product
      </h2>
      <ul className="flex flex-col gap-2.5">
        {visible.map((line) => (
          <li key={line.id} className="flex items-start gap-2.5">
            <span aria-hidden className="mt-0.5 shrink-0 text-accent-subtle-fg [&_svg]:size-4">
              {line.icon}
            </span>
            <p className="min-w-0 type-body text-fg">
              <span className="type-label">{line.title}</span>{' '}
              <span className="text-fg-muted">{line.detail}</span>
            </p>
          </li>
        ))}
      </ul>

      {showEmi ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left type-caption">
            <caption className="pb-1 text-left type-caption text-fg-muted">
              No-cost EMI on cards, calculated on {formatINR(emiBase)}
            </caption>
            <thead>
              <tr className="border-b border-border-subtle text-fg-muted">
                <th scope="col" className="py-1 pr-3 font-medium">
                  Tenure
                </th>
                <th scope="col" className="py-1 pr-3 text-right font-medium">
                  Per month
                </th>
                <th scope="col" className="py-1 text-right font-medium">
                  Interest
                </th>
              </tr>
            </thead>
            <tbody>
              {[3, 6, 9].map((months) => (
                <tr key={months} className="border-b border-border-subtle last:border-b-0">
                  <th scope="row" className="py-1 pr-3 font-normal text-fg">
                    {months} months
                  </th>
                  <td className="py-1 pr-3 text-right text-fg tabular">{formatINR(Math.round(emiBase / months))}</td>
                  <td className="py-1 text-right text-success-subtle-fg">No cost</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {lines.length > 3 ? (
        <Button variant="link" size="sm" className="self-start" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Show fewer offers' : `View ${lines.length - 3} more`}
        </Button>
      ) : null}
    </section>
  )
}

interface DeliveryBlockProps {
  pin: string | null
  estimate: DeliveryEstimate | null
  returnDays: number
  onEditPin: () => void
}

/** The delivery promise for the PIN the shopper has already set site-wide. */
function DeliveryBlock({ pin, estimate, returnDays, onEditPin }: DeliveryBlockProps) {
  return (
    <section aria-labelledby="delivery-heading" className="flex flex-col gap-2 rounded-card border border-border bg-surface p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="delivery-heading" className="flex items-center gap-2 type-label text-fg">
          <MapPin aria-hidden className="size-4 text-fg-muted" />
          {pin ? `Deliver to ${pin}` : 'Delivery'}
        </h2>
        <Button variant="link" size="sm" onClick={onEditPin}>
          {pin ? 'Change' : 'Enter PIN code'}
        </Button>
      </div>

      {!pin ? (
        <p className="type-body text-fg-muted">Enter your PIN code to see the delivery date, charges and payment options.</p>
      ) : !estimate || !estimate.serviceable ? (
        <p className="type-body text-danger-subtle-fg">
          {lookupPin(pin)
            ? `We don’t deliver to ${pin} yet. Try another PIN code, or save this item to your wishlist.`
            : 'Enter a valid 6-digit PIN code.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5 type-body text-fg-muted">
          <li className="flex items-start gap-2">
            <Truck aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
            <span>
              <span className="type-label text-fg">Delivery by {formatDayShort(estimate.date)}</span>
              {' · '}
              {estimate.fee === 0 ? 'Free' : formatINR(estimate.fee)}
              {estimate.city ? ` · ${estimate.city}, ${estimate.state}` : ''}
            </span>
          </li>
          {estimate.expressAvailable && estimate.expressDate ? (
            <li className="flex items-start gap-2">
              <Truck aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
              <span>
                Express by {formatDayShort(estimate.expressDate)} for {formatINR(estimate.expressFee)}, chosen at checkout
              </span>
            </li>
          ) : null}
          <li className="flex items-start gap-2">
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
            <span>{estimate.cod ? 'Cash on delivery available' : (estimate.codReason ?? 'Prepaid orders only')}</span>
          </li>
          <li className="flex items-start gap-2">
            <RotateCcw aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
            <span>
              {returnDays > 0 ? `${returnDays}-day replacement` : 'No returns on this item'}
              {returnDays > 0 ? ' from the day it is delivered' : ''}
            </span>
          </li>
        </ul>
      )}
    </section>
  )
}

interface ProductData {
  detail: ProductDetail
  reviews: Review[]
  authors: Record<string, string>
  similar: Product[]
  bundle: Product[]
  recent: Product[]
  offers: OfferRow[]
}

/** The buy box and everything under it. Split out so its hooks only run with data. */
function ProductView({ data }: { data: ProductData }) {
  const { detail } = data
  const product = detail.product
  const navigate = useNavigate()

  const { selection, variant, setAxis } = useVariantSelection(product)
  const [qty, setQty] = useState(1)
  const [pinOpen, setPinOpen] = useState(false)
  const [sellersOpen, setSellersOpen] = useState(false)
  const [sizeChartOpen, setSizeChartOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)

  const pin = useCart((cart) => cart.pin)
  const setPin = useCart((cart) => cart.setPin)
  const addToCart = useCart((cart) => cart.add)
  const setBuyNow = useCart((cart) => cart.setBuyNow)
  const cartLines = useCart((cart) => cart.lines)
  const inCart = cartLines.some((line) => line.lineId === `${product.id}:${variant.id}`)
  const wishlisted = useWishlist((store) => store.ids.includes(product.id))
  const toggleWishlist = useWishlist((store) => store.toggle)
  const { customerId } = useSession()
  const wide = useMediaQuery('(min-width: 64rem)')

  const live = useDb(
    (view) => ({
      estimate: pin
        ? estimateDelivery({
            pin,
            fromStateCode: detail.seller?.stateCode ?? '29',
            dispatchDays: product.dispatchDays,
            value: variant.price * qty,
            cod: product.cod,
            settings: view.settings,
          })
        : null,
      coupons: getAvailableCoupons(view, {
        customerId,
        lines: [{ lineId: 'preview', productId: product.id, variantId: variant.id, qty }],
      })
        .filter((offer) => offer.applicable)
        .slice(0, 2),
      settings: view.settings,
    }),
    [pin, product.id, variant.id, qty, customerId, detail.seller?.stateCode],
  )

  // Quantity can never exceed the variant's stock; a narrower variant clamps it.
  const maxQty = Math.max(1, Math.min(MAX_QTY_PER_LINE, variant.stock))
  const [lastMax, setLastMax] = useState(maxQty)
  if (lastMax !== maxQty) {
    setLastMax(maxQty)
    if (qty > maxQty) setQty(maxQty)
  }

  const outOfStock = variant.stock <= 0
  const media = variant.media?.length ? variant.media : product.media.length > 0 ? product.media : FALLBACK_MEDIA
  const label = variantLabel(variant)

  const offerLines: OfferLine[] = []
  for (const offer of live.coupons) {
    offerLines.push({
      id: `coupon-${offer.coupon.code}`,
      icon: <BadgePercent aria-hidden />,
      title: `${offer.coupon.code} · save ${formatINR(offer.discount)}`,
      detail: `${offer.coupon.title}. Apply it in the cart.`,
    })
  }
  offerLines.push({
    id: 'bank',
    icon: <CreditCard aria-hidden />,
    title: '10% off with Demo Bank cards',
    detail: 'On orders above ₹2,999, up to ₹1,500 per card.',
  })
  offerLines.push({
    id: 'upi',
    icon: <Smartphone aria-hidden />,
    title: 'Up to ₹500 cashback',
    detail: 'Pay with any UPI app at checkout.',
  })
  if (variant.price >= 9999) {
    offerLines.push({
      id: 'emi',
      icon: <CreditCard aria-hidden />,
      title: `No-cost EMI from ${formatINR(Math.round(variant.price / 9))} per month`,
      detail: 'On credit cards, 3 to 9 months.',
    })
  }
  if (variant.price >= live.settings.freeDeliveryThreshold) {
    offerLines.push({
      id: 'delivery',
      icon: <Truck aria-hidden />,
      title: 'Free delivery',
      detail: `On every order above ${formatINR(live.settings.freeDeliveryThreshold)}.`,
    })
  }
  if (product.returnDays > 0) {
    offerLines.push({
      id: 'returns',
      icon: <RotateCcw aria-hidden />,
      title: `${product.returnDays}-day replacement`,
      detail: 'If the item arrives damaged, defective or different.',
    })
  }

  const crumbs: Crumb[] = [
    { label: 'Home', to: '/' },
    ...detail.path.map((entry, index) => ({
      label: entry.name,
      to: index === 0 ? `/c/${entry.slug}` : `/c/${detail.path[0]?.slug}/${entry.slug}`,
    })),
    { label: product.title },
  ]

  /** Desktop opens the mini-cart; phones get a toast so the page stays visible. */
  const confirmAdded = (title: string, description: string) => {
    if (wide) {
      setCartOpen(true)
      return
    }
    toast.success(title, {
      description,
      action: { label: 'View bag', onClick: () => void navigate('/cart') },
    })
  }

  const add = (quantity = qty) => {
    addToCart({
      productId: product.id,
      variantId: variant.id,
      sellerId: product.sellerId,
      qty: quantity,
      stock: variant.stock,
    })
    confirmAdded('Added to bag', `${product.title}${label ? ` · ${label}` : ''} · ${pluralWithCount(quantity, 'item')}`)
  }

  const buyNow = () => {
    setBuyNow({ productId: product.id, variantId: variant.id, sellerId: product.sellerId, qty, stock: variant.stock })
    void navigate('/checkout/address')
  }

  const addBundle = (items: BundleItem[]) => {
    for (const item of items) {
      addToCart({
        productId: item.product.id,
        variantId: item.variant.id,
        sellerId: item.product.sellerId,
        qty: 1,
        stock: item.variant.stock,
      })
    }
    confirmAdded(`${items.length} items added to your bag`, 'Review them together in the cart.')
  }

  const highlightsList = (
    <ul className="grid gap-2 sm:grid-cols-2">
      {product.highlights.map((highlight) => (
        <li key={highlight} className="flex items-start gap-2 type-body text-fg-muted">
          <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
          {highlight}
        </li>
      ))}
    </ul>
  )

  const descriptionText = <p className="max-w-prose type-body text-fg-muted">{product.description}</p>

  const buyActions = (
    <div className="flex flex-wrap items-center gap-2">
      {outOfStock ? (
        <Button
          size="lg"
          variant="outline"
          onClick={() =>
            toast.success('We’ll tell you when it’s back', {
              description: `${product.title}${label ? ` · ${label}` : ''}`,
            })
          }
        >
          Notify me
        </Button>
      ) : inCart ? (
        <Button size="lg" asChild>
          <Link to="/cart">Go to bag</Link>
        </Button>
      ) : (
        <Button size="lg" leftIcon={<ShoppingBag aria-hidden />} onClick={() => add()}>
          Add to bag
        </Button>
      )}
      <Button size="lg" variant="outline" disabled={outOfStock} onClick={buyNow}>
        Buy now
      </Button>
      <IconButton
        label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
        icon={<Heart aria-hidden className={wishlisted ? 'fill-current' : undefined} />}
        variant="outline"
        size="lg"
        className={wishlisted ? 'text-primary' : undefined}
        onClick={() => toggleWishlist(product.id)}
      />
      <IconButton
        label="Copy link"
        icon={<Link2 aria-hidden />}
        variant="outline"
        size="lg"
        onClick={() => {
          void navigator.clipboard.writeText(window.location.href)
          toast.success('Link copied')
        }}
      />
    </div>
  )

  return (
    <div className="mx-auto flex max-w-shop flex-col gap-8 px-4 py-5 pb-32 sm:px-6 sm:py-6 lg:px-8 lg:pb-10">
      <Breadcrumbs items={crumbs} />

      {detail.unavailable ? (
        <div className="rounded-card border border-danger-border bg-danger-subtle px-4 py-3">
          <p className="type-label text-danger-subtle-fg">Currently unavailable</p>
          <p className="type-body text-danger-subtle-fg">
            {detail.unavailableReason} Similar products from other verified sellers are listed below.
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <ProductGallery media={media} title={product.title} />
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:col-span-5">
          <div className="flex flex-col gap-1">
            <Link
              to={`/search?q=${encodeURIComponent(product.brand)}`}
              className="type-label text-link hover:underline underline-offset-2"
            >
              {product.brand}
            </Link>
            <PageHeader
              title={product.title}
              // Most titles already open with the brand; only prefix it when they don't.
              documentTitle={
                product.title.toLowerCase().startsWith(product.brand.toLowerCase())
                  ? product.title
                  : `${product.brand} ${product.title}`
              }
              {...(product.tags.includes('bestseller') ? { badge: <Badge tone="warning">Bestseller</Badge> } : {})}
              meta={
                <a href="#reviews" className="flex items-center gap-2 hover:underline underline-offset-2">
                  <Rating value={detail.rating.avg} count={detail.rating.count} />
                  <span>{pluralWithCount(data.reviews.length, 'review')}</span>
                </a>
              }
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Price price={variant.price} mrp={variant.mrp} size="xl" inclusive />
            {product.dealEndsAt && product.dealEndsAt > DEMO_NOW ? (
              <Countdown endsAt={product.dealEndsAt} />
            ) : null}
          </div>

          <OffersList lines={offerLines} emiBase={variant.price} />

          {product.axes.map((axis) => {
            const choices = axisChoices(product, axis, selection)
            const blocked = choices.filter((choice) => choice.unavailable)
            const others = otherAxisSummary(product, axis, selection)
            return (
              <div key={axis} className="flex flex-col gap-1.5">
                <VariantPicker
                  axis={axis}
                  label={AXIS_LABEL[axis]}
                  choices={choices}
                  {...(selection[axis] ? { value: selection[axis] } : {})}
                  onChange={(value) => setAxis(axis, value)}
                  {...(product.swatches ? { swatches: product.swatches } : {})}
                  {...(axis === 'size'
                    ? {
                        action: (
                          <Button variant="link" size="sm" onClick={() => setSizeChartOpen(true)}>
                            Size chart
                          </Button>
                        ),
                      }
                    : {})}
                />
                {blocked.length > 0 ? (
                  <p className="type-caption text-fg-muted">
                    Crossed-out options are not sold{others ? ` with ${others}` : ' with this selection'}.
                  </p>
                ) : null}
              </div>
            )
          })}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <StatusBadge domain="stock" status={stockStatus(variant.stock, variant.lowStockAt)} size="sm" />
            {!outOfStock && variant.stock <= variant.lowStockAt ? (
              <span className="type-caption text-warning-subtle-fg">Only {formatNumber(variant.stock)} left</span>
            ) : null}
            {!outOfStock ? (
              <QuantityStepper
                value={qty}
                max={maxQty}
                onChange={setQty}
                label={`Quantity of ${product.title}`}
                className="ml-auto"
              />
            ) : null}
          </div>
          {!outOfStock && maxQty < MAX_QTY_PER_LINE ? (
            <p className="type-caption text-fg-muted">
              Up to {formatNumber(maxQty)} per order while stock lasts.
            </p>
          ) : null}

          <DeliveryBlock
            pin={pin}
            estimate={live.estimate}
            returnDays={product.returnDays}
            onEditPin={() => setPinOpen(true)}
          />

          {detail.seller ? (
            <SellerCard
              seller={detail.seller}
              variant="inline"
              otherOffers={
                data.offers.length > 0 ? (
                  <Button variant="link" size="sm" className="self-start" onClick={() => setSellersOpen(true)}>
                    {pluralWithCount(data.offers.length, 'other seller')} from{' '}
                    {formatINR(Math.min(...data.offers.map((offer) => offer.price)))}
                  </Button>
                ) : null
              }
            />
          ) : null}

          {wide && !detail.unavailable ? buyActions : null}
        </div>
      </div>

      {/* Sections on desktop; the same three blocks become accordions on phones. */}
      {wide ? (
        <>
          {product.highlights.length > 0 ? (
            <section aria-labelledby="highlights-heading" className="flex flex-col gap-3">
              <h2 id="highlights-heading" className="type-h2 text-fg">
                Highlights
              </h2>
              {highlightsList}
            </section>
          ) : null}

          <section aria-labelledby="description-heading" className="flex flex-col gap-3">
            <h2 id="description-heading" className="type-h2 text-fg">
              Product description
            </h2>
            {descriptionText}
          </section>

          {product.specs.length > 0 ? (
            <section aria-labelledby="specs-heading" className="flex flex-col gap-3">
              <h2 id="specs-heading" className="type-h2 text-fg">
                Specifications
              </h2>
              <SpecsTable groups={product.specs} />
            </section>
          ) : null}
        </>
      ) : (
        <Accordion
          type="multiple"
          defaultValue={['highlights']}
          className="rounded-card border border-border bg-surface px-4"
        >
          {product.highlights.length > 0 ? (
            <AccordionItem value="highlights">
              <AccordionTrigger>Highlights</AccordionTrigger>
              <AccordionContent>{highlightsList}</AccordionContent>
            </AccordionItem>
          ) : null}
          <AccordionItem value="description">
            <AccordionTrigger>Product description</AccordionTrigger>
            <AccordionContent>{descriptionText}</AccordionContent>
          </AccordionItem>
          {product.specs.length > 0 ? (
            <AccordionItem value="specs">
              <AccordionTrigger>Specifications</AccordionTrigger>
              <AccordionContent>
                <SpecsTable groups={product.specs} />
              </AccordionContent>
            </AccordionItem>
          ) : null}
        </Accordion>
      )}

      {!detail.unavailable ? (
        <FrequentlyBought
          items={[
            { product, variant },
            ...data.bundle.map((entry) => ({
              product: entry,
              variant:
                entry.variants.find((option) => option.active && option.stock > 0) ??
                entry.variants[0] ??
                variant,
            })),
          ]}
          onAdd={addBundle}
        />
      ) : null}

      <ProductReviews
        rating={detail.rating}
        reviews={data.reviews}
        authors={data.authors}
        {...(detail.seller ? { sellerName: detail.seller.displayName } : {})}
      />

      <ProductRail title="Similar products" products={data.similar} onToggleWishlist={toggleWishlist} />
      <ProductRail title="Recently viewed" products={data.recent} onToggleWishlist={toggleWishlist} />

      {/* Phones and tablets keep the buy actions within thumb reach. */}
      {!wide && !detail.unavailable ? (
        <div className="fixed inset-x-0 bottom-tabbar z-20 border-t border-border bg-surface pb-safe md:bottom-0 lg:hidden">
          <div className="mx-auto flex max-w-shop items-center gap-3 px-4 py-2 sm:px-6">
            <div className="hidden min-w-0 flex-col sm:flex">
              <Price price={variant.price} mrp={variant.mrp} size="sm" />
            </div>
            <div className="flex flex-1 items-center gap-2">
              {outOfStock ? (
                <Button
                  fullWidth
                  size="lg"
                  variant="outline"
                  onClick={() =>
                    toast.success('We’ll tell you when it’s back', {
                      description: `${product.title}${label ? ` · ${label}` : ''}`,
                    })
                  }
                >
                  Notify me
                </Button>
              ) : inCart ? (
                <Button fullWidth size="lg" asChild>
                  <Link to="/cart">Go to bag</Link>
                </Button>
              ) : (
                <Button fullWidth size="lg" leftIcon={<ShoppingBag aria-hidden />} onClick={() => add()}>
                  Add to bag
                </Button>
              )}
              <Button fullWidth size="lg" variant="outline" disabled={outOfStock} onClick={buyNow}>
                Buy now
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <OtherSellersSheet
        open={sellersOpen}
        onOpenChange={setSellersOpen}
        productTitle={product.title}
        rows={data.offers}
        onAdd={(row) => {
          addToCart({ productId: product.id, variantId: variant.id, sellerId: row.sellerId, qty: 1, stock: row.stock })
          setSellersOpen(false)
          confirmAdded('Added to bag', `${product.title} · sold by ${row.sellerName}`)
        }}
      />

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} lines={cartLines} />

      <Dialog open={sizeChartOpen} onOpenChange={setSizeChartOpen}>
        <DialogContent title="Size chart" description={`Sizes listed by ${detail.seller?.displayName ?? 'the seller'}`}>
          <table className="w-full text-left type-body">
            <caption className="sr-only">Sizes available for {product.title}</caption>
            <thead>
              <tr className="border-b border-border text-fg-muted">
                <th scope="col" className="py-2 pr-3 type-caption font-medium">
                  Size
                </th>
                <th scope="col" className="py-2 type-caption font-medium">
                  Availability
                </th>
              </tr>
            </thead>
            <tbody>
              {axisChoices(product, 'size', {}).map((choice) => (
                <tr key={choice.value} className="border-b border-border-subtle last:border-b-0">
                  <th scope="row" className="py-2 pr-3 font-normal text-fg">
                    {choice.value}
                  </th>
                  <td className="py-2">
                    <StatusBadge
                      domain="stock"
                      status={choice.outOfStock ? 'out_of_stock' : 'in_stock'}
                      size="sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="pt-3 type-caption text-fg-muted">
            Sizes follow standard India sizing. Check the fabric and fit rows in the specifications before you order.
          </p>
        </DialogContent>
      </Dialog>

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

function ProductSkeleton() {
  usePageTitle('Loading product')
  return (
    <div className="mx-auto flex max-w-shop flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      {/* The page still needs its one heading while the product is on its way. */}
      <h1 className="sr-only">Loading product</h1>
      <Skeleton className="h-3.5 w-64" />
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Skeleton className="aspect-product w-full rounded-card" />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="h-6 w-40" />
          <SkeletonText lines={3} />
          <Skeleton className="h-24 w-full rounded-card" />
          <Skeleton className="h-11 w-full rounded-control" />
        </div>
      </div>
    </div>
  )
}

/** One product: gallery, variants, delivery promise, sellers, specs and reviews. */
export default function ProductPage() {
  const params = useParams()
  const slug = params.productSlug ?? ''
  const pin = useCart((cart) => cart.pin)
  const recentIds = useRecent((store) => store.products)
  const viewProduct = useRecent((store) => store.viewProduct)

  const query = useDemoQuery(
    (view) => {
      const detail = getProductBySlug(view, slug)
      if (!detail) return null
      const product = detail.product
      const reviews = (view.reviewsByProduct.get(product.id) ?? []).filter((review) => review.status === 'published')
      const authors: Record<string, string> = {}
      for (const review of reviews) {
        authors[review.customerId] = view.customerById.get(review.customerId)?.name ?? 'Chowk shopper'
      }
      const offers: OfferRow[] = detail.offers.map((offer) => {
        const estimate = pin
          ? estimateDelivery({
              pin,
              fromStateCode: offer.seller.stateCode,
              dispatchDays: offer.dispatchDays,
              value: offer.price,
              cod: product.cod,
              settings: view.settings,
            })
          : null
        return {
          sellerId: offer.seller.id,
          sellerName: offer.seller.displayName,
          sellerSlug: offer.seller.slug,
          rating: offer.seller.rating,
          ratingCount: offer.seller.ratingCount,
          price: offer.price,
          mrp: offer.mrp,
          stock: offer.stock,
          ...(estimate?.serviceable ? { deliveryLabel: `Delivery by ${formatDayShort(estimate.date)}` } : {}),
        }
      })
      return {
        detail,
        reviews,
        authors,
        offers,
        similar: getSimilarProducts(view, product.id, 12),
        bundle: getFrequentlyBoughtTogether(view, product.id, 2),
        recent: getProductsByIds(view, recentIds)
          .filter((entry) => entry.id !== product.id)
          .slice(0, 12),
      }
    },
    [slug, pin, recentIds],
  )

  const productId = query.data?.detail.product.id
  useEffect(() => {
    if (productId) viewProduct(productId)
  }, [productId, viewProduct])

  if (query.status === 'loading') return <ProductSkeleton />

  if (query.status === 'error') {
    return (
      <div className="mx-auto flex max-w-shop flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader title="Product" breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Product' }]} />
        <EmptyState
          icon={<PackageX aria-hidden />}
          title="We couldn’t load this product"
          description="Something went wrong on our side. Try again in a moment."
          action={<Button onClick={query.retry}>Retry</Button>}
        />
      </div>
    )
  }

  if (!query.data) {
    return (
      <div className="mx-auto flex max-w-shop flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader title="Product not found" breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Product' }]} />
        <EmptyState
          icon={<PackageX aria-hidden />}
          title="This product is no longer listed"
          description="It may have been removed by the seller. Search for it, or browse the category it belonged to."
          action={
            <Button asChild>
              <Link to="/categories">Browse categories</Link>
            </Button>
          }
          secondaryAction={
            <Button variant="outline" asChild>
              <Link to="/deals">View deals</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return <ProductView key={query.data.detail.product.id} data={query.data} />
}
