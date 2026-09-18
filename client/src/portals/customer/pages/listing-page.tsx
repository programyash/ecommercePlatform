import { Compass } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { getCategoryBySlug, useDb } from '@/data'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { ListingView } from '../components/shopping/listing-view'

/** Category and sub-category listings — the template search, deals and stores reuse. */
export default function ListingPage() {
  const params = useParams()
  const slug = params.subSlug ?? params.categorySlug ?? ''
  const category = useDb((view) => getCategoryBySlug(view, slug), [slug])

  if (!category) {
    return (
      <div className="mx-auto flex max-w-shop flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader title="Category not found" breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Category' }]} />
        <EmptyState
          icon={<Compass aria-hidden />}
          title={`We couldn’t find “${slug}”`}
          description="The category may have been renamed. Browse everything on offer instead."
          action={
            <Button asChild>
              <Link to="/categories">View all categories</Link>
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

  return (
    <ListingView
      scope={{ categorySlug: category.slug }}
      description={category.description}
      empty={{
        title: `No ${category.name.toLowerCase()} to show right now`,
        description: 'Our sellers restock this category often. Try a nearby category in the meantime.',
      }}
    />
  )
}
