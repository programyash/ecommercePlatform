import { BadgeCheck, MapPin, PackageX, RotateCcw, Store, Truck } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { getSellerStore, useDb, type Seller } from '@/data'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Rating } from '@/components/commerce/rating'
import { formatDate } from '@/lib/format'
import { ListingView } from '../components/shopping/listing-view'

function StoreBanner({ seller }: { seller: Seller }) {
  return (
    <section aria-label="About this seller" className="flex flex-col gap-3 rounded-card border border-border bg-surface-2 p-4 sm:flex-row sm:items-start sm:gap-5">
      <Avatar name={seller.displayName} size="lg" shape="square" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="type-body text-fg">{seller.tagline}</p>
          {seller.status === 'active' ? (
            <Badge tone="success" size="sm" icon={<BadgeCheck aria-hidden />}>
              Verified seller
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 type-caption text-fg-muted">
          {seller.rating ? <Rating value={seller.rating} count={seller.ratingCount} /> : <span>No ratings yet</span>}
          <span className="flex items-center gap-1.5">
            <MapPin aria-hidden className="size-3.5" />
            Ships from {seller.city}, {seller.state}
          </span>
          <span className="flex items-center gap-1.5">
            <Store aria-hidden className="size-3.5" />
            Selling since {formatDate(seller.joinedAt)}
          </span>
        </div>
        <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="flex shrink-0 items-center gap-1.5 type-caption text-fg-muted">
              <RotateCcw aria-hidden className="size-3.5" />
              Returns
            </dt>
            <dd className="min-w-0 type-caption text-fg">{seller.policies.returns}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="flex shrink-0 items-center gap-1.5 type-caption text-fg-muted">
              <Truck aria-hidden className="size-3.5" />
              Shipping
            </dt>
            <dd className="min-w-0 type-caption text-fg">{seller.policies.shipping}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

/** A seller's storefront: the listing template with the shop's own header. */
export default function StorePage() {
  const params = useParams()
  const slug = params.sellerSlug ?? ''
  const store = useDb((view) => getSellerStore(view, slug), [slug])

  if (!store) {
    return (
      <div className="mx-auto flex max-w-shop flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader title="Store not found" breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Store' }]} />
        <EmptyState
          icon={<Store aria-hidden />}
          title={`We couldn’t find the store “${slug}”`}
          description="The seller may have changed their store address. Try searching for the product instead."
          action={
            <Button asChild>
              <Link to="/categories">View all categories</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const seller = store.seller
  const unavailable = seller.status !== 'active'

  return (
    <ListingView
      scope={{ sellerId: seller.id }}
      title={seller.displayName}
      documentTitle={`${seller.displayName} store`}
      breadcrumbs={[{ label: 'Home', to: '/' }, { label: seller.displayName }]}
      intro={<StoreBanner seller={seller} />}
      showSellerFacet={false}
      empty={{
        title: 'This store has nothing listed right now',
        description: 'The seller is restocking. Browse similar products from other verified sellers.',
      }}
      {...(unavailable
        ? {
            unavailable: (
              <EmptyState
                icon={<PackageX aria-hidden />}
                title="Currently unavailable"
                description={`${seller.displayName} is not taking orders at the moment. You can still buy these products from other verified sellers.`}
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
            ),
          }
        : {})}
    />
  )
}
