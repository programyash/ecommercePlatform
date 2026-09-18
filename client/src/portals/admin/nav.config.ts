import {
  BadgePercent,
  Boxes,
  ChartColumn,
  FolderTree,
  LayoutDashboard,
  MessageSquareText,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Users,
  Wallet,
} from 'lucide-react'
import type { CommandGroup, NavItem, NavSection } from '@/layouts/dashboard/types'

export const adminNav: NavSection[] = [
  {
    section: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
      { id: 'reports', label: 'Reports', to: '/admin/reports', icon: ChartColumn },
    ],
  },
  {
    section: 'Commerce',
    items: [
      { id: 'orders', label: 'Orders', to: '/admin/orders', icon: ShoppingCart, badgeKey: 'orders' },
      { id: 'products', label: 'Products', to: '/admin/products', icon: Package, badgeKey: 'moderation' },
      { id: 'categories', label: 'Categories', to: '/admin/categories', icon: FolderTree },
      { id: 'inventory', label: 'Inventory', to: '/admin/inventory', icon: Boxes },
      { id: 'coupons', label: 'Coupons', to: '/admin/coupons', icon: BadgePercent },
    ],
  },
  {
    section: 'People',
    items: [
      { id: 'sellers', label: 'Sellers', to: '/admin/sellers', icon: Store, badgeKey: 'sellers' },
      { id: 'users', label: 'Customers', to: '/admin/users', icon: Users },
    ],
  },
  {
    section: 'Finance',
    items: [{ id: 'payouts', label: 'Payouts', to: '/admin/payouts', icon: Wallet, badgeKey: 'payouts' }],
  },
  {
    section: 'Trust',
    items: [{ id: 'reviews', label: 'Reviews', to: '/admin/reviews', icon: MessageSquareText, badgeKey: 'reviews' }],
  },
]

export const adminFooterNav: NavItem[] = [
  { id: 'settings', label: 'Settings', to: '/admin/settings/general', icon: Settings },
]

export const adminCommands: CommandGroup[] = [
  {
    heading: 'Go to',
    items: [
      { id: 'go-dashboard', label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
      { id: 'go-orders', label: 'Orders', to: '/admin/orders', icon: ShoppingCart, keywords: 'shipments refunds' },
      { id: 'go-sellers', label: 'Sellers', to: '/admin/sellers', icon: Store, keywords: 'kyc approvals onboarding' },
      { id: 'go-users', label: 'Customers', to: '/admin/users', icon: Users, keywords: 'shoppers accounts' },
      { id: 'go-products', label: 'Products', to: '/admin/products', icon: Package, keywords: 'catalogue moderation' },
      { id: 'go-categories', label: 'Categories', to: '/admin/categories', icon: FolderTree, keywords: 'commission gst' },
      { id: 'go-inventory', label: 'Inventory', to: '/admin/inventory', icon: Boxes, keywords: 'stock' },
      { id: 'go-coupons', label: 'Coupons', to: '/admin/coupons', icon: BadgePercent, keywords: 'promotions discounts' },
      { id: 'go-payouts', label: 'Payouts', to: '/admin/payouts', icon: Wallet, keywords: 'settlements' },
      { id: 'go-reviews', label: 'Reviews', to: '/admin/reviews', icon: MessageSquareText, keywords: 'flagged moderation' },
      { id: 'go-reports', label: 'Reports', to: '/admin/reports', icon: ChartColumn, keywords: 'gmv tax analytics' },
      { id: 'go-settings', label: 'Settings', to: '/admin/settings/general', icon: Settings, keywords: 'commission tax roles team' },
    ],
  },
  {
    heading: 'Queues',
    items: [
      { id: 'pending-sellers', label: 'Seller applications', to: '/admin/sellers?tab=pending', icon: Store },
      { id: 'moderation', label: 'Listings to review', to: '/admin/products?tab=moderation', icon: Package },
      { id: 'returns', label: 'Escalated returns', to: '/admin/orders?view=returns', icon: ShoppingCart },
      { id: 'flagged', label: 'Flagged reviews', to: '/admin/reviews?tab=flagged', icon: MessageSquareText },
    ],
  },
]
