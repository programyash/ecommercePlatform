import { ArrowRight, Compass } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/card'

const QUEUES = [
  { label: 'Dashboard', detail: 'Marketplace health and what to handle first', to: '/admin' },
  { label: 'Orders', detail: 'Every order, with its shipments', to: '/admin/orders' },
  { label: 'Sellers', detail: 'Applications waiting for approval', to: '/admin/sellers?tab=pending' },
  { label: 'Products', detail: 'Listings waiting for catalogue review', to: '/admin/products?tab=moderation' },
  { label: 'Payouts', detail: 'Settlement batches and anything on hold', to: '/admin/payouts' },
  { label: 'Reports', detail: 'Sales, tax and everything in between', to: '/admin/reports' },
]

/** A wrong turn inside Admin — say so, then point at the queues people actually want. */
export default function AdminNotFoundPage() {
  const location = useLocation()

  return (
    <>
      <PageHeader title="Page not found" documentTitle="Page not found" />

      <EmptyState
        icon={<Compass aria-hidden />}
        title="There is nothing at this address"
        description={`“${location.pathname}” is not a page in Chowk Admin. It may have been renamed, or the link may be mistyped.`}
        action={
          <Button asChild>
            <Link to="/admin">Go to the dashboard</Link>
          </Button>
        }
      />

      <SectionCard title="Where you might be heading" flush>
        <ul className="divide-y divide-border-subtle">
          {QUEUES.map((queue) => (
            <li key={queue.to}>
              <Link
                to={queue.to}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-5"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="type-label text-fg">{queue.label}</span>
                  <span className="type-caption text-fg-muted">{queue.detail}</span>
                </span>
                <ArrowRight aria-hidden className="size-4 shrink-0 text-fg-subtle" />
              </Link>
            </li>
          ))}
        </ul>
      </SectionCard>
    </>
  )
}
