import { Search } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { getCategoryTree, useDb } from '@/data'
import { Button } from '@/components/ui/button'
import { Img } from '@/components/ui/img'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { CategoryIcon } from '@/components/icons/category-icons'

const SHORTCUTS = [
  { to: '/', label: 'Home' },
  { to: '/deals', label: 'Deals of the day' },
  { to: '/account/orders', label: 'Your orders' },
  { to: '/categories', label: 'All categories' },
]

/** Nothing at this address — offer a search box and a way back into the catalogue. */
export default function NotFoundPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const categories = useDb((view) => getCategoryTree(view).slice(0, 10), [])

  const search = () => {
    const term = query.trim()
    void navigate(term ? `/search?q=${encodeURIComponent(term)}` : '/search')
  }

  return (
    <div className="mx-auto flex max-w-shop flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex flex-col gap-5">
        <PageHeader
          title="We couldn’t find that page"
          documentTitle="Page not found"
          description={
            <>
              There is nothing at <span className="type-code text-fg">{pathname}</span>. It may have moved, or the link
              may be out of date.
            </>
          }
        />

        <form
          role="search"
          className="flex w-full max-w-form flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            search()
          }}
        >
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search for products, brands and categories"
            aria-label="Search the catalogue"
            wrapperClassName="min-w-0 flex-1"
          />
          <Button type="submit" leftIcon={<Search aria-hidden />}>
            Search
          </Button>
        </form>

        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.to}>
              <Link to={shortcut.to} className="type-label text-link hover:underline underline-offset-2">
                {shortcut.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <section aria-labelledby="popular-categories" className="flex flex-col gap-4">
        <h2 id="popular-categories" className="type-h2 text-fg">
          Popular categories
        </h2>
        <ul className="grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-5 lg:grid-cols-10">
          {categories.map((category) => (
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
    </div>
  )
}
