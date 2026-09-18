import { FolderTree } from 'lucide-react'
import { getCategoryTree, useDemoQuery, type Category, type CategoryNode } from '@/data'
import { Button } from '@/components/ui/button'
import { DescriptionList } from '@/components/ui/description-list'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { SectionCard } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CategoryIcon } from '@/components/icons/category-icons'
import { cn } from '@/lib/cn'
import { formatNumber, formatPercent, pluralize } from '@/lib/format'
import { useUrlState } from '@/lib/use-url-state'
import { LoadFailed } from '../components/record-states'

function matches(node: CategoryNode, needle: string): boolean {
  if (!needle) return true
  if (node.name.toLowerCase().includes(needle)) return true
  return node.children.some((child) => matches(child, needle))
}

/** The category tree, and the rules each category applies to every listing under it. */
export default function AdminCategoriesPage() {
  const [q, setQ] = useUrlState<string>('q', '')
  const [selected, setSelected] = useUrlState<string>('category', '')

  const query = useDemoQuery((view) => getCategoryTree(view), [])
  const tree = query.status === 'empty' ? [] : (query.data ?? [])
  const needle = q.trim().toLowerCase()
  const visible = tree.filter((root) => matches(root, needle))

  const flat: CategoryNode[] = []
  const walk = (nodes: CategoryNode[]) => {
    for (const node of nodes) {
      flat.push(node)
      walk(node.children)
    }
  }
  walk(tree)

  const current = flat.find((node) => node.id === selected) ?? visible[0] ?? flat[0]
  const parent: Category | undefined = current?.parentId ? flat.find((node) => node.id === current.parentId) : undefined

  return (
    <>
      <PageHeader
        title="Categories"
        description="Every category, and the commission, GST and return window it applies to the listings inside it."
        meta={
          query.status === 'success' ? (
            <span>
              {formatNumber(flat.length)} {pluralize(flat.length, 'category', 'categories')}
            </span>
          ) : null
        }
      />

      {query.status === 'error' ? (
        <LoadFailed title="We couldn’t load the categories" onRetry={query.retry} />
      ) : query.status === 'loading' ? (
        <div className="grid gap-4 lg:grid-cols-12">
          <Skeleton className="h-96 w-full rounded-card lg:col-span-7" />
          <Skeleton className="h-96 w-full rounded-card lg:col-span-5" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          <SectionCard
            title="Tree"
            description="Products always sit on a leaf category."
            className="lg:col-span-7"
            actions={
              <SearchInput
                value={q}
                onValueChange={setQ}
                placeholder="Search categories"
                size="sm"
                wrapperClassName="w-full sm:w-56"
              />
            }
            flush
          >
            {visible.length === 0 ? (
              <EmptyState
                variant="compact"
                icon={<FolderTree aria-hidden />}
                title="No categories match that search"
                description="Try a shorter word, such as “mobile” or “kurta”."
                action={
                  <Button size="sm" variant="outline" onClick={() => setQ('')}>
                    Clear search
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col p-2">
                {visible.map((root) => (
                  <li key={root.id} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setSelected(root.id)}
                      aria-current={root.id === current?.id ? 'true' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-control px-3 py-2 text-left transition-colors',
                        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                        root.id === current?.id ? 'bg-primary-subtle text-primary-subtle-fg' : 'text-fg hover:bg-surface-2',
                      )}
                    >
                      <CategoryIcon name={root.icon} className="size-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate type-label">{root.name}</span>
                      <span className="shrink-0 type-caption text-fg-muted tabular">{formatNumber(root.productCount)}</span>
                    </button>
                    {root.children.length > 0 ? (
                      <ul className="ml-4 flex flex-col border-l border-border-subtle pl-2">
                        {root.children
                          .filter((child) => matches(child, needle))
                          .map((child) => (
                            <li key={child.id} className="flex flex-col">
                              <button
                                type="button"
                                onClick={() => setSelected(child.id)}
                                aria-current={child.id === current?.id ? 'true' : undefined}
                                className={cn(
                                  'flex items-center gap-2 rounded-control px-3 py-1.5 text-left transition-colors',
                                  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                                  child.id === current?.id
                                    ? 'bg-primary-subtle text-primary-subtle-fg'
                                    : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                                )}
                              >
                                <span className="min-w-0 flex-1 truncate type-body">{child.name}</span>
                                <span className="shrink-0 type-caption text-fg-subtle tabular">
                                  {formatNumber(child.productCount)}
                                </span>
                              </button>
                            </li>
                          ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <div className="lg:col-span-5">
            {current ? (
              <SectionCard
                title={current.name}
                description={parent ? `${parent.name} › ${current.name}` : 'Top-level category'}
              >
                <div className="flex flex-col gap-4">
                  <DescriptionList
                    items={[
                      { term: 'Description', detail: current.description },
                      { term: 'URL slug', detail: `/c/${current.slug}`, copyValue: current.slug },
                      { term: 'Commission', detail: formatPercent(current.commissionPct / 100, { decimals: 1 }) },
                      { term: 'Return window', detail: current.returnDays > 0 ? `${formatNumber(current.returnDays)} days` : 'Not returnable' },
                      { term: 'Default GST', detail: `${current.gstRate}%` },
                      { term: 'Default HSN', detail: current.hsnDefault },
                      {
                        term: 'Live products',
                        detail: `${formatNumber(current.productCount)} ${pluralize(current.productCount, 'listing')}`,
                      },
                      {
                        term: 'Sub-categories',
                        detail: current.children.length
                          ? current.children.map((child) => child.name).join(', ')
                          : 'None — listings sit directly here',
                      },
                    ]}
                  />

                  <div className="flex flex-col gap-2">
                    <h3 className="type-label text-fg">Product fields</h3>
                    {current.facets.length === 0 ? (
                      <p className="type-body text-fg-muted">
                        No extra fields. Listings here use the standard title, price, stock and compliance fields.
                      </p>
                    ) : (
                      <ul className="flex flex-col divide-y divide-border-subtle">
                        {current.facets.map((facet) => (
                          <li key={facet.key} className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
                            <span className="type-body text-fg">{facet.label}</span>
                            <span className="type-caption text-fg-muted">
                              {facet.source.kind === 'axis' ? `Variant axis · ${facet.source.axis}` : `Specification · ${facet.source.label}`}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <p className="type-caption text-fg-muted">
                    Category rules are set by the catalogue team and apply to every listing inside this category, including
                    its sub-categories.
                  </p>
                </div>
              </SectionCard>
            ) : (
              <SectionCard title="Pick a category">
                <EmptyState
                  variant="compact"
                  icon={<FolderTree aria-hidden />}
                  title="Nothing selected"
                  description="Choose a category on the left to see its commission, GST and return window."
                />
              </SectionCard>
            )}
          </div>
        </div>
      )}
    </>
  )
}
