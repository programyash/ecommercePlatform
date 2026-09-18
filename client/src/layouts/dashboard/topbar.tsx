import { Menu, Search } from 'lucide-react'
import { ThemeToggle } from '@/components/shell/theme-toggle'
import { UserMenu } from '@/components/shell/user-menu'
import { IconButton } from '@/components/ui/icon-button'
import { Kbd } from '@/components/ui/kbd'
import { modKeyLabel } from '@/lib/use-hotkey'
import type { DashboardConfig, DashboardUser } from './types'

interface TopbarProps {
  config: DashboardConfig
  user: DashboardUser
  onOpenSearch: () => void
  onOpenDrawer: () => void
}

export function Topbar({ config, user, onOpenSearch, onOpenDrawer }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-topbar shrink-0 items-center gap-2 border-b border-border bg-header px-3 sm:px-4">
      <div className="md:hidden">
        <IconButton label="Open menu" icon={<Menu aria-hidden />} onClick={onOpenDrawer} />
      </div>

      <button
        type="button"
        onClick={onOpenSearch}
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-control border border-input bg-surface-2 px-3 text-left text-fg-subtle transition-colors hover:border-border-strong hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:max-w-md"
      >
        <Search aria-hidden className="size-4 shrink-0" />
        <span className="truncate type-body">{config.searchPlaceholder}</span>
        <Kbd className="ml-auto hidden shrink-0 sm:inline-flex">{modKeyLabel('K')}</Kbd>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        {config.topbarActions}
        <ThemeToggle />
        <UserMenu user={user} items={config.userMenu} />
      </div>
    </header>
  )
}
