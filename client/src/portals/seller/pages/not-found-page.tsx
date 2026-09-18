import { Compass } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'

const SHORTCUTS = [
  { to: '/seller', label: 'Dashboard', detail: 'Today’s dispatch queue and your numbers.' },
  { to: '/seller/orders', label: 'Orders', detail: 'Confirm, pack and hand over.' },
  { to: '/seller/products', label: 'Products', detail: 'Your listings by moderation status.' },
  { to: '/seller/payouts', label: 'Payouts', detail: 'Settlements, fees and taxes.' },
]

/** A Seller Hub address that does not exist — offer the four pages sellers actually want. */
export default function SellerNotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" breadcrumbs={[{ label: 'Seller Hub', to: '/seller' }, { label: 'Not found' }]} />

      <EmptyState
        icon={<Compass aria-hidden />}
        title="We couldn’t find that page"
        description="The link may be old, or the page may have moved. Everything in Seller Hub is one hop from the dashboard."
        action={
          <Button asChild>
            <Link to="/seller">Go to dashboard</Link>
          </Button>
        }
        secondaryAction={
          <Button variant="outline" asChild>
            <Link to="/seller/orders">Open orders</Link>
          </Button>
        }
      />

      <SectionCard title="Jump to" flush>
        <ul className="divide-y divide-border-subtle">
          {SHORTCUTS.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className="flex flex-col gap-0.5 px-4 py-3 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-5"
              >
                <span className="type-label text-fg">{item.label}</span>
                <span className="type-caption text-fg-muted">{item.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      </SectionCard>
    </>
  )
}
