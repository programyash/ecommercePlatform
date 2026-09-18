import { CreditCard, Heart, LogOut, MapPin, Package, Settings, UserRound } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router'
import { toast } from 'sonner'
import { getCustomerOrders, useDb, useSession, useWishlist } from '@/data'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import { maskEmail } from '@/lib/mask'

import type { LucideIcon } from 'lucide-react'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  count?: number
}

/** The account shell: identity, navigation and whichever account page is open. */
export default function AccountLayout() {
  const customerId = useSession((state) => state.customerId)
  const signedIn = useSession((state) => state.customerSignedIn)
  const signOutCustomer = useSession((state) => state.signOutCustomer)
  const wishlistCount = useWishlist((state) => state.ids.length)

  const account = useDb(
    (view) => {
      const customer = view.customerById.get(customerId)
      return {
        customer,
        orders: getCustomerOrders(view, customerId).length,
        addresses: customer?.addresses.length ?? 0,
        payments: customer?.savedPayments.length ?? 0,
      }
    },
    [customerId],
  )

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-shop px-4 py-10 sm:px-6 lg:px-8">
        <PageHeader title="Your account" description="Orders, addresses, saved payments and settings live here." />
        <div className="mt-5 rounded-card border border-border bg-surface">
          <EmptyState
            icon={<UserRound aria-hidden />}
            title="Sign in to see your account"
            description="Use your mobile number and the 6-digit code. Your bag stays on this device either way."
            action={
              <Button asChild>
                <Link to="/login">Sign in</Link>
              </Button>
            }
            secondaryAction={
              <Button variant="outline" asChild>
                <Link to="/register">Create an account</Link>
              </Button>
            }
          />
        </div>
      </div>
    )
  }

  const items: NavItem[] = [
    { to: '/account', label: 'Overview', icon: UserRound, end: true },
    { to: '/account/orders', label: 'Orders', icon: Package, count: account.orders },
    { to: '/account/wishlist', label: 'Wishlist', icon: Heart, count: wishlistCount },
    { to: '/account/addresses', label: 'Addresses', icon: MapPin, count: account.addresses },
    { to: '/account/payments', label: 'Saved payments', icon: CreditCard, count: account.payments },
    { to: '/account/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="mx-auto max-w-shop px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      {/* `grid-cols-1` + `min-w-0`: without them the single track below `lg` takes its
          minimum from the scrolling nav row, and the whole page slides sideways on phones. */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12 lg:gap-8">
        {/* Identity and navigation are for browsing; a printed invoice carries only the page. */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-3 print:hidden">
          <div className="hidden items-center gap-3 rounded-card border border-border bg-surface p-4 lg:flex">
            <Avatar name={account.customer?.name ?? 'Shopper'} />
            <div className="flex min-w-0 flex-col">
              <p className="truncate type-label text-fg">{account.customer?.name}</p>
              <p className="truncate type-caption text-fg-muted">
                {account.customer ? maskEmail(account.customer.email) : ''}
              </p>
              {account.customer ? (
                <p className="type-caption text-fg-subtle">Member since {formatDate(account.customer.joinedAt)}</p>
              ) : null}
            </div>
          </div>

          <nav aria-label="Account" className="lg:rounded-card lg:border lg:border-border lg:bg-surface lg:p-2">
            <ul className="-mx-4 flex gap-1.5 overflow-x-auto px-4 no-scrollbar sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0">
              {items.map((item) => (
                <li key={item.to} className="shrink-0 lg:shrink">
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 whitespace-nowrap rounded-control px-3 py-2 type-label transition-colors',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        'border border-border lg:border-0',
                        isActive
                          ? 'border-primary bg-primary-subtle text-primary-subtle-fg'
                          : 'bg-surface text-fg-muted hover:bg-surface-2 hover:text-fg',
                      )
                    }
                  >
                    <item.icon aria-hidden className="size-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.count ? (
                      <span className="rounded-pill bg-surface-3 px-1.5 text-2xs leading-4 text-fg-muted tabular">
                        {item.count}
                      </span>
                    ) : null}
                  </NavLink>
                </li>
              ))}
              <li className="shrink-0 lg:shrink lg:pt-1">
                <button
                  type="button"
                  onClick={() => {
                    signOutCustomer()
                    toast.success('Signed out', { description: 'Your bag and wishlist stay on this device.' })
                  }}
                  className="flex w-full items-center gap-2 whitespace-nowrap rounded-control border border-border bg-surface px-3 py-2 type-label text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:border-0"
                >
                  <LogOut aria-hidden className="size-4 shrink-0" />
                  Sign out
                </button>
              </li>
            </ul>
          </nav>
        </div>

        <div className="flex min-w-0 flex-col gap-5 lg:col-span-9 print:col-span-12">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
