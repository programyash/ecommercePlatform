import {
  Boxes,
  ChartLine,
  LayoutDashboard,
  MessageSquareText,
  Package,
  Plus,
  Store,
  Truck,
  Wallet,
} from 'lucide-react'
import type { CommandGroup, NavItem, NavSection } from '@/layouts/dashboard/types'

export const sellerNav: NavSection[] = [
  {
    items: [
      { id: 'dashboard', label: 'Dashboard', to: '/seller', icon: LayoutDashboard, end: true },
      { id: 'orders', label: 'Orders', to: '/seller/orders', icon: Truck, badgeKey: 'orders' },
    ],
  },
  {
    section: 'Catalogue',
    items: [
      { id: 'products', label: 'Products', to: '/seller/products', icon: Package, badgeKey: 'products' },
      { id: 'inventory', label: 'Inventory', to: '/seller/inventory', icon: Boxes, badgeKey: 'inventory' },
    ],
  },
  {
    section: 'Money',
    items: [
      { id: 'sales', label: 'Sales', to: '/seller/sales', icon: ChartLine },
      { id: 'payouts', label: 'Payouts', to: '/seller/payouts', icon: Wallet },
    ],
  },
  {
    section: 'Customers',
    items: [{ id: 'reviews', label: 'Reviews', to: '/seller/reviews', icon: MessageSquareText, badgeKey: 'reviews' }],
  },
]

export const sellerFooterNav: NavItem[] = [
  { id: 'profile', label: 'Store profile', to: '/seller/profile', icon: Store },
]

/** Phone tab bar: the five things a seller opens all day. */
export const sellerMobileTabs: NavItem[] = [
  { id: 'home', label: 'Home', to: '/seller', icon: LayoutDashboard, end: true },
  { id: 'orders', label: 'Orders', to: '/seller/orders', icon: Truck, badgeKey: 'orders' },
  { id: 'products', label: 'Products', to: '/seller/products', icon: Package },
  { id: 'payouts', label: 'Payouts', to: '/seller/payouts', icon: Wallet },
  { id: 'profile', label: 'More', to: '/seller/profile', icon: Store },
]

export const sellerCommands: CommandGroup[] = [
  {
    heading: 'Go to',
    items: [
      { id: 'go-dashboard', label: 'Dashboard', to: '/seller', icon: LayoutDashboard },
      { id: 'go-orders', label: 'Orders', to: '/seller/orders', icon: Truck, keywords: 'shipments dispatch pack' },
      { id: 'go-products', label: 'Products', to: '/seller/products', icon: Package, keywords: 'listings catalogue' },
      { id: 'go-inventory', label: 'Inventory', to: '/seller/inventory', icon: Boxes, keywords: 'stock' },
      { id: 'go-sales', label: 'Sales', to: '/seller/sales', icon: ChartLine, keywords: 'analytics revenue' },
      { id: 'go-payouts', label: 'Payouts', to: '/seller/payouts', icon: Wallet, keywords: 'settlement money commission' },
      { id: 'go-reviews', label: 'Reviews', to: '/seller/reviews', icon: MessageSquareText, keywords: 'ratings feedback' },
      { id: 'go-profile', label: 'Store profile', to: '/seller/profile', icon: Store, keywords: 'gstin bank pickup' },
    ],
  },
  {
    heading: 'Actions',
    items: [
      { id: 'new-product', label: 'Add a product', to: '/seller/products/new', icon: Plus },
      { id: 'orders-due', label: 'Orders due today', to: '/seller/orders?due=today', icon: Truck },
      { id: 'low-stock', label: 'Low stock items', to: '/seller/inventory?filter=low', icon: Boxes },
    ],
  },
]
