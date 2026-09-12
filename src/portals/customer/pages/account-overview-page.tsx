import { CreditCard, Heart, MapPin, Package, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import {
  getBuyAgain,
  getCustomerOrders,
  getProductsByIds,
  useDemoQuery,
  useSession,
  useWishlist,
  type OrderView,
} from '@/data'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ProductRail } from '@/components/commerce/product-rail'
import { formatDate, formatPercent, pluralWithCount } from '@/lib/format'
import { maskCard, maskUpi } from '@/lib/mask'
import { buyAgain } from '../components/account/buy-again'
import { OrderCard } from '../components/account/order-card'

/** The account front page: the order in flight, then everything else in one glance. */
export default function AccountOverviewPage() {
  const customerId = useSession((state) => state.customerId)
  const wishlistIds = useWishlist((state) => state.ids)
  const toggleWishlist = useWishlist((state) => state.toggle)

  const query = useDemoQuery(
    (view) => ({
      customer: view.customerById.get(customerId),
      orders: getCustomerOrders(view, customerId),
      again: getBuyAgain(view, customerId, 10),
      wishlist: getProductsByIds(view, wishlistIds),
    }),
    [customerId, wishlistIds],
  )

  const onBuyAgain = (order: OrderView) => {
    const result = buyAgain(order)
    if (result.added === 0) {
      toast.message('Nothing could be added', { description: 'These items are no longer on sale.' })
      return
    }
    toast.success(`${pluralWithCount(result.added, 'item')} added to your bag`, {
      description: result.unavailable > 0 ? `${result.unavailable} item is no longer available.` : 'Ready when you are.',
    })
  }

  if (query.status === 'error') {
    return (
      <>
        <PageHeader title="Your account" />
        <div className="rounded-card border border-border bg-surface">
          <EmptyState
            icon={<TriangleAlert aria-hidden />}
            title="We couldn’t load your account"
            description="Something went wrong on our side. Try again in a moment."
            action={<Button onClick={query.retry}>Retry</Button>}
          />
        </div>
      </>
    )
  }

  if (query.status === 'loading' || !query.data) {
    return (
      <>
        <PageHeader title="Your account" />
        <Skeleton className="h-44 rounded-card" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-36 rounded-card" />
          <Skeleton className="h-36 rounded-card" />
          <Skeleton className="h-36 rounded-card" />
        </div>
      </>
    )
  }

  // `?demo=empty` forces every panel into its empty state.
  const empty = query.status === 'empty'
  const customer = query.data.customer
  const orders = empty ? [] : query.data.orders
  const again = empty ? [] : query.data.again
  const wishlist = empty ? [] : query.data.wishlist
  const payments = empty ? [] : (customer?.savedPayments ?? [])

  const latest = orders[0]
  const defaultAddress = empty
    ? undefined
    : customer?.addresses.find((address) => address.id === customer.defaultAddressId)
  const upi = payments.filter((payment) => payment.kind === 'upi')
  const cards = payments.filter((payment) => payment.kind === 'card')
  const delivered = orders.filter((order) => order.summary.label === 'Delivered').length

  return (
    <>
      <PageHeader
        title="Your account"
        documentTitle="My account"
        description={`Hello ${customer?.name?.split(' ')[0] ?? 'there'} — here is everything on your account.`}
        meta={
          <>
            <span>Member since {customer ? formatDate(customer.joinedAt) : '—'}</span>
            <span>{pluralWithCount(orders.length, 'order')}</span>
            {orders.length > 0 ? (
              <span>{formatPercent(delivered / orders.length, { decimals: 0 })} delivered</span>
            ) : null}
          </>
        }
      />

      <section className="flex flex-col gap-3" aria-labelledby="latest-order">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <h2 id="latest-order" className="type-h2 text-fg">
            Latest order
          </h2>
          <Link to="/account/orders" className="type-label text-link hover:underline underline-offset-2">
            View all orders
          </Link>
        </div>
        {latest ? (
          <OrderCard order={latest} onBuyAgain={onBuyAgain} />
        ) : (
          <div className="rounded-card border border-border bg-surface">
            <EmptyState
              icon={<Package aria-hidden />}
              title="No orders yet"
              description="Once you place an order it shows up here, with a tracker for every parcel."
              action={
                <Button asChild>
                  <Link to="/">Start shopping</Link>
                </Button>
              }
            />
          </div>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard
          title="Default address"
          actions={
            <Link to="/account/addresses" className="type-caption text-link hover:underline">
              Manage
            </Link>
          }
        >
          {defaultAddress ? (
            <address className="flex flex-col gap-1 not-italic type-body text-fg-muted">
              <span className="type-label text-fg">{defaultAddress.name}</span>
              <span>
                {defaultAddress.line1}
                {defaultAddress.line2 ? `, ${defaultAddress.line2}` : ''}
              </span>
              <span>
                {defaultAddress.city}, {defaultAddress.state} {defaultAddress.pin}
              </span>
            </address>
          ) : (
            <EmptyState
              variant="inline"
              icon={<MapPin aria-hidden />}
              title="No address saved"
              description="Add one so checkout knows where to deliver."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Saved payments"
          actions={
            <Link to="/account/payments" className="type-caption text-link hover:underline">
              Manage
            </Link>
          }
        >
          {upi.length > 0 || cards.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {upi.map((payment) => (
                <li key={payment.id} className="flex items-center gap-2 type-body text-fg">
                  <CreditCard aria-hidden className="size-4 shrink-0 text-fg-muted" />
                  {payment.kind === 'upi' ? maskUpi(payment.vpa) : null}
                </li>
              ))}
              {cards.map((payment) => (
                <li key={payment.id} className="flex items-center gap-2 type-body text-fg">
                  <CreditCard aria-hidden className="size-4 shrink-0 text-fg-muted" />
                  {payment.kind === 'card' ? `${payment.network.toUpperCase()} ${maskCard(payment.last4)}` : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              variant="inline"
              icon={<CreditCard aria-hidden />}
              title="Nothing saved yet"
              description="Save a UPI ID to pay faster next time."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Wishlist"
          actions={
            <Link to="/account/wishlist" className="type-caption text-link hover:underline">
              Open
            </Link>
          }
        >
          {wishlist.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="type-kpi text-fg">{wishlist.length}</p>
              <p className="type-caption text-fg-muted">
                {pluralWithCount(wishlist.length, 'item')} saved. We’ll tell you if the price drops.
              </p>
            </div>
          ) : (
            <EmptyState
              variant="inline"
              icon={<Heart aria-hidden />}
              title="Nothing saved yet"
              description="Tap the heart on any product to save it."
            />
          )}
        </SectionCard>
      </div>

      <ProductRail
        title="Buy it again"
        products={again}
        getCardProps={(product) => ({ wishlisted: wishlistIds.includes(product.id) })}
        onToggleWishlist={toggleWishlist}
      />
    </>
  )
}
