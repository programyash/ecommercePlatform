import { BadgePercent, CreditCard, Package, Smartphone, Truck } from 'lucide-react'
import { Link } from 'react-router'
import {
  getCategoryTree,
  getCustomerOrders,
  getDeals,
  getDeliveryEstimate,
  getHomeRails,
  getProductsByIds,
  getTopRatedSellers,
  useCart,
  useDemoQuery,
  useRecent,
  useSession,
  useWishlist,
  type Product,
} from '@/data'
import { CategoryIcon } from '@/components/icons/category-icons'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Img } from '@/components/ui/img'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { ProductGrid } from '@/components/commerce/product-grid'
import { ProductRail } from '@/components/commerce/product-rail'
import { Rating } from '@/components/commerce/rating'
import { formatDayShort } from '@/lib/format'
import { usePageTitle } from '@/lib/use-page-title'
import { CampaignCarousel, type Campaign } from '../components/home/campaign-carousel'
import { Countdown } from '../components/home/countdown'

const CAMPAIGNS: Campaign[] = [
  {
    id: 'utsav',
    eyebrow: 'Festive Utsav Sale',
    title: 'Up to 60% off across the marketplace',
    detail: 'Verified sellers across India, one festive week. Extra 10% back with Demo Bank cards.',
    cta: 'Shop the sale',
    to: '/deals',
    image: 'rack-tees',
  },
  {
    id: 'ganesh',
    eyebrow: 'Ganesh Chaturthi',
    title: 'Puja essentials and festive décor',
    detail: 'Lamps, ceramics and home pieces from makers in Coimbatore, Jaipur and Panipat.',
    cta: 'Shop home & kitchen',
    to: '/c/home-kitchen',
    image: 'lamps-copper',
  },
  {
    id: 'mobiles',
    eyebrow: 'New launches',
    title: '5G phones with no-cost EMI',
    detail: 'From ₹12,499, with 7-day replacement and delivery dates shown before you pay.',
    cta: 'Shop mobiles',
    to: '/c/mobiles-tablets',
    image: 'phone-neon',
  },
]

const OFFERS = [
  { icon: Smartphone, title: 'Up to ₹500 cashback', detail: 'Pay with any UPI app' },
  { icon: CreditCard, title: '10% off with Demo Bank', detail: 'On orders above ₹2,999' },
  { icon: BadgePercent, title: 'No-cost EMI', detail: 'On phones and laptops above ₹9,999' },
]

function SectionHeading({ title, href, meta }: { title: string; href?: string; meta?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="type-h2 text-fg">{title}</h2>
        {meta}
      </div>
      {href ? (
        <Link to={href} className="type-label text-link hover:underline underline-offset-2">
          View all
        </Link>
      ) : null}
    </div>
  )
}

