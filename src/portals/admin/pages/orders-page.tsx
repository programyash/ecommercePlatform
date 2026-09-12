import { ChevronDown, Copy, Ellipsis, Eye, ShoppingCart, Store } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import {
  getAdminOrders,
  useDb,
  useDemoQuery,
  type AdminOrderView,
  type PaymentMethod,
  type ShipmentStatus,
} from '@/data'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { IconButton } from '@/components/ui/icon-button'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { Tabs } from '@/components/ui/tabs'
import { DataTable, type Column } from '@/components/dashboard/data-table'
import { ExportButton } from '@/components/dashboard/export-button'
import { FilterBar } from '@/components/dashboard/filter-bar'
import { formatDate, formatDateTime, formatINR, formatNumber, pluralize } from '@/lib/format'
import { PAYMENT_METHOD_META, deriveOrderSummary, statusOptions } from '@/lib/status'
import { useUrlState } from '@/lib/use-url-state'
import { LoadFailed } from '../components/record-states'

const VIEWS: { value: AdminOrderView; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'attention', label: 'Needs attention' },
  { value: 'cod', label: 'COD' },
  { value: 'returns', label: 'Returns & refunds' },
  { value: 'cancelled', label: 'Cancelled' },
]

const AMOUNT_BANDS: Record<string, { label: string; min?: number; max?: number }> = {
  under_1k: { label: 'Under ₹1,000', max: 999 },
  '1k_5k': { label: '₹1,000 to ₹5,000', min: 1000, max: 5000 },
  '5k_20k': { label: '₹5,000 to ₹20,000', min: 5000, max: 20000 },
  over_20k: { label: 'Over ₹20,000', min: 20000 },
}

const EMPTY_COPY: Record<AdminOrderView, { title: string; description: string }> = {
  all: { title: 'No orders yet', description: 'Orders appear here the moment a shopper checks out.' },
  attention: {
    title: 'Nothing needs attention',
    description: 'No missed dispatch deadlines and no failed payments in this view. Nicely done.',
  },
  cod: { title: 'No cash-on-delivery orders', description: 'Orders paid in cash on delivery will be listed here.' },
  returns: { title: 'No returns or refunds', description: 'Return requests and refunds across the marketplace show up here.' },
  cancelled: { title: 'No cancelled orders', description: 'Orders cancelled by a shopper, a seller or the marketplace appear here.' },
}

