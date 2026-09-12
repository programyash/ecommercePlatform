import { X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Outlet } from 'react-router'
import { NavigationProgress } from '@/components/shell/navigation-progress'
import { cn } from '@/lib/cn'
import { MobileTabBar } from './mobile-tab-bar'
import { StoreFooter } from './store-footer'

interface StorefrontLayoutProps {
  /** Header with search, categories and actions (wired to data by the shell). */
  header: ReactNode
  /** Cart drawer, PIN sheet and any other storefront-level overlays. */
  overlays?: ReactNode
  cartCount: number
  onOpenCart: () => void
  /** Dismissible campaign strip above the header. */
  announcement?: { id: string; message: ReactNode; to?: string }
  onDismissAnnouncement?: (id: string) => void
}

/** Chrome for every shopper-facing page: announcement, header, content, footer, tab bar. */
export function StorefrontLayout({
  header,
  overlays,
  cartCount,
  onOpenCart,
  announcement,
  onDismissAnnouncement,
}: StorefrontLayoutProps) {
  const [dismissed, setDismissed] = useState(false)
  const showAnnouncement = announcement && !dismissed

  return (
    <div className="flex min-h-dvh flex-col bg-surface text-fg">
      <NavigationProgress />

      {showAnnouncement ? (
        <div className="bg-surface-inverse text-fg-inverse print:hidden">
          <div className="mx-auto flex max-w-shop items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
            <p className="min-w-0 flex-1 truncate type-caption">{announcement.message}</p>
            <button
              type="button"
              aria-label="Dismiss announcement"
              onClick={() => {
                setDismissed(true)
                onDismissAnnouncement?.(announcement.id)
              }}
              className="grid size-6 shrink-0 place-items-center rounded-badge opacity-80 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Chrome is for browsing; an invoice or order printed from here should carry only the page. */}
      <div className="print:hidden">{header}</div>

      <main id="main" className={cn('flex-1 pb-20 md:pb-0 print:pb-0')}>
        <Outlet />
      </main>

      <div className="print:hidden">
        <StoreFooter />
        <MobileTabBar cartCount={cartCount} onOpenCart={onOpenCart} />
      </div>
      {overlays}
    </div>
  )
}
