import { LogOut, Settings, ShieldCheck, Users } from 'lucide-react'
import { DEMO_NOW, getNeedsAttention, getNotifications, useDb, useSession } from '@/data'
import { NotificationsPopover } from '@/components/shell/notifications-popover'
import { DashboardLayout } from '@/layouts/dashboard/dashboard-layout'
import type { DashboardConfig } from '@/layouts/dashboard/types'
import { BRAND } from '@/config/brand'
import { adminCommands, adminFooterNav, adminNav } from './nav.config'

function AdminNotifications() {
  const adminId = useSession((state) => state.adminId)
  const items = useDb((view) => getNotifications(view, 'admin', adminId), [adminId])
  return <NotificationsPopover items={items} />
}

/** Admin = the same dashboard shell as Seller Hub, different config. */
export default function AdminShell() {
  const adminId = useSession((state) => state.adminId)
  const signOut = useSession((state) => state.signOutAdmin)
  const admin = useDb((view) => view.admins.find((user) => user.id === adminId), [adminId])
  const role = useDb((view) => view.roles.find((item) => item.id === admin?.roleId), [admin?.roleId])

  const config: DashboardConfig = {
    portal: 'admin',
    brand: { name: BRAND.name, subtitle: 'Admin', homeTo: '/admin' },
    nav: adminNav,
    footerNav: adminFooterNav,
    searchPlaceholder: 'Search orders, sellers, customers',
    commands: adminCommands,
    topbarActions: <AdminNotifications />,
    useBadges: () => {
      const attention = useDb((view) => getNeedsAttention(view, DEMO_NOW), [])
      const count = (id: string) => attention.find((item) => item.id === id)?.count
      // These keys must match the ids in `getNeedsAttention`, or the counts silently vanish.
      return {
        sellers: count('applications'),
        moderation: count('listings'),
        orders: count('dispatch'),
        payouts: count('payouts'),
        reviews: count('reviews'),
      }
    },
    useUser: () => ({
      name: admin?.name ?? 'Admin',
      email: admin?.email ?? '',
      roleLabel: role?.name ?? 'Marketplace team',
    }),
    userMenu: [
      { label: 'Team', to: '/admin/settings/team', icon: Users },
      { label: 'Roles & permissions', to: '/admin/settings/roles', icon: ShieldCheck },
      { label: 'Settings', to: '/admin/settings/general', icon: Settings },
      { label: 'Sign out', onSelect: signOut, icon: LogOut, destructive: true },
    ],
  }

  return <DashboardLayout config={config} />
}
