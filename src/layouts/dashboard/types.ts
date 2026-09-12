import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export interface NavItem {
  id: string
  label: string
  to: string
  icon: LucideIcon
  /** Match the path exactly (dashboard index links). */
  end?: boolean
  /** Key into the badge map returned by `useBadges` (e.g. pending counts). */
  badgeKey?: string
}

export interface NavSection {
  /** Omitted for the first, unlabelled group. */
  section?: string
  items: NavItem[]
}

export interface CommandItem {
  id: string
  label: string
  to?: string
  onSelect?: () => void
  icon?: LucideIcon
  keywords?: string
  shortcut?: string
}

export interface CommandGroup {
  heading: string
  items: CommandItem[]
}

export interface DashboardUser {
  name: string
  email: string
  roleLabel: string
}

export interface DashboardMenuItem {
  label: string
  to?: string
  onSelect?: () => void
  icon?: LucideIcon
  destructive?: boolean
}

/**
 * Everything that differs between Seller Hub and Admin. The layout itself is identical,
 * so the two portals stay consistent by construction.
 */
export interface DashboardConfig {
  portal: 'seller' | 'admin'
  brand: { name: string; subtitle: string; homeTo: string }
  nav: NavSection[]
  footerNav?: NavItem[]
  /** Live counts for nav badges, keyed by `badgeKey`. */
  useBadges?: () => Partial<Record<string, number>>
  useUser: () => DashboardUser
  userMenu: DashboardMenuItem[]
  commands: CommandGroup[]
  /** Extra results for the command palette as the user types. */
  useCommandSearch?: (query: string) => CommandItem[]
  searchPlaceholder: string
  topbarActions?: ReactNode
}
