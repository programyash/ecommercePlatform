import { Link, Outlet, useLocation } from 'react-router'
import { BRAND } from '@/config/brand'
import { Img } from '@/components/ui/img'
import { ThemeToggle } from '@/components/shell/theme-toggle'
import { portalFromPath } from '@/config/portals'
import type { ImageId } from '@/data/images'

/** Each portal's panel speaks to the person signing into *that* portal. */
const PANEL: Record<'customer' | 'seller' | 'admin', { image: ImageId; title: string; body: string }> = {
  customer: {
    image: 'rack-tees',
    title: BRAND.tagline,
    body: 'Prices, taxes and delivery dates shown in full, from sellers across India.',
  },
  seller: {
    image: 'produce-market',
    title: 'Sell where the delivery date is a promise',
    body: 'List once, price with GST, and see the dispatch deadline on every order before it is late.',
  },
  admin: {
    image: 'laptop-workspace',
    title: 'The marketplace, end to end',
    body: 'Approvals, moderation, orders, payouts and tax — every number traceable to the order behind it.',
  },
}

/**
 * Split screen for every sign-in and onboarding page: the form column always sits on
 * the left so the flow feels the same in all three portals, and the right panel says
 * something true about the portal being entered.
 */
export default function AuthLayout() {
  const panel = PANEL[portalFromPath(useLocation().pathname)]
  return (
    <div className="grid min-h-dvh grid-cols-1 bg-canvas text-fg lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col">
        <header className="flex items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-2 rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <span aria-hidden className="grid size-8 place-items-center rounded-control bg-primary type-label text-primary-fg">
              {BRAND.name.charAt(0)}
            </span>
            <span className="type-title">{BRAND.name}</span>
          </Link>
          <ThemeToggle size="sm" />
        </header>
        <main id="main" className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8">
          <div className="w-full max-w-form">
            <Outlet />
          </div>
        </main>
      </div>

      <aside aria-hidden className="relative hidden overflow-hidden bg-surface-2 lg:block">
        <Img image={panel.image} alt="" ratio="free" width={960} sizes="50vw" className="absolute inset-0 size-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-inverse/85 via-surface-inverse/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-10 text-fg-inverse">
          <p className="type-h2 text-balance">{panel.title}</p>
          <p className="type-body max-w-prose opacity-90">{panel.body}</p>
        </div>
      </aside>
    </div>
  )
}
