import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { NavLink } from 'react-router'
import { IconButton } from '@/components/ui/icon-button'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'
import type { DashboardConfig, NavItem } from './types'

interface SidebarProps {
  config: DashboardConfig
  badges: Partial<Record<string, number>>
  collapsed: boolean
  onToggleCollapsed?: () => void
  /** Inside the mobile drawer the rail/collapse behaviour is off. */
  variant?: 'fixed' | 'drawer'
  onNavigate?: () => void
}

function NavRow({
  item,
  badge,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  badge?: number
  collapsed: boolean
  onNavigate?: () => void
}) {
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-2.5 rounded-control px-2.5 py-2 type-label text-sidebar-fg transition-colors',
          'hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
          // Expanded, the label does the work and a subtle fill is enough. Collapsed to
          // icons, a subtle fill is invisible — the rail needs a solid marker.
          isActive && (collapsed ? 'bg-primary text-primary-fg hover:bg-primary-hover' : 'bg-sidebar-active text-sidebar-active-fg'),
          collapsed && 'justify-center px-0',
        )
      }
    >
      <item.icon aria-hidden className="size-4.5 shrink-0" />
      {collapsed ? (
        <span className="sr-only">{item.label}</span>
      ) : (
        <span className="flex-1 truncate">{item.label}</span>
      )}
      {badge ? (
        <span
          className={cn(
            'shrink-0 rounded-pill bg-primary px-1.5 text-2xs font-semibold leading-4 text-primary-fg tabular',
            collapsed && 'absolute top-1 right-1',
          )}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </NavLink>
  )
  return collapsed ? (
    <li className="relative">
      <Tooltip content={badge ? `${item.label} (${badge})` : item.label} side="right">
        {link}
      </Tooltip>
    </li>
  ) : (
    <li>{link}</li>
  )
}

export function Sidebar({ config, badges, collapsed, onToggleCollapsed, variant = 'fixed', onNavigate }: SidebarProps) {
  const isCollapsed = variant === 'fixed' && collapsed
  return (
    <div
      className={cn(
        'flex h-full flex-col border-r border-sidebar-border bg-sidebar',
        variant === 'fixed' && (isCollapsed ? 'w-rail' : 'w-sidebar'),
        variant === 'drawer' && 'w-full border-r-0',
      )}
    >
      <div className={cn('flex h-topbar shrink-0 items-center gap-2 border-b border-sidebar-border px-3', isCollapsed && 'justify-center px-0')}>
        <NavLink
          to={config.brand.homeTo}
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2 rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-control bg-primary type-label text-primary-fg">
            {config.brand.name.charAt(0)}
          </span>
          {!isCollapsed ? (
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate type-label text-fg">{config.brand.name}</span>
              <span className="truncate type-caption text-fg-muted">{config.brand.subtitle}</span>
            </span>
          ) : (
            <span className="sr-only">
              {config.brand.name} {config.brand.subtitle}
            </span>
          )}
        </NavLink>
      </div>

      <nav aria-label={`${config.brand.subtitle} sections`} className="min-h-0 flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
        {config.nav.map((section, index) => (
          <div key={section.section ?? index} className={cn(index > 0 && 'mt-4')}>
            {section.section && !isCollapsed ? (
              <p className="px-2.5 pb-1 type-caption font-semibold tracking-wide text-fg-subtle uppercase">{section.section}</p>
            ) : null}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <NavRow
                  key={item.id}
                  item={item}
                  badge={item.badgeKey ? badges[item.badgeKey] : undefined}
                  collapsed={isCollapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {config.footerNav?.length ? (
        <ul className="flex flex-col gap-0.5 border-t border-sidebar-border px-2 py-2">
          {config.footerNav.map((item) => (
            <NavRow key={item.id} item={item} collapsed={isCollapsed} onNavigate={onNavigate} />
          ))}
        </ul>
      ) : null}

      {variant === 'fixed' && onToggleCollapsed ? (
        <div className={cn('hidden border-t border-sidebar-border p-2 lg:block', isCollapsed && 'flex justify-center')}>
          <IconButton
            label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            size="sm"
            icon={collapsed ? <PanelLeftOpen aria-hidden /> : <PanelLeftClose aria-hidden />}
            onClick={onToggleCollapsed}
          />
        </div>
      ) : null}
    </div>
  )
}
