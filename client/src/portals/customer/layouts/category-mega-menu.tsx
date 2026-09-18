import { NavigationMenu } from 'radix-ui'
import { Link } from 'react-router'
import type { Category } from '@/data/types'
import { CategoryIcon } from '@/components/icons/category-icons'
import { cn } from '@/lib/cn'

export interface CategoryNode extends Category {
  children: Category[]
}

interface CategoryMegaMenuProps {
  categories: CategoryNode[]
  className?: string
}

/** Desktop category strip. Each top-level category opens its sub-categories. */
export function CategoryMegaMenu({ categories, className }: CategoryMegaMenuProps) {
  return (
    <NavigationMenu.Root className={cn('relative hidden lg:block', className)} delayDuration={100}>
      <NavigationMenu.List className="flex items-stretch gap-1">
        {categories.map((category) => (
          <NavigationMenu.Item key={category.id}>
            <NavigationMenu.Trigger asChild>
              <Link
                to={`/c/${category.slug}`}
                className={cn(
                  'relative flex h-12 items-center px-3 type-label text-fg transition-colors',
                  'after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:origin-left after:scale-x-0 after:bg-primary after:transition-transform',
                  'hover:text-primary hover:after:scale-x-100 data-[state=open]:text-primary data-[state=open]:after:scale-x-100',
                  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                )}
              >
                {category.name}
              </Link>
            </NavigationMenu.Trigger>
            {category.children.length ? (
              <NavigationMenu.Content className="absolute top-full left-0 z-40 w-full border-b border-border bg-surface shadow-popover data-[motion=from-start]:animate-fade-in data-[motion=to-start]:animate-fade-out">
                <div className="mx-auto grid max-w-shop grid-cols-4 gap-x-6 gap-y-4 px-6 py-6">
                  <div className="col-span-1 flex flex-col gap-1">
                    <p className="type-overline text-fg-subtle">{category.name}</p>
                    <p className="type-caption text-fg-muted">{category.description}</p>
                    <Link to={`/c/${category.slug}`} className="mt-1 type-label text-link hover:underline underline-offset-2">
                      Shop all {category.name.toLowerCase()}
                    </Link>
                  </div>
                  <ul className="col-span-3 grid grid-cols-3 gap-x-6 gap-y-2">
                    {category.children.map((child) => (
                      <li key={child.id}>
                        <NavigationMenu.Link asChild>
                          <Link
                            to={`/c/${category.slug}/${child.slug}`}
                            className="flex items-center gap-2 rounded-control px-2 py-1.5 type-body text-fg transition-colors hover:bg-primary-subtle hover:text-primary-subtle-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          >
                            <CategoryIcon name={child.icon} className="size-4 shrink-0 text-fg-subtle" />
                            {child.name}
                          </Link>
                        </NavigationMenu.Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </NavigationMenu.Content>
            ) : null}
          </NavigationMenu.Item>
        ))}
      </NavigationMenu.List>

      <div className="absolute top-full left-0 z-30 w-full">
        <NavigationMenu.Viewport className="w-full origin-top border-b border-border bg-surface shadow-popover data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
      </div>
    </NavigationMenu.Root>
  )
}
