import { ChevronLeft, Lock, RotateCcw, ShieldCheck } from 'lucide-react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { Stepper } from '@/components/ui/stepper'
import { NavigationProgress } from '@/components/shell/navigation-progress'
import { BRAND } from '@/config/brand'

const STEPS = [
  { id: 'address', label: 'Address', description: 'Where it goes' },
  { id: 'summary', label: 'Summary', description: 'What you get' },
  { id: 'payment', label: 'Payment', description: 'How you pay' },
]

const TRUST = [
  { icon: Lock, label: 'Payments are simulated — no money moves' },
  { icon: ShieldCheck, label: 'GST invoice with every order' },
  { icon: RotateCcw, label: '7-day returns on most items' },
]

function stepIndex(pathname: string): number {
  if (pathname.endsWith('/payment')) return 2
  if (pathname.endsWith('/summary')) return 1
  return 0
}

/**
 * Checkout has its own chrome: a minimal header with the stepper, no category nav and no
 * footer links, so nothing competes with finishing the order.
 */
export default function CheckoutLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const current = stepIndex(pathname)
  const step = STEPS[current]

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-fg">
      <NavigationProgress />

      <header className="sticky top-0 z-30 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-shop flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                to="/"
                className="flex shrink-0 items-center gap-2 rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span aria-hidden className="grid size-8 place-items-center rounded-control bg-primary type-label text-primary-fg">
                  {BRAND.name.charAt(0)}
                </span>
                <span className="type-title">{BRAND.name}</span>
              </Link>
              <span aria-hidden className="hidden h-6 w-px bg-border sm:block" />
              <p className="hidden items-center gap-1.5 type-label text-fg-muted sm:flex">
                <Lock aria-hidden className="size-4" />
                Secure checkout
              </p>
            </div>

            <Link
              to="/cart"
              className="inline-flex shrink-0 items-center gap-1 rounded-control type-label text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <ChevronLeft aria-hidden className="size-4" />
              Back to bag
            </Link>
          </div>

          {/* Desktop: the whole path. Phones: where you are in it. */}
          <Stepper
            steps={STEPS}
            current={current}
            onStepClick={(index) => void navigate(`/checkout/${STEPS[index]?.id ?? 'address'}`)}
            className="hidden sm:flex"
          />
          <p className="type-caption text-fg-muted sm:hidden">
            Step {current + 1} of {STEPS.length} · <span className="text-fg">{step?.label}</span>
          </p>
        </div>
      </header>

      <main id="main" className="flex-1 pb-28 lg:pb-10">
        <div className="mx-auto max-w-shop px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-border bg-surface print:hidden">
        {/* Extra bottom room on phones so the sticky pay bar never covers this. */}
        <ul className="mx-auto flex max-w-shop flex-wrap gap-x-6 gap-y-2 px-4 pt-4 pb-24 sm:px-6 lg:px-8 lg:pb-4">
          {TRUST.map((item) => (
            <li key={item.label} className="flex items-center gap-2 type-caption text-fg-muted">
              <item.icon aria-hidden className="size-4 shrink-0" />
              {item.label}
            </li>
          ))}
        </ul>
      </footer>
    </div>
  )
}
