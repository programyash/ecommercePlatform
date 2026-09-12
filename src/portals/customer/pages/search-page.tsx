import { Store, Tag } from 'lucide-react'
import { Link } from 'react-router'
import { useUrlState } from '@/lib/use-url-state'
import { ListingView } from '../components/shopping/listing-view'

/** Search results, plus the spelling suggestion and the sellers and categories that match. */
export default function SearchPage() {
  const [q] = useUrlState<string>('q', '')
  const query = q.trim()

  return (
    <ListingView
      scope={{}}
      title={query ? `Results for “${query}”` : 'All products'}
      documentTitle={query ? `Search: ${query}` : 'All products'}
      breadcrumbs={[{ label: 'Home', to: '/' }, { label: query ? 'Search results' : 'All products' }]}
      empty={{
        title: query ? `No results for “${query}”` : 'Nothing to show right now',
        description: 'Check the spelling, use fewer words, or try a broader term.',
      }}
      banner={(result) => {
        const hasMatches = result.matchingSellers.length > 0 || result.matchingCategories.length > 0
        if (!result.didYouMean && !hasMatches) return null
        return (
          <div className="flex flex-col gap-3">
            {result.didYouMean ? (
              <p className="type-body text-fg-muted">
                Did you mean:{' '}
                <Link
                  to={`/search?q=${encodeURIComponent(result.didYouMean)}`}
                  className="type-label text-link hover:underline underline-offset-2"
                >
                  {result.didYouMean}
                </Link>
              </p>
            ) : null}
            {hasMatches ? (
              <div className="flex flex-col gap-2 rounded-card border border-border bg-surface-2 px-4 py-3">
                <p className="type-label text-fg">Also matching “{query}”</p>
                <ul className="flex flex-wrap gap-2">
                  {result.matchingCategories.map((category) => (
                    <li key={category.id}>
                      <Link
                        to={`/c/${category.slug}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-pill border border-border bg-surface px-3 text-sm text-fg transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <Tag aria-hidden className="size-3.5 text-fg-muted" />
                        {category.name}
                        <span className="type-caption text-fg-subtle">Category</span>
                      </Link>
                    </li>
                  ))}
                  {result.matchingSellers.map((seller) => (
                    <li key={seller.id}>
                      <Link
                        to={`/store/${seller.slug}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-pill border border-border bg-surface px-3 text-sm text-fg transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <Store aria-hidden className="size-3.5 text-fg-muted" />
                        {seller.name}
                        <span className="type-caption text-fg-subtle">Seller</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )
      }}
    />
  )
}
