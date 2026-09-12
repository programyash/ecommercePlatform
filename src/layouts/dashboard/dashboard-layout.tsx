import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { CommandPalette, useCommandPalette } from '@/components/shell/command-palette'
import { NavigationProgress } from '@/components/shell/navigation-progress'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { cn } from '@/lib/cn'
import { useMediaQuery } from '@/lib/use-media-query'
import { useUiStore } from '@/stores/ui'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import type { DashboardConfig, NavItem } from './types'

interface DashboardLayoutProps {
  config: DashboardConfig
  /** Bottom tab bar on phones (Seller Hub). */
  mobileTabs?: NavItem[]
}

/**
 * One shell for Seller Hub and Admin: sidebar (full → icon rail → drawer), sticky topbar
 * with ⌘K search, and the page area. The two portals differ only by config.
 */
export function DashboardLayout({ config, mobileTabs }: DashboardLayoutProps) {
  const collapsedPref = useUiStore((state) => state.sidebarCollapsed[config.portal])
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { open: searchOpen, setOpen: setSearchOpen } = useCommandPalette()
  // Between md and lg there is only room for the icon rail.
  const railOnly = useMediaQuery('(min-width: 48rem) and (max-width: 63.99rem)')
  const badges = config.useBadges?.() ?? {}
  const user = config.useUser()

  return (
    <div className="flex min-h-dvh bg-canvas text-fg" data-portal={config.portal}>
      <NavigationProgress />

      {/* Navigation is for working; a printed invoice, manifest or report carries only the page. */}
      <aside className="sticky top-0 hidden h-dvh shrink-0 md:block print:hidden">
        <Sidebar
          config={config}
          badges={badges}
          collapsed={railOnly || collapsedPref}
          onToggleCollapsed={railOnly ? undefined : () => setSidebarCollapsed(config.portal, !collapsedPref)}
        />
      </aside>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" title={`${config.brand.name} ${config.brand.subtitle}`} hideTitle bodyClassName="p-0">
          <Sidebar
            config={config}
            badges={badges}
            collapsed={false}
            variant="drawer"
            onNavigate={() => setDrawerOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="print:hidden">
          <Topbar config={config} user={user} onOpenSearch={() => setSearchOpen(true)} onOpenDrawer={() => setDrawerOpen(true)} />
        </div>
        <main id="main" className={cn('flex-1 px-4 py-5 sm:px-6 lg:px-8 print:p-0', mobileTabs && 'pb-24 md:pb-5')}>
          <div className="mx-auto flex max-w-dash flex-col gap-5">
            <Outlet />
          </div>
        </main>
      </div>

      {mobileTabs?.length ? (
        <nav
          aria-label="Sections"
          className="fixed inset-x-0 bottom-0 z-30 flex h-tabbar items-stretch border-t border-border bg-surface pb-safe md:hidden print:hidden"
        >
          {mobileTabs.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 type-caption text-fg-muted transition-colors',
                  isActive && 'text-primary',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <item.icon aria-hidden className={cn('size-5', isActive && 'text-primary')} />
                    {item.badgeKey && badges[item.badgeKey] ? (
                      <span className="absolute -top-1 -right-2 rounded-pill bg-primary px-1 text-2xs leading-4 font-semibold text-primary-fg tabular">
                        {badges[item.badgeKey]}
                      </span>
                    ) : null}
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      ) : null}

      <CommandPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        groups={config.commands}
        useSearch={config.useCommandSearch}
        placeholder={config.searchPlaceholder}
      />
    </div>
  )
}
