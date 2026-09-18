import { ChevronDown } from 'lucide-react'
import { Link } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/cn'
import type { DashboardMenuItem, DashboardUser } from '@/layouts/dashboard/types'

interface UserMenuProps {
  user: DashboardUser
  items: DashboardMenuItem[]
  /** Hide the name and role on narrow topbars. */
  compact?: boolean
}

export function UserMenu({ user, items, compact = false }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex items-center gap-2 rounded-control py-1 pr-1.5 pl-1 text-left transition-colors hover:bg-surface-2',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        )}
      >
        <Avatar name={user.name} size="sm" />
        {!compact ? (
          <span className="hidden min-w-0 flex-col lg:flex">
            <span className="truncate type-label text-fg">{user.name}</span>
            <span className="truncate type-caption text-fg-muted">{user.roleLabel}</span>
          </span>
        ) : null}
        <ChevronDown aria-hidden className="size-4 shrink-0 text-fg-muted" />
        <span className="sr-only">Account menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56">
        <div className="flex flex-col gap-0.5 px-2.5 py-2">
          <span className="type-label text-fg">{user.name}</span>
          <span className="type-caption text-fg-muted">{user.email}</span>
        </div>
        <DropdownMenuSeparator />
        {items.map((item) =>
          item.to ? (
            <DropdownMenuItem key={item.label} asChild icon={item.icon ? <item.icon aria-hidden /> : undefined}>
              <Link to={item.to}>{item.label}</Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              key={item.label}
              onSelect={item.onSelect}
              destructive={item.destructive}
              icon={item.icon ? <item.icon aria-hidden /> : undefined}
            >
              {item.label}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
