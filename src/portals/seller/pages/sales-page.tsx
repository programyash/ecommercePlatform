import { ChartLine, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import {
  getCategoryPath,
  getSellerKpis,
  getSellerSeries,
  getSellerShipments,
  getSellerTopProducts,
  productStock,
  useDemoQuery,
  useSession,
  type DateRange,
  type Product,
} from '@/data'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { BarBreakdownChart } from '@/components/charts/bar-chart'
import { ChartCard } from '@/components/charts/chart-card'
import { DonutChart } from '@/components/charts/donut-chart'
import { TrendChart } from '@/components/charts/trend-chart'
import { DataTable, type Column } from '@/components/dashboard/data-table'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { ExportButton } from '@/components/dashboard/export-button'
import { KpiStrip } from '@/components/dashboard/kpi-strip'
import { isDayWithin, rangeFromPreset } from '@/lib/date'
import { formatDate, formatDayMonth, formatINR, formatINRCompact, formatNumber } from '@/lib/format'
import { statusMeta } from '@/lib/status'

type Metric = 'gmv' | 'orders' | 'units'

const METRIC_LABEL: Record<Metric, string> = { gmv: 'Net sales', orders: 'Orders', units: 'Units' }
const METRIC_COMPARE: Record<Metric, string | undefined> = { gmv: 'previousGmv', orders: 'previousOrders', units: undefined }

interface ProductRow {
  product: Product
  units: number
  revenue: number
  stock: number
}

/** The report layout, scoped to one store: KPIs, a chart, then the same numbers as a table. */
export default function SellerSalesPage() {
  const sellerId = useSession((state) => state.sellerId)
  const [range, setRange] = useState<DateRange>(() => rangeFromPreset('30d'))
  const [compare, setCompare] = useState(true)
  const [metric, setMetric] = useState<Metric>('gmv')

  const query = useDemoQuery(
    (view) => {
      const kpis = getSellerKpis(view, sellerId, range)
      const series = getSellerSeries(view, sellerId, range, compare)
      const top = getSellerTopProducts(view, sellerId, range, 50)

      const byStatus = new Map<string, number>()
      const byCategory = new Map<string, number>()
      for (const row of getSellerShipments(view, sellerId)) {
        if (!isDayWithin(row.order.placedAt, range)) continue
        byStatus.set(row.shipment.status, (byStatus.get(row.shipment.status) ?? 0) + 1)
        if (row.shipment.status === 'cancelled') continue
        for (const item of row.items) {
          const product = view.productById.get(item.productId)
          const root = product ? getCategoryPath(view, product.categoryId)[0] : undefined
          const name = root?.name ?? 'Other'
          byCategory.set(name, (byCategory.get(name) ?? 0) + item.price * item.qty)
        }
      }

      return {
        kpis,
        series,
        products: top.map((row) => ({ ...row, stock: productStock(row.product) })),
        status: [...byStatus.entries()].map(([status, count]) => ({ status, count })),
        categories: [...byCategory.entries()]
          .map(([name, gmv]) => ({ name, gmv: Math.round(gmv) }))
          .sort((a, b) => b.gmv - a.gmv)
          .slice(0, 6),
      }
    },
    [sellerId, range.from, range.to, compare],
  )

  // A forced empty state (?demo=empty) still returns real data; the screen must honour it.
  const data = query.status === 'empty' ? undefined : query.data
  const loading = query.status === 'loading'
  const compareKey = compare ? METRIC_COMPARE[metric] : undefined
  const totals = (data?.series ?? []).reduce(
    (sum, point) => ({
      gmv: sum.gmv + Number(point.gmv),
      orders: sum.orders + Number(point.orders),
      units: sum.units + Number(point.units),
    }),
    { gmv: 0, orders: 0, units: 0 },
  )

  const dayHeaders = ['Day', 'Net sales', 'Orders', 'Units'] as const
  const dayRows = () => (data?.series ?? []).map((point) => [formatDate(`${String(point.day)}T00:00:00+05:30`), Number(point.gmv), Number(point.orders), Number(point.units)])

  const productColumns: Column<ProductRow>[] = [
    {
      id: 'title',
      header: 'Product',
      mobile: 'title',
      width: 'lg',
      sortValue: (row) => row.product.title,
      cell: (row) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate">{row.product.title}</span>
          <span className="type-caption text-fg-muted">{row.product.brand}</span>
        </span>
      ),
    },
    {
      id: 'units',
      header: 'Units',
      align: 'end',
      mobile: 'meta',
      sortValue: (row) => row.units,
      cell: (row) => formatNumber(row.units),
    },
    {
      id: 'revenue',
      header: 'Net sales',
      align: 'end',
      mobile: 'meta',
      sortValue: (row) => row.revenue,
      cell: (row) => formatINR(row.revenue),
    },
    {
      id: 'aov',
      header: 'Per unit',
      align: 'end',
      hideBelow: 'lg',
      hideable: true,
      sortValue: (row) => (row.units > 0 ? row.revenue / row.units : 0),
      cell: (row) => formatINR(row.units > 0 ? Math.round(row.revenue / row.units) : 0),
    },
    {
      id: 'stock',
      header: 'In stock',
      align: 'end',
      hideBelow: 'lg',
      hideable: true,
      sortValue: (row) => row.stock,
      cell: (row) => formatNumber(row.stock),
    },
  ]

  if (query.status === 'error') {
    return (
      <>
        <PageHeader title="Sales" description="How your store is doing, in the same numbers Chowk settles on." />
        <EmptyState
          icon={<TriangleAlert aria-hidden />}
          title="We couldn’t load your sales"
          description="The report didn’t come back. Try again."
          action={<Button onClick={query.retry}>Retry</Button>}
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Sales"
        description="How your store is doing, in the same numbers Chowk settles on. Cancelled orders are excluded."
        meta={
          <>
            <span>{formatINR(totals.gmv)} net sales</span>
            <span>{formatNumber(totals.orders)} orders</span>
            <span>{formatNumber(totals.units)} units</span>
          </>
        }
        actions={
          <>
            <ExportButton filename="chowk-seller-sales" label="Export CSV" headers={dayHeaders} rows={dayRows} />
            <DateRangePicker value={range} onChange={setRange} compare={compare} onCompareChange={setCompare} />
          </>
        }
      />

      <KpiStrip kpis={data?.kpis ?? []} loading={loading} />

      <ChartCard
        title={`${METRIC_LABEL[metric]} over time`}
        description={compare && compareKey ? 'Solid is this period; dashed is the one before it.' : 'One measure at a time — the scales are not comparable.'}
        height="lg"
        loading={loading}
        actions={
          <SegmentedControl
            aria-label="Measure"
            size="sm"
            value={metric}
            onValueChange={setMetric}
            options={[
              { value: 'gmv', label: 'Sales' },
              { value: 'orders', label: 'Orders' },
              { value: 'units', label: 'Units' },
            ]}
          />
        }
        empty={data && data.series.length === 0 ? <p className="type-body text-fg-muted">No orders in this range.</p> : undefined}
        tableView={
          data ? (
            <table className="w-full text-left type-caption">
              <caption className="sr-only">Net sales, orders and units by day</caption>
              <thead className="text-fg-muted">
                <tr>
                  <th scope="col" className="py-1 pr-3 font-medium">Day</th>
                  <th scope="col" className="py-1 pr-3 text-right font-medium">Net sales</th>
                  <th scope="col" className="py-1 pr-3 text-right font-medium">Orders</th>
                  <th scope="col" className="py-1 text-right font-medium">Units</th>
                </tr>
              </thead>
              <tbody>
                {data.series.map((point) => (
                  <tr key={String(point.day)} className="border-t border-border-subtle">
                    <td className="py-1 pr-3">{formatDayMonth(String(point.day))}</td>
                    <td className="py-1 pr-3 text-right tabular">{formatINR(Number(point.gmv))}</td>
                    <td className="py-1 pr-3 text-right tabular">{formatNumber(Number(point.orders))}</td>
                    <td className="py-1 text-right tabular">{formatNumber(Number(point.units))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border font-semibold text-fg">
                  <th scope="row" className="py-1 pr-3 text-left">Total</th>
                  <td className="py-1 pr-3 text-right tabular">{formatINR(totals.gmv)}</td>
                  <td className="py-1 pr-3 text-right tabular">{formatNumber(totals.orders)}</td>
                  <td className="py-1 text-right tabular">{formatNumber(totals.units)}</td>
                </tr>
              </tfoot>
            </table>
          ) : undefined
        }
      >
        <TrendChart
          data={data?.series ?? []}
          xKey="day"
          series={[
            {
              key: metric,
              label: METRIC_LABEL[metric],
              slot: 1,
              format: (value) => (metric === 'gmv' ? formatINR(value) : formatNumber(value)),
            },
          ]}
          compareKey={compareKey}
          formatX={(value) => formatDayMonth(String(value))}
          formatY={(value) => (metric === 'gmv' ? formatINRCompact(value) : formatNumber(value))}
        />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Orders by status"
          description="Where this range’s orders ended up."
          loading={loading}
          empty={data && data.status.length === 0 ? <p className="type-body text-fg-muted">No orders in this range.</p> : undefined}
        >
          <BarBreakdownChart
            data={(data?.status ?? []).map((row) => ({ status: statusMeta('shipment', row.status).label, count: row.count }))}
            categoryKey="status"
            series={[{ key: 'count', label: 'Orders', slot: 2, format: (value) => formatNumber(value) }]}
            layout="vertical"
            colorByCategory
            formatValue={(value) => formatNumber(value)}
          />
        </ChartCard>

        <ChartCard
          title="Category share"
          description="Net sales by top-level category."
          loading={loading}
          empty={data && data.categories.length === 0 ? <p className="type-body text-fg-muted">No sales in this range.</p> : undefined}
        >
          <DonutChart
            data={(data?.categories ?? []).map((row) => ({ label: row.name, value: row.gmv }))}
            centerValue={formatINRCompact((data?.categories ?? []).reduce((sum, row) => sum + row.gmv, 0))}
            centerLabel="net sales"
            formatValue={(value) => formatINR(value)}
          />
        </ChartCard>
      </div>

      <DataTable
        tableId="seller-sales-products"
        caption="Products sold in the selected range"
        data={data?.products ?? []}
        columns={productColumns}
        getRowId={(row) => row.product.id}
        rowHref={(row) => `/seller/products/${row.product.id}/edit`}
        loading={loading}
        initialSort={{ id: 'revenue', dir: 'desc' }}
        toolbar={
          <div className="flex min-w-0 flex-col">
            <h2 className="type-title text-fg">Products in this range</h2>
            <p className="type-caption text-fg-muted">
              {formatDate(`${range.from}T00:00:00+05:30`)} to {formatDate(`${range.to}T00:00:00+05:30`)} · sorted by net sales
            </p>
          </div>
        }
        empty={
          <EmptyState
            icon={<ChartLine aria-hidden />}
            title="Nothing sold in this range"
            description="Widen the date range, or check that your listings are live and in stock."
            action={
              <Button size="sm" variant="outline" asChild>
                <Link to="/seller/products">Check your listings</Link>
              </Button>
            }
          />
        }
      />
    </>
  )
}