/** Find any order on the marketplace, then open it to fix what went wrong. */
export default function AdminOrdersPage() {
  const [view, setView] = useUrlState<AdminOrderView>('view', 'all')
  const [q, setQ] = useUrlState<string>('q', '')
  const [status, setStatus] = useUrlState<string>('status', '')
  const [method, setMethod] = useUrlState<string>('method', '')
  const [payment, setPayment] = useUrlState<string>('payment', '')
  const [sellerId, setSellerId] = useUrlState<string>('seller', '')
  const [state, setState] = useUrlState<string>('state', '')
  const [band, setBand] = useUrlState<string>('amount', '')
  const navigate = useNavigate()

  const sellers = useDb((db) => db.sellers.map((seller) => ({ value: seller.id, label: seller.displayName })), [])
  const states = useDb(
    (db) => [...new Set(db.orders.map((order) => order.shipTo.state))].sort().map((name) => ({ value: name, label: name })),
    [],
  )

  const amount = AMOUNT_BANDS[band]
  const query = useDemoQuery(
    (db) =>
      getAdminOrders(db, {
        view,
        ...(q ? { q } : {}),
        ...(status ? { status: status as ShipmentStatus } : {}),
        ...(method ? { method: method as PaymentMethod } : {}),
        ...(sellerId ? { sellerId } : {}),
        ...(state ? { state } : {}),
        ...(amount?.min !== undefined ? { minAmount: amount.min } : {}),
        ...(amount?.max !== undefined ? { maxAmount: amount.max } : {}),
      }).filter((row) => !payment || row.order.payment.status === payment),
    [view, q, status, method, sellerId, state, band, payment],
  )
  // `?demo=empty` still hands back real rows, so blank them here to show the empty state.
  const rows = query.status === 'empty' ? [] : (query.data ?? [])
  type Row = (typeof rows)[number]

  const filtered = Boolean(q || status || method || payment || sellerId || state || band) || view !== 'all'
  const resetAll = () => {
    setQ('')
    setStatus('')
    setMethod('')
    setPayment('')
    setSellerId('')
    setState('')
    setBand('')
    setView('all')
  }

  const csvHeaders = [
    'Order', 'Placed', 'Shopper', 'City', 'State', 'Sellers', 'Units', 'Amount', 'Payment method', 'Payment status', 'Fulfilment',
  ] as const
  const csvRow = (row: Row) => [
    row.order.id,
    row.order.placedAt,
    row.customer?.name ?? '',
    row.order.shipTo.city,
    row.order.shipTo.state,
    row.sellers.map((seller) => seller.displayName).join(' | '),
    row.units,
    row.order.totals.total,
    PAYMENT_METHOD_META[row.order.payment.method].short,
    row.order.payment.status,
    deriveOrderSummary(row.shipments).label,
  ]

  const columns: Column<Row>[] = [
    {
      id: 'id',
      header: 'Order',
      mobile: 'title',
      sortValue: (row) => row.order.id,
      cell: (row) => (
        <span className="flex min-w-0 flex-col">
          <Link
            to={`/admin/orders/${row.order.id}`}
            className="rounded-badge font-mono font-medium whitespace-nowrap hover:text-primary hover:underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {row.order.id}
          </Link>
          <span className="type-caption text-fg-muted">{formatDateTime(row.order.placedAt)}</span>
        </span>
      ),
    },
    {
      id: 'placed',
      header: 'Placed',
      hideBelow: 'xl',
      hideable: true,
      // The Order cell already carries the timestamp; this is here for sorting and export.
      defaultHidden: true,
      sortValue: (row) => row.order.placedAt,
      cell: (row) => <span className="whitespace-nowrap">{formatDate(row.order.placedAt)}</span>,
    },
    {
      id: 'shopper',
      header: 'Shopper',
      mobile: 'subtitle',
      sortValue: (row) => row.customer?.name ?? '',
      cell: (row) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate">{row.customer?.name ?? 'Deleted account'}</span>
          <span className="type-caption text-fg-muted">
            {row.order.shipTo.city} · {row.order.shipTo.pin}
          </span>
        </span>
      ),
    },
    {
      id: 'sellers',
      header: 'Sellers',
      hideBelow: 'xl',
      hideable: true,
      cell: (row) => (
        <span className="line-clamp-2">
          {row.sellers.length === 0
            ? '—'
            : row.sellers.length === 1
              ? row.sellers[0]?.displayName
              : `${row.sellers[0]?.displayName} +${row.sellers.length - 1}`}
        </span>
      ),
    },
    {
      id: 'units',
      header: 'Items',
      align: 'end',
      hideBelow: 'lg',
      hideable: true,
      sortValue: (row) => row.units,
      cell: (row) => formatNumber(row.units),
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'end',
      mobile: 'meta',
      sortValue: (row) => row.order.totals.total,
      cell: (row) => formatINR(row.order.totals.total),
    },
    {
      id: 'payment',
      header: 'Payment',
      mobile: 'meta',
      sortValue: (row) => row.order.payment.method,
      cell: (row) => (
        <span className="flex flex-col items-start gap-1">
          <span className="whitespace-nowrap">{PAYMENT_METHOD_META[row.order.payment.method].short}</span>
          <StatusBadge domain="payment" status={row.order.payment.status} size="sm" withTooltip />
        </span>
      ),
    },
    {
      id: 'fulfilment',
      header: 'Fulfilment',
      width: 'lg',
      mobile: 'meta',
      sortValue: (row) => deriveOrderSummary(row.shipments).label,
      cell: (row) => {
        const summary = deriveOrderSummary(row.shipments)
        return (
          <details className="group min-w-0">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-badge py-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
              <span className="type-body text-fg">{summary.label}</span>
              <span className="flex shrink-0 items-center gap-1">
                {row.shipments.map((shipment) => (
                  <StatusBadge key={shipment.id} domain="shipment" status={shipment.status} size="sm" />
                ))}
              </span>
              <ChevronDown
                aria-hidden
                className="size-3.5 shrink-0 text-fg-subtle transition-transform group-open:rotate-180"
              />
              <span className="sr-only">Show the shipments in {row.order.id}</span>
            </summary>
            <ul className="mt-2 flex flex-col gap-2 border-l-2 border-border-subtle pl-3">
              {row.shipments.map((shipment) => {
                const seller = row.sellers.find((entry) => entry.id === shipment.sellerId)
                return (
                  <li key={shipment.id} className="flex flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono type-caption text-fg">{shipment.id}</span>
                      <StatusBadge domain="shipment" status={shipment.status} size="sm" />
                    </span>
                    <span className="type-caption text-fg-muted">
                      {seller?.displayName ?? 'Seller removed'}
                      {shipment.awb ? ` · AWB ${shipment.awb}` : ''}
                    </span>
                  </li>
                )
              })}
            </ul>
          </details>
        )
      },
    },
    {
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'end',
      width: 'xs',
      mobile: 'action',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton label={`Actions for ${row.order.id}`} size="sm" variant="ghost" icon={<Ellipsis aria-hidden />} />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem icon={<Eye aria-hidden />} onSelect={() => void navigate(`/admin/orders/${row.order.id}`)}>
              View details
            </DropdownMenuItem>
            <DropdownMenuItem
              icon={<Copy aria-hidden />}
              onSelect={() => {
                void navigator.clipboard.writeText(row.order.id)
                toast.success('Order id copied')
              }}
            >
              Copy order id
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {row.customer ? (
              <DropdownMenuItem icon={<Eye aria-hidden />} onSelect={() => void navigate(`/admin/users/${row.customer?.id ?? ''}`)}>
                View shopper
              </DropdownMenuItem>
            ) : null}
            {row.sellers[0] ? (
              <DropdownMenuItem icon={<Store aria-hidden />} onSelect={() => void navigate(`/admin/sellers/${row.sellers[0]?.id ?? ''}`)}>
                View seller
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const emptyCopy = EMPTY_COPY[view]

  return (
    <>
      <PageHeader
        title="Orders"
        description="Every order placed on the marketplace, with the shipments each one split into."
        meta={
          query.status === 'success' ? (
            <span>
              {formatNumber(rows.length)} {pluralize(rows.length, 'order')}
            </span>
          ) : null
        }
      >
        <Tabs
          aria-label="Saved views"
          value={view}
          onValueChange={(next) => setView(next as AdminOrderView)}
          items={VIEWS.map((entry) => ({ value: entry.value, label: entry.label }))}
        />
      </PageHeader>

      {query.status === 'error' ? (
        <LoadFailed title="We couldn’t load the orders" onRetry={query.retry} />
      ) : (
        <DataTable
          tableId="admin-orders"
          caption="Orders placed on the marketplace"
          data={rows}
          columns={columns}
          getRowId={(row) => row.order.id}
          loading={query.status === 'loading'}
          selectable
          bulkActions={(ids) => (
            <ExportButton
              filename="chowk-orders-selected"
              label="Export selected"
              headers={csvHeaders}
              rows={() => rows.filter((row) => ids.includes(row.order.id)).map(csvRow)}
            />
          )}
          toolbar={
            <FilterBar
              search={{ value: q, onChange: setQ, placeholder: 'Search order id, name, mobile or AWB' }}
              facets={[
                {
                  id: 'status',
                  label: 'Shipment status',
                  single: true,
                  selected: status ? [status] : [],
                  onChange: (selected) => setStatus(selected[0] ?? ''),
                  options: statusOptions('shipment'),
                },
                {
                  id: 'payment',
                  label: 'Payment status',
                  single: true,
                  selected: payment ? [payment] : [],
                  onChange: (selected) => setPayment(selected[0] ?? ''),
                  options: statusOptions('payment'),
                },
                {
                  id: 'method',
                  label: 'Method',
                  single: true,
                  selected: method ? [method] : [],
                  onChange: (selected) => setMethod(selected[0] ?? ''),
                  options: Object.entries(PAYMENT_METHOD_META).map(([value, meta]) => ({ value, label: meta.label })),
                },
                {
                  id: 'seller',
                  label: 'Seller',
                  single: true,
                  selected: sellerId ? [sellerId] : [],
                  onChange: (selected) => setSellerId(selected[0] ?? ''),
                  options: sellers,
                },
                {
                  id: 'state',
                  label: 'State',
                  single: true,
                  selected: state ? [state] : [],
                  onChange: (selected) => setState(selected[0] ?? ''),
                  options: states,
                },
                {
                  id: 'amount',
                  label: 'Amount',
                  single: true,
                  selected: band ? [band] : [],
                  onChange: (selected) => setBand(selected[0] ?? ''),
                  options: Object.entries(AMOUNT_BANDS).map(([value, entry]) => ({ value, label: entry.label })),
                },
              ]}
              onReset={resetAll}
              actions={<ExportButton filename="chowk-orders" headers={csvHeaders} rows={() => rows.map(csvRow)} />}
            />
          }
          empty={
            <EmptyState
              icon={<ShoppingCart aria-hidden />}
              title={filtered && view === 'all' ? 'No orders match these filters' : emptyCopy.title}
              description={
                filtered && view === 'all'
                  ? 'Try a different search, or remove one of the filters you have applied.'
                  : emptyCopy.description
              }
              action={
                filtered ? (
                  <Button size="sm" variant="outline" onClick={resetAll}>
                    Clear filters
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/admin">Back to dashboard</Link>
                  </Button>
                )
              }
            />
          }
        />
      )}
    </>
  )
}