/** The storefront's front door: campaigns, deals, categories and picked-for-you rails. */
export default function HomePage() {
  usePageTitle('Shop online')

  const pin = useCart((state) => state.pin)
  const wishlist = useWishlist((state) => state.ids)
  const toggleWishlist = useWishlist((state) => state.toggle)
  const recentIds = useRecent((state) => state.products)
  const { customerId, customerSignedIn } = useSession()

  const home = useDemoQuery(
    (view) => ({
      categories: getCategoryTree(view),
      deals: getDeals(view, 12),
      rails: getHomeRails(view),
      sellers: getTopRatedSellers(view, 6),
      recent: getProductsByIds(view, recentIds).slice(0, 12),
      activeOrder: customerSignedIn
        ? getCustomerOrders(view, customerId).find((order) =>
            order.shipments.some((shipment) => !['delivered', 'cancelled'].includes(shipment.shipment.status)),
          )
        : undefined,
      deliveryFor: (product: Product) => (pin ? getDeliveryEstimate(view, pin, product.id) : null),
    }),
    [pin, recentIds, customerId, customerSignedIn],
  )

  const cardProps = (product: Product) => {
    const estimate = home.data?.deliveryFor(product)
    return {
      wishlisted: wishlist.includes(product.id),
      deliveryNote: estimate?.serviceable ? `Free delivery by ${formatDayShort(estimate.date)}` : undefined,
    }
  }

  if (home.status === 'error') {
    return (
      <div className="mx-auto max-w-shop px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="sr-only">Chowk — online shopping from verified Indian sellers</h1>
        <EmptyState
          icon={<Package aria-hidden />}
          title="We couldn’t load the storefront"
          description="Something went wrong on our side. Try again in a moment."
          action={<Button onClick={home.retry}>Retry</Button>}
        />
      </div>
    )
  }

  const loading = home.status === 'loading'
  const data = home.data

  return (
    <div className="mx-auto flex max-w-shop flex-col gap-10 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <h1 className="sr-only">Chowk — online shopping from verified Indian sellers</h1>

      {/* Campaigns + supporting tiles */}
      <section className="grid gap-4 lg:grid-cols-3">
        <CampaignCarousel campaigns={CAMPAIGNS} className="lg:col-span-2" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Link
            to="/c/fashion"
            className="group relative overflow-hidden rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Img image="look-yellow" alt="" ratio="landscape" width={520} sizes="(min-width: 1024px) 26vw, 50vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-inverse/85 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-4 text-fg-inverse">
              <p className="type-title">Ethnic & festive wear</p>
              <p className="type-caption opacity-90">Sarees, kurtas and more from Jaipur</p>
            </div>
          </Link>
          <Link
            to="/c/electronics"
            className="group relative overflow-hidden rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Img image="headphones-yellow" alt="" ratio="landscape" width={520} sizes="(min-width: 1024px) 26vw, 50vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-inverse/85 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-4 text-fg-inverse">
              <p className="type-title">Audio under ₹2,000</p>
              <p className="type-caption opacity-90">Earbuds, headphones and speakers</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Active order tracker */}
      {data?.activeOrder ? (
        <section className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-card border border-border bg-surface-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-fg-muted">
              <Truck className="size-5" />
            </span>
            <div className="flex min-w-0 flex-col">
              <p className="type-label text-fg">Your order {data.activeOrder.order.id} is on the way</p>
              <p className="type-caption text-fg-muted">
                {data.activeOrder.summary.label}
                {data.activeOrder.shipments[0]?.shipment.promisedBy
                  ? ` · arriving by ${formatDayShort(data.activeOrder.shipments[0].shipment.promisedBy)}`
                  : ''}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data.activeOrder.shipments.slice(0, 2).map((shipment) => (
              <StatusBadge key={shipment.shipment.id} domain="shipment" status={shipment.shipment.status} size="sm" />
            ))}
          </div>
          <Button variant="outline" size="sm" asChild className="ml-auto">
            <Link to={`/account/orders/${data.activeOrder.order.id}`}>Track order</Link>
          </Button>
        </section>
      ) : null}

      {/* Offers */}
      <section aria-label="Offers" className="grid gap-3 sm:grid-cols-3">
        {OFFERS.map((offer) => (
          <div key={offer.title} className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3">
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-subtle text-accent-subtle-fg">
              <offer.icon className="size-4.5" />
            </span>
            <div className="flex min-w-0 flex-col">
              <p className="type-label text-fg">{offer.title}</p>
              <p className="type-caption text-fg-muted">{offer.detail}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Deals */}
      <section className="flex flex-col gap-4">
        <SectionHeading
          title="Deals of the day"
          href="/deals"
          meta={data?.deals[0]?.dealEndsAt ? <Countdown endsAt={data.deals[0].dealEndsAt} /> : null}
        />
        <ProductGrid
          products={data?.deals.slice(0, 8) ?? []}
          loading={loading}
          skeletonCount={8}
          getCardProps={cardProps}
          onToggleWishlist={toggleWishlist}
          empty={<EmptyState variant="compact" title="No deals right now" description="Check back tomorrow morning." />}
        />
      </section>

      {/* Categories */}
      <section aria-labelledby="shop-by-category" className="flex flex-col gap-4">
        <h2 id="shop-by-category" className="type-h2 text-fg">
          Shop by category
        </h2>
        <ul className="grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-5 lg:grid-cols-10">
          {loading
            ? Array.from({ length: 10 }, (_, index) => (
                <li key={index} className="flex flex-col items-center gap-2">
                  <Skeleton className="size-16 rounded-full sm:size-20" />
                  <Skeleton className="h-3 w-14" />
                </li>
              ))
            : data?.categories.map((category) => (
                <li key={category.id}>
                  <Link
                    to={`/c/${category.slug}`}
                    className="group flex flex-col items-center gap-2 rounded-card p-1 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {category.image ? (
                      <Img
                        image={category.image}
                        alt=""
                        ratio="square"
                        width={160}
                        sizes="80px"
                        className="size-16 rounded-full ring-1 ring-border transition-transform duration-200 group-hover:scale-105 sm:size-20"
                      />
                    ) : (
                      <span className="grid size-16 place-items-center rounded-full bg-surface-2 text-fg-muted ring-1 ring-border sm:size-20">
                        <CategoryIcon name={category.icon} className="size-6" />
                      </span>
                    )}
                    <span className="type-caption text-fg group-hover:text-primary">{category.name}</span>
                  </Link>
                </li>
              ))}
        </ul>
      </section>

      {/* Picked rails */}
      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-3">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-64 w-44 rounded-card" />
            ))}
          </div>
        </div>
      ) : (
        // The deals rail is already the grid above.
        data?.rails
          .filter((rail) => rail.id !== 'deals')
          .map((rail) => (
          <ProductRail
            key={rail.id}
            title={rail.title}
            href={rail.href}
            products={rail.products}
            getCardProps={cardProps}
            onToggleWishlist={toggleWishlist}
            meta={rail.subtitle ? <span className="type-caption text-fg-muted">{rail.subtitle}</span> : null}
          />
        ))
      )}

      {/* Recently viewed */}
      {data?.recent.length ? (
        <ProductRail
          title="Recently viewed"
          products={data.recent}
          getCardProps={cardProps}
          onToggleWishlist={toggleWishlist}
        />
      ) : null}

      {/* Sellers */}
      <section aria-labelledby="top-sellers" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <h2 id="top-sellers" className="type-h2 text-fg">
            Top-rated sellers
          </h2>
          <p className="type-caption text-fg-muted">Every seller is KYC-verified before they can list</p>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(data?.sellers ?? []).map((seller) => (
            <li key={seller.id}>
              <Link
                to={`/store/${seller.slug}`}
                className="flex h-full flex-col items-start gap-2 rounded-card border border-border bg-surface p-3 transition-shadow hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Avatar name={seller.displayName} shape="square" />
                <span className="line-clamp-2 type-label text-fg">{seller.displayName}</span>
                {seller.rating ? <Rating value={seller.rating} count={seller.ratingCount} /> : null}
                <span className="type-caption text-fg-muted">{seller.city}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
