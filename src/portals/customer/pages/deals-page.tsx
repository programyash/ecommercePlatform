import { Link } from 'react-router'
import { getDeals, useDb, type Product } from '@/data'
import { Img } from '@/components/ui/img'
import { Price } from '@/components/commerce/price'
import { Countdown } from '../components/home/countdown'
import { ListingView } from '../components/shopping/listing-view'

/** The three deals closest to ending, so the countdown has something to count. */
function EndingSoon({ products }: { products: Product[] }) {
  return (
    <section aria-labelledby="ending-soon" className="flex flex-col gap-3 rounded-card border border-border bg-surface-2 p-4">
      <h2 id="ending-soon" className="type-title text-fg">
        Ending soon
      </h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {products.map((product) => {
          const cheapest = product.variants.reduce(
            (best, variant) => (variant.price < best.price ? variant : best),
            product.variants[0]!,
          )
          return (
            <li key={product.id} className="flex items-center gap-3">
              <Link
                to={`/p/${product.slug}`}
                className="shrink-0 rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Img
                  image={product.media[0] ?? 'rack-tees'}
                  alt={product.title}
                  ratio="square"
                  width={160}
                  sizes="64px"
                  className="w-16 rounded-card"
                />
              </Link>
              <div className="flex min-w-0 flex-col gap-0.5">
                <Link
                  to={`/p/${product.slug}`}
                  className="line-clamp-1 type-label text-fg hover:text-primary hover:underline underline-offset-2"
                >
                  {product.title}
                </Link>
                <Price price={cheapest.price} mrp={cheapest.mrp} size="sm" />
                {product.dealEndsAt ? <Countdown endsAt={product.dealEndsAt} /> : null}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Deals: everything 30% off or more, with the clock on the offers that expire. */
export default function DealsPage() {
  const endingSoon = useDb(
    (view) =>
      getDeals(view, 24)
        .filter((product) => Boolean(product.dealEndsAt))
        .sort((a, b) => (a.dealEndsAt ?? '').localeCompare(b.dealEndsAt ?? ''))
        .slice(0, 3),
    [],
  )
  const soonest = endingSoon[0]?.dealEndsAt

  return (
    <ListingView
      scope={{ minDiscount: 30 }}
      title="Deals"
      breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Deals' }]}
      description="Everything 30% off or more, from KYC-verified sellers. Every price includes all taxes."
      meta={soonest ? <Countdown endsAt={soonest} /> : null}
      banner={() => (endingSoon.length > 0 ? <EndingSoon products={endingSoon} /> : null)}
      empty={{
        title: 'No deals running right now',
        description: 'New deals go live every morning. Browse the categories in the meantime.',
      }}
    />
  )
}
