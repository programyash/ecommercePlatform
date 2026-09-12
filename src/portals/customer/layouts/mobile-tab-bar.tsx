import { Grid2x2, Home, ShoppingBag, Tag, User } from 'lucide-react'
import { NavLink } from 'react-router'
import { cn } from '@/lib/cn'

import type { LucideIcon } from 'lucide-react'

const TABS: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/categories', label: 'Categories', icon: Grid2x2 },
  { to: '/deals', label: 'Deals', icon: Tag },
  { to: '/account', label: 'Account', icon: User },
]

interface MobileTabBarProps {
  cartCount: number
  onOpenCart: () => void
}

/** Phone navigation for the storefront; the cart opens the same drawer as the header. */
export function MobileTabBar({ cartCount, onOpenCart }: MobileTabBarProps) {
  const itemClass = 'flex flex-1 flex-col items-center justify-center gap-1 type-caption text-fg-muted transition-colors'
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 flex h-tabbar items-stretch border-t border-border bg-surface pb-safe md:hidden"
    >
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => cn(itemClass, isActive && 'text-primary')}>
          <tab.icon aria-hidden className="size-5" />
          {tab.label}
        </NavLink>
      ))}
      <button type="button" onClick={onOpenCart} className={itemClass}>
        <span className="relative">
          <ShoppingBag aria-hidden className="size-5" />
          {cartCount ? (
            <span className="absolute -top-1.5 -right-2.5 rounded-pill bg-primary px-1 text-2xs leading-4 font-semibold text-primary-fg tabular">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          ) : null}
        </span>
        Bag
      </button>
    </nav>
  )
}
