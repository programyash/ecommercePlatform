import { FlaskConical, RotateCcw, Truck, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { dbActions, DEMO, resetDemo, useDb, useDemo, useSession, type ForcedState, type Latency } from '@/data'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select } from '@/components/ui/select'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Separator } from '@/components/ui/separator'
import { useConfirm } from '@/components/ui/use-confirm'
import { PORTALS, portalFromPath, type PortalId } from '@/config/portals'
import { useThemeStore, type ThemePref } from '@/stores/theme'

const FORCED_STATES: { value: ForcedState; label: string }[] = [
  { value: 'none', label: 'Normal' },
  { value: 'loading', label: 'Loading' },
  { value: 'empty', label: 'Empty' },
  { value: 'error', label: 'Error' },
]

/**
 * The reviewer's control panel: jump between portals and personas, force a screen's
 * loading/empty/error state, fire the events that make the cross-portal story visible,
 * and put everything back. Hidden with `?chrome=0` and in print.
 */
export function DemoTab() {
  const location = useLocation()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const portal = portalFromPath(location.pathname)

  const { latency, forcedState, chromeHidden, setLatency, setForcedState, setChromeHidden } = useDemo()
  const { pref, setPref } = useThemeStore()
  const session = useSession()
  const sellers = useDb((view) => view.sellers.filter((seller) => seller.status !== 'rejected'), [])

  if (chromeHidden) return null

  const goto = (next: PortalId) => navigate(PORTALS[next].homePath)

  return (
    // A tab on the right edge, halfway down: the bottom corners belong to the product
    // (mobile tab bar, sticky sort/filter bar, table pagination) and a floating pill
    // there covered them.
    <div className="fixed top-1/2 right-0 z-40 -translate-y-1/2 print:hidden">
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="secondary" leftIcon={<FlaskConical aria-hidden />} className="rounded-r-none shadow-popover">
            Demo
          </Button>
        </PopoverTrigger>
        <PopoverContent side="left" align="center" className="w-80">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="type-label">Demo controls</p>
                <p className="type-caption text-fg-muted">All data here is synthetic.</p>
              </div>
              <IconButton label="Hide demo controls" size="sm" icon={<X aria-hidden />} onClick={() => setChromeHidden(true)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="type-caption text-fg-muted">Portal</p>
              <SegmentedControl
                aria-label="Portal"
                value={portal}
                onValueChange={goto}
                options={[
                  { value: 'customer', label: 'Shop' },
                  { value: 'seller', label: 'Seller' },
                  { value: 'admin', label: 'Admin' },
                ]}
                className="w-full"
              />
            </div>

            {portal === 'seller' ? (
              <div className="flex flex-col gap-1.5">
                <p className="type-caption text-fg-muted">Signed in as</p>
                <Select
                  aria-label="Seller persona"
                  value={session.sellerId}
                  onValueChange={(value) => session.signInSeller(value)}
                  options={sellers.map((seller) => ({
                    value: seller.id,
                    label: seller.displayName,
                    description: seller.status === 'active' ? seller.city : `${seller.city} · ${seller.status.replace('_', ' ')}`,
                  }))}
                  size="sm"
                />
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <p className="type-caption text-fg-muted">Force screen state</p>
              <SegmentedControl
                aria-label="Force screen state"
                size="sm"
                value={forcedState}
                onValueChange={(value) => setForcedState(value as ForcedState)}
                options={FORCED_STATES}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <p className="type-caption text-fg-muted">Latency</p>
                <Select
                  aria-label="Simulated latency"
                  size="sm"
                  value={latency}
                  onValueChange={(value) => setLatency(value as Latency)}
                  options={[
                    { value: 'off', label: 'Instant' },
                    { value: 'fast', label: 'Fast' },
                    { value: 'slow', label: 'Slow' },
                  ]}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="type-caption text-fg-muted">Theme</p>
                <Select
                  aria-label="Theme"
                  size="sm"
                  value={pref}
                  onValueChange={(value) => setPref(value as ThemePref)}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                    { value: 'system', label: 'System' },
                  ]}
                />
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <p className="type-caption text-fg-muted">Simulate</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Truck aria-hidden />}
                  onClick={() => {
                    const result = dbActions.advanceCourier()
                    if (result.ok) toast.success('Courier updated', { description: 'Shipments in transit moved one step.' })
                    else toast.message('Nothing to advance', { description: result.error })
                  }}
                >
                  Advance courier
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const sellerId = portal === 'seller' ? session.sellerId : DEMO.sellerId
                    const result = dbActions.simulateNewOrder(sellerId)
                    if (result.ok) {
                      toast.success('New order arrived', {
                        description: `${result.orderId} is waiting in Seller Hub.`,
                        action: { label: 'Open', onClick: () => navigate('/seller/orders') },
                      })
                    } else {
                      toast.error('Could not create an order', { description: result.error })
                    }
                  }}
                >
                  New order
                </Button>
              </div>
            </div>

            <Button
              variant="danger-outline"
              size="sm"
              leftIcon={<RotateCcw aria-hidden />}
              onClick={async () => {
                const ok = await confirm({
                  title: 'Reset demo data?',
                  description:
                    'This restores the original products, orders, carts, sellers and approvals in all three portals. Your changes will be lost.',
                  confirmLabel: 'Reset demo data',
                  tone: 'danger',
                })
                if (ok) resetDemo()
              }}
            >
              Reset demo data
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
