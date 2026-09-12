import { LogOut, Settings, Store, UserCog } from 'lucide-react'
import {
  DEMO_NOW,
  getNotifications,
  getSellerActionItems,
  getSellerTabCounts,
  useDb,
  useSession,
  type Seller,
} from '@/data'
import { NotificationsPopover } from '@/components/shell/notifications-popover'
import { DashboardLayout } from '@/layouts/dashboard/dashboard-layout'
import type { DashboardConfig } from '@/layouts/dashboard/types'
import { BRAND } from '@/config/brand'
import { sellerCommands, sellerFooterNav, sellerMobileTabs, sellerNav } from './nav.config'

function useSeller(): Seller | undefined {
  const sellerId = useSession((state) => state.sellerId)
  return useDb((view) => view.sellers.find((seller) => seller.id === sellerId), [sellerId])
}

function SellerNotifications() {
  const sellerId = useSession((state) => state.sellerId)
  const items = useDb((view) => getNotifications(view, 'seller', sellerId), [sellerId])
  return <NotificationsPopover items={items} />
}

/** Seller Hub = the shared dashboard shell plus this portal's config. */
export default function SellerShell() {
  const seller = useSeller()
  const signOut = useSession((state) => state.signOutSeller)
  const sellerId = useSession((state) => state.sellerId)

  const config: DashboardConfig = {
    portal: 'seller',
    brand: { name: BRAND.name, subtitle: 'Seller Hub', homeTo: '/seller' },
    nav: sellerNav,
    footerNav: sellerFooterNav,
    searchPlaceholder: 'Search orders, products, SKUs',
    commands: sellerCommands,
    topbarActions: <SellerNotifications />,
    useBadges: () => {
      const tabs = useDb((view) => getSellerTabCounts(view, sellerId), [sellerId])
      const actions = useDb((view) => getSellerActionItems(view, sellerId, DEMO_NOW), [sellerId])
      // These keys must match the ids in `getSellerActionItems`, or the counts silently vanish.
      const count = (id: string) => actions.find((item) => item.id === id)?.count
      return {
        orders: tabs.new + tabs.to_pack,
        products: count('rejected'),
        inventory: count('low_stock'),
        reviews: count('reviews'),
      }
    },
    useUser: () => ({
      name: seller?.displayName ?? 'Seller',
      email: seller?.email ?? '',
      roleLabel: seller ? `${seller.city} · Seller account` : 'Seller account',
    }),
    userMenu: [
      { label: 'Store profile', to: '/seller/profile', icon: UserCog },
      { label: 'View store page', to: seller ? `/store/${seller.slug}` : '/', icon: Store },
      { label: 'Settings', to: '/seller/profile?tab=store', icon: Settings },
      { label: 'Sign out', onSelect: signOut, icon: LogOut, destructive: true },
    ],
  }

  return <DashboardLayout config={config} mobileTabs={sellerMobileTabs} />
}
