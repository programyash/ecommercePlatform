import { LogOut, Package, Settings, User } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  cartCount,
  DEFAULT_SETTINGS,
  getCategoryTree,
  lookupPin,
  searchProducts,
  useCart,
  useDb,
  useRecent,
  useSession,
  useWishlist,
} from '@/data'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { IconButton } from '@/components/ui/icon-button'
import { DeliveryPinSheet } from '@/components/commerce/delivery-pin-sheet'
import { CartDrawer } from './components/cart-drawer'
import { StoreHeader, type SearchSuggestion } from './layouts/store-header'
import { StorefrontLayout } from './layouts/storefront-layout'

function AccountMenu() {
  const { customerSignedIn, customerId, signOutCustomer } = useSession()
  const customer = useDb((view) => view.customers.find((item) => item.id === customerId), [customerId])

  if (!customerSignedIn) {
    return (
      <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
        <Link to="/login">Sign in</Link>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label={customer ? `Account: ${customer.name}` : 'Account'} icon={<User aria-hidden />} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56">
        <div className="flex items-center gap-2 px-2.5 py-2">
          <Avatar name={customer?.name ?? 'Guest'} size="sm" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate type-label">{customer?.name}</span>
            <span className="truncate type-caption text-fg-muted">{customer?.phone}</span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild icon={<User aria-hidden />}>
          <Link to="/account">My account</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild icon={<Package aria-hidden />}>
          <Link to="/account/orders">My orders</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild icon={<Settings aria-hidden />}>
          <Link to="/account/settings">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem icon={<LogOut aria-hidden />} onSelect={signOutCustomer}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Storefront chrome wired to the demo data: categories, search, cart, wishlist, PIN. */
export default function CustomerShell() {
  const [query, setQuery] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)
  const customerId = useSession((state) => state.customerId)
  const signedIn = useSession((state) => state.customerSignedIn)

  const categories = useDb((view) => getCategoryTree(view), [])
  const lines = useCart((state) => state.lines)
  const count = useCart(cartCount)
  const wishlistCount = useWishlist((state) => state.ids.length)
  const chosenPin = useCart((state) => state.pin)
  const setPin = useCart((state) => state.setPin)
  const recentSearches = useRecent((state) => state.searches)
  const addSearch = useRecent((state) => state.addSearch)

  // Until the shopper picks one, the header should say what the cart and checkout
  // already say: their default address.
  const defaultPin = useDb((view) => {
    const customer = view.customerById.get(customerId)
    return customer?.addresses.find((address) => address.id === customer.defaultAddressId)?.pin
  }, [customerId])
  const pin = chosenPin ?? (signedIn ? defaultPin : undefined)

  const pinInfo = pin ? lookupPin(pin) : null

  // Suggestions: recent searches first, then live matches from the catalogue.
  const matches = useDb(
    (view) => (query.trim().length >= 2 ? searchProducts(view, { q: query, pageSize: 5 }) : null),
    [query],
  )
  const suggestions = useMemo<SearchSuggestion[]>(() => {
    if (query.trim().length < 2) {
      return recentSearches.slice(0, 6).map((term) => ({
        id: `recent-${term}`,
        label: term,
        kind: 'recent' as const,
        to: `/search?q=${encodeURIComponent(term)}`,
      }))
    }
    const items: SearchSuggestion[] = []
    for (const category of matches?.matchingCategories ?? []) {
      items.push({ id: `cat-${category.id}`, label: category.name, kind: 'category', to: `/c/${category.slug}` })
    }
    for (const seller of matches?.matchingSellers ?? []) {
      items.push({ id: `sel-${seller.id}`, label: seller.name, kind: 'seller', to: `/store/${seller.slug}` })
    }
    for (const product of matches?.items ?? []) {
      items.push({ id: `prd-${product.id}`, label: product.title, kind: 'product', to: `/p/${product.slug}` })
    }
    return items
  }, [query, matches, recentSearches])

  return (
    <>
      <StorefrontLayout
        cartCount={count}
        onOpenCart={() => setCartOpen(true)}
        announcement={{
          id: 'festive-2026',
          message: 'Festive Utsav Sale is live — up to 60% off, plus 10% back with Demo Bank cards.',
        }}
        header={
          <StoreHeader
            categories={categories}
            cartCount={count}
            wishlistCount={wishlistCount}
            pin={pin ?? undefined}
            pinCity={pinInfo?.city}
            onOpenPin={() => setPinOpen(true)}
            onOpenCart={() => setCartOpen(true)}
            query={query}
            onQueryChange={(value) => {
              setQuery(value)
              if (value.trim().length >= 3) addSearch(value.trim())
            }}
            suggestions={suggestions}
            accountMenu={<AccountMenu />}
          />
        }
        overlays={
          <>
            <CartDrawer open={cartOpen} onOpenChange={setCartOpen} lines={lines} />
            <DeliveryPinSheet
              open={pinOpen}
              onOpenChange={setPinOpen}
              pin={pin ?? undefined}
              onApply={setPin}
              lookup={(value) => {
                const info = lookupPin(value)
                if (!info) return { ok: false, message: 'Enter a valid 6-digit PIN code.' }
                if (DEFAULT_SETTINGS.unserviceablePins.includes(value)) {
                  return {
                    ok: false,
                    message: `We don’t deliver to ${value} yet. Try another PIN code, or save the item to your wishlist.`,
                  }
                }
                return { ok: true, city: info.city, state: info.state }
              }}
              recent={pin ? [pin, '560034', '110017'].filter((value, index, all) => all.indexOf(value) === index) : ['682020', '560034', '110017']}
            />
          </>
        }
      />
    </>
  )
}

