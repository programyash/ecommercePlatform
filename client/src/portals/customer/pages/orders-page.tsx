import { Package, TriangleAlert } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { type OrderView } from '@/data'
import { useApiQuery } from '@/data/api-hooks'
import { useSocketStore } from '@/lib/socket-store'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { FilterBar } from '@/components/dashboard/filter-bar'
import { pluralWithCount } from '@/lib/format'
import { useUrlState } from '@/lib/use-url-state'
import { buyAgain } from '../components/account/buy-again'
import { OrderCard } from '../components/account/order-card'

type StatusFilter = 'all' | 'open' | 'delivered' | 'cancelled' | 'returns'
type PeriodFilter = 'all' | '30' | '90' | '365'

const STATUS_OPTIONS = [
  { value: 'open', label: 'In progress' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returns', label: 'Returns' },
]

const PERIOD_OPTIONS = [
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 3 months' },
  { value: '365', label: 'Last year' },
]

/** Every order this shopper has placed, newest first. */
export default function OrdersPage() {
  const navigate = useNavigate()
  const [q, setQ] = useUrlState<string>('q', '')
  const [status, setStatus] = useUrlState<StatusFilter>('status', 'all')
  const [period, setPeriod] = useUrlState<PeriodFilter>('period', 'all')
  
  const orderTick = useSocketStore(s => s.orderTick)

  const query = useApiQuery<OrderView[]>('/orders', [orderTick])

  // Local filtering since API returns all (in a real app, API would filter)
  const allOrders = (query.data ?? []).map((entry) => ({
    ...entry,
    shipments: (entry.shipments || []).map((s) => ({
      ...s,
      shipment: {
        ...s.shipment,
        status: String(s.shipment.status || 'placed').toLowerCase() as any,
      }
    }))
  }))
  let orders = allOrders
  if (q || status !== 'all' || period !== 'all') {
    orders = orders.filter(entry => {
       let pass = true;
       if (status === 'open') pass = pass && entry.shipments.some(s => s.shipment.status !== 'delivered' && s.shipment.status !== 'cancelled');
       if (status === 'delivered') pass = pass && entry.shipments.some(s => s.shipment.status === 'delivered');
       if (status === 'cancelled') pass = pass && entry.shipments.some(s => s.shipment.status === 'cancelled');
       if (status === 'returns') pass = pass && entry.shipments.some(s => Boolean(s.return));
       
       if (period !== 'all') {
         const cutoff = new Date(Date.now() - Number(period) * 86400000);
         pass = pass && new Date(entry.order.placedAt) >= cutoff;
       }
       if (q) {
         pass = pass && (entry.order.id.toLowerCase().includes(q.toLowerCase()) || entry.items.some(i => i.title.toLowerCase().includes(q.toLowerCase())));
       }
       return pass;
    });
  }

  const filtered = q !== '' || status !== 'all' || period !== 'all'

  const clearFilters = () => {
    setQ('')
    setStatus('all')
    setPeriod('all')
  }

  const onBuyAgain = (order: OrderView) => {
    const result = buyAgain(order)
    if (result.added === 0) {
      toast.message('Nothing could be added', { description: 'These items are no longer on sale.' })
      return
    }
    toast.success(`${pluralWithCount(result.added, 'item')} added to your bag`, {
      description:
        result.unavailable > 0
          ? `${pluralWithCount(result.unavailable, 'item')} from this order is no longer available.`
          : 'Ready when you are.',
      action: { label: 'View bag', onClick: () => void navigate('/cart') },
    })
  }

  return (
    <>
      <PageHeader
        title="Your orders"
        documentTitle="My orders"
        breadcrumbs={[{ label: 'My account', to: '/account' }, { label: 'Orders' }]}
        description="Every parcel has its own tracker — an order can arrive in more than one."
        meta={query.status === 'success' ? <span>{pluralWithCount(orders.length, 'order')}</span> : null}
      >
        <FilterBar
          search={{ value: q, onChange: setQ, placeholder: 'Search by order id or product' }}
          facets={[
            {
              id: 'status',
              label: 'Status',
              single: true,
              selected: status === 'all' ? [] : [status],
              onChange: (selected) => setStatus((selected[0] as StatusFilter) ?? 'all'),
              options: STATUS_OPTIONS,
            },
            {
              id: 'period',
              label: 'Time',
              single: true,
              selected: period === 'all' ? [] : [period],
              onChange: (selected) => setPeriod((selected[0] as PeriodFilter) ?? 'all'),
              options: PERIOD_OPTIONS,
            },
          ]}
          onReset={filtered ? clearFilters : undefined}
        />
      </PageHeader>

      {query.status === 'error' ? (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState
            icon={<TriangleAlert aria-hidden />}
            title="We couldn’t load your orders"
            description="Something went wrong on our side. Try again in a moment."
            action={<Button onClick={query.retry}>Retry</Button>}
          />
        </div>
      ) : query.status === 'loading' ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-48 rounded-card" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState
            icon={<Package aria-hidden />}
            title={filtered ? 'No orders match these filters' : 'No orders yet'}
            description={
              filtered
                ? 'Try a different search, or clear the status and time filters.'
                : 'Once you place an order it shows up here, with a tracker for every parcel.'
            }
            action={
              filtered ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button asChild>
                  <Link to="/">Start shopping</Link>
                </Button>
              )
            }
          />
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {orders.map((order) => (
            <li key={order.order.id}>
              <OrderCard order={order} onBuyAgain={onBuyAgain} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
