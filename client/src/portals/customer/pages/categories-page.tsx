import { Grid2x2 } from 'lucide-react'
import { Link } from 'react-router'
import { getCategoryTree, useDemoQuery, type CategoryNode } from '@/data'
import { CategoryIcon } from '@/components/icons/category-icons'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Img } from '@/components/ui/img'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber, pluralWithCount } from '@/lib/format'
import { useIsDesktop } from '@/lib/use-media-query'

function CategoryThumb({ category, className }: { category: CategoryNode; className?: string }) {
  if (category.image) {
    return (
      <Img
        image={category.image}
        alt=""
        ratio="square"
        width={160}
        sizes="64px"
        className={className ?? 'size-14 rounded-full ring-1 ring-border'}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={className ?? 'grid size-14 place-items-center rounded-full bg-surface-2 text-fg-muted ring-1 ring-border'}
    >
      <CategoryIcon name={category.icon} className="size-5" />
    </span>
  )
}

function SubCategoryLinks({ category }: { category: CategoryNode }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {category.children.map((child) => (
        <li key={child.id}>
          <Link
            to={`/c/${category.slug}/${child.slug}`}
            className="flex items-baseline justify-between gap-2 rounded-badge type-body text-fg-muted hover:text-primary hover:underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="min-w-0 truncate">{child.name}</span>
            <span className="shrink-0 type-caption text-fg-subtle tabular">{formatNumber(child.productCount)}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** Every category and its sub-categories: cards on desktop, accordions on phones. */
export default function CategoriesPage() {
  const query = useDemoQuery((view) => getCategoryTree(view), [])
  const isDesktop = useIsDesktop()
  const categories = query.data ?? []
  const totalProducts = categories.reduce((sum, category) => sum + category.productCount, 0)

  return (
    <div className="mx-auto flex max-w-shop flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <PageHeader
        title="All categories"
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'All categories' }]}
        description="Everything on Chowk, from KYC-verified sellers across India."
        meta={
          query.status === 'success' ? (
            <>
              <span>{pluralWithCount(categories.length, 'category', 'categories')}</span>
              <span>{pluralWithCount(totalProducts, 'product')}</span>
            </>
          ) : null
        }
      />

      {query.status === 'error' ? (
        <EmptyState
          icon={<Grid2x2 aria-hidden />}
          title="We couldn’t load the categories"
          description="Something went wrong on our side. Try again in a moment."
          action={<Button onClick={query.retry}>Retry</Button>}
        />
      ) : query.status === 'loading' ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <li key={index} className="flex flex-col gap-3 rounded-card border border-border p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-14 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="h-3.5 w-3/5" />
            </li>
          ))}
        </ul>
      ) : query.status === 'empty' ? (
        <EmptyState
          icon={<Grid2x2 aria-hidden />}
          title="No categories yet"
          description="Categories appear here as soon as the marketplace team publishes them."
          action={
            <Button variant="outline" asChild>
              <Link to="/">Go to the storefront</Link>
            </Button>
          }
        />
      ) : isDesktop ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
              <div className="flex items-center gap-3">
                <CategoryThumb category={category} />
                <div className="flex min-w-0 flex-col">
                  <h2 className="type-title text-fg">
                    <Link
                      to={`/c/${category.slug}`}
                      className="rounded-badge hover:text-primary hover:underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {category.name}
                    </Link>
                  </h2>
                  <p className="type-caption text-fg-muted">{pluralWithCount(category.productCount, 'product')}</p>
                </div>
              </div>
              <p className="type-caption text-fg-muted">{category.description}</p>
              <SubCategoryLinks category={category} />
              <Link
                to={`/c/${category.slug}`}
                className="mt-auto type-label text-link hover:underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Shop all {category.name.toLowerCase()}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Accordion type="multiple" className="rounded-card border border-border bg-surface px-4">
          {categories.map((category) => (
            <AccordionItem key={category.id} value={category.id}>
              <AccordionTrigger meta={formatNumber(category.productCount)}>
                <span className="flex items-center gap-3">
                  <CategoryThumb
                    category={category}
                    className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 text-fg-muted ring-1 ring-border"
                  />
                  {category.name}
                </span>
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-3">
                <p className="type-caption text-fg-muted">{category.description}</p>
                <SubCategoryLinks category={category} />
                <Link to={`/c/${category.slug}`} className="type-label text-link hover:underline underline-offset-2">
                  Shop all {category.name.toLowerCase()}
                </Link>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  )
}
