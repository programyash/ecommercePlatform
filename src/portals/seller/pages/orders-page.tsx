import { CircleCheck, FileText, Package, PackageCheck, Printer, Truck, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import {
  DEMO_NOW,
  dbActions,
  getSellerShipments,
  getSellerTabCounts,
  useDb,
  useDemoQuery,
  useSession,
  type ID,
  type SellerShipmentRow,
} from '@/data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Img } from '@/components/ui/img'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { Tabs } from '@/components/ui/tabs'
import { DataTable, type Column } from '@/components/dashboard/data-table'
import { ExportButton } from '@/components/dashboard/export-button'
import { FilterBar } from '@/components/dashboard/filter-bar'
import { toDayKey } from '@/lib/date'
import { formatDate, formatDueIn, formatINR, formatNumber, formatRelative } from '@/lib/format'
import { SELLER_ORDER_TABS, type SellerOrderTabId } from '@/lib/status'
import { useUrlState } from '@/lib/use-url-state'
import { LabelDialog, PackDialog, type LabelRow, type PackTarget } from '../components/fulfilment-dialogs'

type DueFilter = 'all' | 'due_today' | 'overdue'
type PaymentFilter = 'all' | 'prepaid' | 'cod'
type PlacedFilter = 'all' | 'today' | '7d' | '30d'

const PLACED_DAYS: Record<PlacedFilter, number | null> = { all: null, today: 0, '7d': 6, '30d': 29 }

interface PackDefault {
  weightKg: number
  dimensionsCm: [number, number, number]
}

function itemSummary(row: SellerShipmentRow): string {
  const first = row.items[0]
  if (!first) return '—'
  const extra = row.items.length - 1
  return extra > 0 ? `${first.title} and ${extra} more` : first.title
}

/** The dispatch queue: stage tabs, deadlines in words, and bulk actions that clear a morning. */
export default function SellerOrdersPage() {
  const sellerId = useSession((state) => state.sellerId)
  const [tab, setTab] = useUrlState<SellerOrderTabId>('tab', 'new')
  const [q, setQ] = useUrlState<string>('q', '')
  const [payment, setPayment] = useUrlState<PaymentFilter>('payment', 'all')
  const [dueParam, setDue] = useUrlState<string>('due', 'all')
  const [placed, setPlaced] = useUrlState<PlacedFilter>('placed', 'all')

  const [packTarget, setPackTarget] = useState<PackTarget | null>(null)
  const [labelRows, setLabelRows] = useState<LabelRow[]>([])
  const [labelsOpen, setLabelsOpen] = useState(false)

  // The command palette links to `?due=today`; the selector calls the same thing `due_today`.
  const due: DueFilter = dueParam === 'today' || dueParam === 'due_today' ? 'due_today' : dueParam === 'overdue' ? 'overdue' : 'all'

  const liveCounts = useDb((view) => getSellerTabCounts(view, sellerId), [sellerId])
  const seller = useDb((view) => view.sellers.find((entry) => entry.id === sellerId), [sellerId])

  const query = useDemoQuery(
    (view) => {
      const all = getSellerShipments(view, sellerId, { tab, q, payment, due })
      const cutoffDays = PLACED_DAYS[placed]
      const today = toDayKey(DEMO_NOW)
      const rows =
        cutoffDays === null
          ? all
          : all.filter((row) => {
              const day = toDayKey(row.order.placedAt)
              if (cutoffDays === 0) return day === today
              return day >= toDayKey(new Date(DEMO_NOW).getTime() - cutoffDays * 86_400_000)
            })
      const defaults: Record<ID, PackDefault> = {}
      const skus: Record<ID, string> = {}
      for (const row of rows) {
        const first = row.items[0]
        const product = first ? view.productById.get(first.productId) : undefined
        defaults[row.shipment.id] = product
          ? { weightKg: product.weightKg, dimensionsCm: product.dimensionsCm }
          : { weightKg: 0.5, dimensionsCm: [20, 15, 8] }
        skus[row.shipment.id] = product?.variants.find((variant) => variant.id === first?.variantId)?.sku ?? ''
      }
      return { rows, defaults, skus }
    },
    [sellerId, tab, q, payment, due, placed],
  )

  // A forced empty state (?demo=empty) still returns real data; the screen must honour it —
  // tab counts included, or the tabs contradict the list they label.
  const empty = query.status === 'empty'
  const counts = empty
    ? (Object.fromEntries(Object.keys(liveCounts).map((key) => [key, 0])) as typeof liveCounts)
    : liveCounts
  const rows = empty ? [] : (query.data?.rows ?? [])
  const defaults = query.data?.defaults ?? {}
  const skus = query.data?.skus ?? {}
  const filtered = Boolean(q) || payment !== 'all' || due !== 'all' || placed !== 'all'
  const tabMeta = SELLER_ORDER_TABS.find((entry) => entry.id === tab)

  const clearFilters = () => {
    setQ('')
    setPayment('all')
    setDue('all')
    setPlaced('all')
  }

  const toLabelRow = (row: SellerShipmentRow): LabelRow => ({
    shipmentId: row.shipment.id,
    orderId: row.order.id,
    buyer: row.buyer,
    pin: row.buyerPin,
    items: itemSummary(row),
    amount: row.amount,
    prepaid: row.prepaid,
    ...(row.shipment.awb ? { awb: row.shipment.awb } : {}),
  })

  const openLabels = (list: SellerShipmentRow[]) => {
    setLabelRows(list.map(toLabelRow))
    setLabelsOpen(true)
  }

  const confirmOne = (row: SellerShipmentRow) => {
    const result = dbActions.confirmShipment(row.shipment.id)
    if (!result.ok) {
      toast.error('Could not confirm this order', { description: result.error })
      return
    }
    toast.success('Order confirmed', { description: `${row.shipment.id} · ${formatDueIn(row.dueAt)} to dispatch.` })
  }

  const handOverOne = (row: SellerShipmentRow) => {
    const result = dbActions.handOverShipment(row.shipment.id)
    if (!result.ok) {
      toast.error('Could not hand this order over', { description: result.error })
      return
    }
    toast.success('Handed over to DemoShip', { description: `${row.shipment.id} · the AWB is on the order.` })
  }

  const bulkConfirm = (ids: string[], clear: () => void) => {
    const targets = rows.filter((row) => ids.includes(row.shipment.id) && row.shipment.status === 'placed')
    const skipped = ids.length - targets.length
    if (targets.length === 0) {
      toast.message('Nothing to confirm', { description: 'None of the orders you selected are waiting to be confirmed.' })
      return
    }
    targets.forEach((row) => dbActions.confirmShipment(row.shipment.id))
    clear()
    toast.success(`${targets.length} ${targets.length === 1 ? 'order' : 'orders'} confirmed`, {
      description: skipped > 0 ? `${skipped} skipped — they had already been confirmed.` : 'Pack them before the dispatch deadline.',
    })
  }

  const bulkPack = (ids: string[], clear: () => void) => {
    const targets = rows.filter((row) => ids.includes(row.shipment.id) && row.shipment.status === 'confirmed')
    const skipped = ids.length - targets.length
    if (targets.length === 0) {
      toast.message('Nothing to pack', { description: 'Confirm an order before you mark it as packed.' })
      return
    }
    targets.forEach((row) => {
      const pack = defaults[row.shipment.id] ?? { weightKg: 0.5, dimensionsCm: [20, 15, 8] as [number, number, number] }
      dbActions.packShipment(row.shipment.id, pack)
    })
    clear()
    toast.success(`${targets.length} ${targets.length === 1 ? 'order' : 'orders'} marked as packed`, {
      description: skipped > 0 ? `${skipped} skipped — they were not confirmed yet.` : 'Weights came from each listing. Edit one from its order page if it differs.',
    })
  }

  const csvHeaders = ['Order', 'Customer order', 'Placed', 'Items', 'Units', 'Buyer', 'PIN code', 'Payment', 'Amount', 'Dispatch by', 'Status'] as const
  const csvRow = (row: SellerShipmentRow) => [
    row.shipment.id,
    row.order.id,
    formatDate(row.order.placedAt),
    itemSummary(row),
    row.units,
    row.buyer,
    row.buyerPin,
    row.prepaid ? 'Prepaid' : 'Cash on delivery',
    row.amount,
    formatDate(row.dueAt),
    row.shipment.status,
  ]

  const columns: Column<SellerShipmentRow>[] = [
    {
      id: 'order',
      header: 'Order',
      width: 'md',
      mobile: 'title',
      sortValue: (row) => row.shipment.id,
      cell: (row) => (
        <span className="flex flex-col">
          <span className="type-code whitespace-nowrap">{row.shipment.id}</span>
          <span className="type-caption font-normal whitespace-nowrap text-fg-muted">
            Placed {formatRelative(row.order.placedAt)}
          </span>
        </span>
      ),
    },
    {
      id: 'items',
      header: 'Items',
      width: 'lg',
      mobile: 'subtitle',
      cell: (row) => {
        const first = row.items[0]
        return (
          <span className="flex items-center gap-2.5">
            {first ? (
              <Img image={first.image} alt="" ratio="square" width={40} className="size-10 shrink-0 overflow-hidden rounded-thumb" />
            ) : null}
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{itemSummary(row)}</span>
              <span className="type-caption text-fg-muted">
                {skus[row.shipment.id] ? `${skus[row.shipment.id]} · ` : ''}
                {formatNumber(row.units)} {row.units === 1 ? 'unit' : 'units'}
              </span>
            </span>
          </span>
        )
      },
    },
    {
      id: 'buyer',
      header: 'Buyer',
      hideBelow: 'xl',
      hideable: true,
      sortValue: (row) => row.buyer,
      cell: (row) => (
        <span className="flex flex-col">
          <span className="truncate">{row.buyer}</span>
          <span className="type-caption text-fg-muted tabular">{row.buyerPin}</span>
        </span>
      ),
    },
    {
      id: 'payment',
      header: 'Payment',
      hideBelow: 'lg',
      hideable: true,
      sortValue: (row) => (row.prepaid ? 'Prepaid' : 'COD'),
      cell: (row) =>
        row.prepaid ? (
          <Badge tone="neutral" size="sm">Prepaid</Badge>
        ) : (
          <Badge tone="info" size="sm">Cash on delivery</Badge>
        ),
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'end',
      mobile: 'meta',
      sortValue: (row) => row.amount,
      cell: (row) => formatINR(row.amount),
    },
    {
      id: 'due',
      header: 'Dispatch by',
      align: 'end',
      mobile: 'meta',
      sortValue: (row) => row.dueAt,
      cell: (row) =>
        row.action ? (
          <span className={row.overdue ? 'whitespace-nowrap font-semibold text-danger-subtle-fg' : 'whitespace-nowrap text-fg'}>
            {formatDueIn(row.dueAt)}
          </span>
        ) : (
          <span className="whitespace-nowrap text-fg-subtle">—</span>
        ),
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      sortValue: (row) => row.shipment.status,
      cell: (row) => (
        <span className="flex flex-col items-start gap-1">
          <StatusBadge domain="shipment" status={row.shipment.status} size="sm" withTooltip />
          {row.return ? <StatusBadge domain="return" status={row.return.status} size="sm" /> : null}
        </span>
      ),
    },
    {
      id: 'next',
      header: <span className="sr-only">Next action</span>,
      align: 'end',
      width: 'sm',
      mobile: 'action',
      cell: (row) => {
        if (row.shipment.status === 'placed') {
          return (
            <Button size="sm" onClick={() => confirmOne(row)}>
              Confirm
            </Button>
          )
        }
        if (row.shipment.status === 'confirmed') {
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPackTarget({ shipmentId: row.shipment.id, ...(defaults[row.shipment.id] ?? { weightKg: 0.5, dimensionsCm: [20, 15, 8] }) })}
            >
              Mark as packed
            </Button>
          )
        }
        if (row.shipment.status === 'packed') {
          return (
            <Button size="sm" variant="outline" onClick={() => handOverOne(row)}>
              Hand over
            </Button>
          )
        }
        return (
          <Button size="sm" variant="ghost" asChild>
            <Link to={`/seller/orders/${row.shipment.id}`}>View</Link>
          </Button>
        )
      },
    },
  ]

  return (
    <>
      <PageHeader
        title="Orders"
        description="One row per shipment — the parcel you actually pack. Deadlines are shown in words."
        meta={
          seller ? (
            <>
              <span>{formatNumber(counts.new)} to confirm</span>
              <span>{formatNumber(counts.to_pack)} to pack</span>
              <span>Ships from {seller.city}</span>
            </>
          ) : null
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Printer aria-hidden />}
            disabled={rows.length === 0}
            onClick={() => openLabels(rows.filter((row) => row.shipment.status === 'confirmed' || row.shipment.status === 'packed'))}
          >
            Print labels
          </Button>
        }
      >
        <Tabs
          aria-label="Order stage"
          value={tab}
          onValueChange={(value) => setTab(value as SellerOrderTabId)}
          items={SELLER_ORDER_TABS.map((entry) => ({ value: entry.id, label: entry.label, count: counts[entry.id] }))}
        />
      </PageHeader>

      <DataTable
        tableId="seller-orders"
        caption="Orders to fulfil, by stage"
        data={rows}
        columns={columns}
        getRowId={(row) => row.shipment.id}
        rowHref={(row) => `/seller/orders/${row.shipment.id}`}
        loading={query.status === 'loading'}
        initialSort={{ id: 'due', dir: 'asc' }}
        selectable
        bulkActions={(ids, clear) => {
          const selected = rows.filter((row) => ids.includes(row.shipment.id))
          return (
            <>
              <Button size="sm" variant="outline" leftIcon={<CircleCheck aria-hidden />} onClick={() => bulkConfirm(ids, clear)}>
                Confirm
              </Button>
              <Button size="sm" variant="outline" leftIcon={<Package aria-hidden />} onClick={() => bulkPack(ids, clear)}>
                Mark as packed
              </Button>
              <Button size="sm" variant="outline" leftIcon={<Printer aria-hidden />} onClick={() => openLabels(selected)}>
                Print labels
              </Button>
              <ExportButton
                filename={`chowk-manifest-${toDayKey(DEMO_NOW)}`}
                label="Download manifest"
                headers={csvHeaders}
                rows={() => selected.map(csvRow)}
              />
            </>
          )
        }}
        toolbar={
          <FilterBar
            search={{ value: q, onChange: setQ, placeholder: 'Search order id, product or buyer' }}
            facets={[
              {
                id: 'payment',
                label: 'Payment',
                single: true,
                selected: payment === 'all' ? [] : [payment],
                onChange: (selected) => setPayment((selected[0] as PaymentFilter) ?? 'all'),
                options: [
                  { value: 'prepaid', label: 'Prepaid' },
                  { value: 'cod', label: 'Cash on delivery' },
                ],
              },
              {
                id: 'due',
                label: 'Deadline',
                single: true,
                selected: due === 'all' ? [] : [due],
                onChange: (selected) => setDue(selected[0] ?? 'all'),
                options: [
                  { value: 'due_today', label: 'Due today' },
                  { value: 'overdue', label: 'Overdue' },
                ],
              },
              {
                id: 'placed',
                label: 'Placed',
                single: true,
                selected: placed === 'all' ? [] : [placed],
                onChange: (selected) => setPlaced((selected[0] as PlacedFilter) ?? 'all'),
                options: [
                  { value: 'today', label: 'Today' },
                  { value: '7d', label: 'Last 7 days' },
                  { value: '30d', label: 'Last 30 days' },
                ],
              },
            ]}
            onReset={clearFilters}
            actions={<ExportButton filename="chowk-seller-orders" headers={csvHeaders} rows={() => rows.map(csvRow)} />}
          />
        }
        empty={
          query.status === 'error' ? (
            <EmptyState
              icon={<TriangleAlert aria-hidden />}
              title="We couldn’t load your orders"
              description="The list didn’t come back. Try again."
              action={<Button onClick={query.retry}>Retry</Button>}
            />
          ) : filtered ? (
            <EmptyState
              icon={<Truck aria-hidden />}
              title="No orders match these filters"
              description="Try a different search, or clear the filters to see the whole stage."
              action={
                <Button size="sm" variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : counts.new + counts.to_pack + counts.ready_to_ship + counts.in_transit + counts.delivered + counts.cancelled === 0 ? (
            <EmptyState
              icon={<Truck aria-hidden />}
              title="No orders yet"
              description="When shoppers buy your products, new orders appear here for you to confirm and pack."
              action={
                <Button size="sm" variant="outline" asChild>
                  <Link to="/seller/products">Check your listings</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<PackageCheck aria-hidden />}
              title={tabMeta?.emptyLine ?? 'Nothing here right now'}
              description="You’re all caught up. Anything new lands in this tab automatically."
              action={
                // Never point at the tab the reader is already on.
                tab === 'new' ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/seller">Back to dashboard</Link>
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setTab('new')}>
                    Go to new orders
                  </Button>
                )
              }
            />
          )
        }
      />

      <p className="flex items-start gap-2 type-caption text-fg-muted">
        <FileText aria-hidden className="mt-px size-3.5 shrink-0" />
        Select orders to confirm, pack, print labels or download the courier manifest in one go.
      </p>

      <PackDialog target={packTarget} onClose={() => setPackTarget(null)} />
      <LabelDialog
        rows={labelRows}
        open={labelsOpen}
        onOpenChange={setLabelsOpen}
        from={seller ? `${seller.displayName}, ${seller.pickupAddress.line1}, ${seller.city} ${seller.pickupAddress.pin}` : 'Your pickup address'}
      />
    </>
  )
}
