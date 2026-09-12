import { Heart, MapPin, Menu, Search, ShoppingBag } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { BRAND } from '@/config/brand'
import { CategoryIcon } from '@/components/icons/category-icons'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/cn'
import { CategoryMegaMenu, type CategoryNode } from './category-mega-menu'

export interface SearchSuggestion {
  id: string
  label: string
  /** "Recent", "Trending", a category or a seller. */
  kind: 'recent' | 'trending' | 'category' | 'seller' | 'product'
  to: string
}

interface StoreHeaderProps {
  categories: CategoryNode[]
  cartCount: number
  wishlistCount: number
  /** Current delivery PIN code, if the shopper has set one. */
  pin?: string
  pinCity?: string
  onOpenPin: () => void
  onOpenCart: () => void
  query: string
  onQueryChange: (value: string) => void
  suggestions: SearchSuggestion[]
  accountMenu: ReactNode
}

const suggestionLabel: Record<SearchSuggestion['kind'], string> = {
  recent: 'Recent',
  trending: 'Trending',
  category: 'Category',
  seller: 'Seller',
  product: 'Product',
}

export function StoreHeader({
  categories,
  cartCount,
  wishlistCount,
  pin,
  pinCity,
  onOpenPin,
  onOpenCart,
  query,
  onQueryChange,
  suggestions,
  accountMenu,
}: StoreHeaderProps) {
  const navigate = useNavigate()
  const [focused, setFocused] = useState(false)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!query.trim()) return
    setFocused(false)
    navigate(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  const searchField = (
    <form onSubmit={submit} role="search" className="relative w-full">
      <Input
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        placeholder="Search for products, brands and more"
        aria-label="Search products"
        leftIcon={<Search aria-hidden />}
        wrapperClassName="bg-surface-2 border-transparent hover:border-border"
      />
      {focused && suggestions.length ? (
        <ul className="absolute inset-x-0 top-full z-40 mt-1 overflow-hidden rounded-popover border border-border bg-surface py-1 shadow-popover">
          {suggestions.slice(0, 8).map((suggestion) => (
            <li key={suggestion.id}>
              <Link
                to={suggestion.to}
                className="flex items-center justify-between gap-3 px-3 py-2 type-body text-fg hover:bg-surface-2"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setFocused(false)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Search aria-hidden className="size-3.5 shrink-0 text-fg-subtle" />
                  <span className="truncate">{suggestion.label}</span>
                </span>
                <span className="shrink-0 type-caption text-fg-subtle">{suggestionLabel[suggestion.kind]}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  )

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-header">
      <div className="mx-auto flex h-header max-w-shop items-center gap-3 px-4 sm:px-6 lg:px-8">
        {/* Categories drawer on phones and tablets */}
        <Sheet>
          <SheetTrigger asChild>
            <IconButton label="Browse categories" icon={<Menu aria-hidden />} className="lg:hidden" />
          </SheetTrigger>
          <SheetContent side="left" title="Categories">
            <ul className="flex flex-col">
              {categories.map((category) => (
                <li key={category.id} className="border-b border-border-subtle last:border-b-0">
                  <Link to={`/c/${category.slug}`} className="flex items-center gap-2.5 py-3 type-label text-fg">
                    <CategoryIcon name={category.icon} className="size-4.5 text-fg-muted" />
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </SheetContent>
        </Sheet>

        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span aria-hidden className="grid size-8 place-items-center rounded-control bg-primary type-title text-primary-fg">
            {BRAND.name.charAt(0)}
          </span>
          <span className="type-h3">{BRAND.name}</span>
        </Link>

        <div className="hidden min-w-0 flex-1 md:block">{searchField}</div>

        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenPin}
            leftIcon={<MapPin aria-hidden />}
            className="hidden max-w-48 lg:inline-flex"
          >
            <span className="flex min-w-0 flex-col items-start leading-tight">
              <span className="type-caption text-fg-muted">Deliver to</span>
              <span className="truncate type-label">{pin ? `${pin}${pinCity ? ` · ${pinCity}` : ''}` : 'Set PIN code'}</span>
            </span>
          </Button>
          {accountMenu}
          <Link
            to="/account/wishlist"
            aria-label={wishlistCount ? `Wishlist (${wishlistCount})` : 'Wishlist'}
            className="relative grid size-10 place-items-center rounded-control text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Heart aria-hidden className="size-5" />
            {wishlistCount ? (
              <span
                aria-hidden
                className="absolute -top-0.5 -right-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-pill bg-primary px-1 text-2xs leading-none font-semibold text-primary-fg tabular ring-2 ring-surface"
              >
                {wishlistCount > 99 ? '99+' : wishlistCount}
              </span>
            ) : null}
          </Link>
          <IconButton label="Cart" icon={<ShoppingBag aria-hidden />} badge={cartCount || undefined} onClick={onOpenCart} />
        </div>
      </div>

      {/* Phones and tablets get the search field and the delivery PIN in the open,
          rather than behind a toggle — both are how a shopper starts here. */}
      <div className="border-t border-border-subtle px-4 pb-2 md:hidden">
        <div className="flex items-center gap-2 pt-2">
          <div className="min-w-0 flex-1">{searchField}</div>
        </div>
        <button
          type="button"
          onClick={onOpenPin}
          className="mt-2 flex max-w-full items-center gap-1.5 rounded-pill border border-border px-3 py-1 type-caption text-fg-muted hover:border-border-strong hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <MapPin aria-hidden className="size-3.5 shrink-0" />
          <span className="truncate">
            {pin ? `Deliver to ${pin}${pinCity ? ` · ${pinCity}` : ''}` : 'Set your delivery PIN code'}
          </span>
        </button>
      </div>

      <div className="border-t border-border-subtle">
        <div className="mx-auto flex max-w-shop items-center gap-2 px-4 sm:px-6 lg:px-8">
          <CategoryMegaMenu categories={categories} />
          {/* Category chips keep browsing one tap away on small screens. */}
          <ul className="flex gap-2 overflow-x-auto py-2 lg:hidden no-scrollbar">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  to={`/c/${category.slug}`}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-pill border border-border px-3 py-1.5 type-caption whitespace-nowrap text-fg',
                    'hover:border-border-strong hover:bg-surface-2',
                  )}
                >
                  <CategoryIcon name={category.icon} className="size-3.5 text-fg-muted" />
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/seller/register" className="ml-auto hidden shrink-0 type-caption text-link hover:underline lg:inline">
            Sell on {BRAND.name}
          </Link>
        </div>
      </div>
    </header>
  )
}
