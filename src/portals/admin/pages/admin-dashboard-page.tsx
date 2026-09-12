import { ArrowRight, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import {
  getAdminKpis,
  getCategoryShare,
  getNeedsAttention,
  getOrdersByStatus,
  getPaymentMix,
  getPlatformSeries,
  getRecentOrders,
  getTopRegions,
  getTopSellers,
  useDemoQuery,
  type DateRange,
  type RangePreset,
} from '@/data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { BarBreakdownChart } from '@/components/charts/bar-chart'
import { STATUS_TONE_COLOR } from '@/components/charts/chart-theme'
import { ChartCard } from '@/components/charts/chart-card'
import { DonutChart } from '@/components/charts/donut-chart'
import { TrendChart } from '@/components/charts/trend-chart'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { KpiStrip } from '@/components/dashboard/kpi-strip'
import { rangeFromPreset } from '@/lib/date'
import { formatDayMonth, formatINR, formatINRCompact, formatNumber, formatRelative } from '@/lib/format'
import { PAYMENT_METHOD_META, statusMeta } from '@/lib/status'
import { useUiStore } from '@/stores/ui'

/** Marketplace health, and the queues that need clearing today. */
export default function AdminDashboardPage() {
  const preset = useUiStore((state) => state.rangePreset.admin)
  const setPreset = useUiStore((state) => state.setRangePreset)
  const [range, setRange] = useState<DateRange>(() => rangeFromPreset((preset as RangePreset) ?? '30d'))
  const [compare, setCompare] = useState(true)

  const dash = useDemoQuery(
    (view) => ({
      kpis: getAdminKpis(view, range),
      series: getPlatformSeries(view, range, compare),
      attention: getNeedsAttention(view),
      byStatus: getOrdersByStatus(view, range),
      payments: getPaymentMix(view, range),
      categories: getCategoryShare(view, range),
      sellers: getTopSellers(view, range, 5),
      regions: getTopRegions(view, range, 5),
      recent: getRecentOrders(view, 6),
    }),
    [range.from, range.to, compare],
  )

  const loading = dash.status === 'loading'
  const data = dash.data

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="How the marketplace is doing, and what needs a decision today."
        actions={
          <DateRangePicker
            value={range}
            onChange={(next) => {
              setRange(next)
              if (next.preset) setPreset('admin', next.preset)
            }}
            compare={compare}
            onCompareChange={setCompare}
          />
        }
      />

      {dash.status === 'error' ? (
        <EmptyState
          icon={<TriangleAlert aria-hidden />}
          title="We couldn’t load the dashboard"
          description="The numbers didn’t come back. Try again."
          action={<Button onClick={dash.retry}>Retry</Button>}
        />
      ) : (
        <>
          <KpiStrip kpis={data?.kpis ?? []} loading={loading} />

          <div className="grid gap-4 xl:grid-cols-3">
            <ChartCard
              title="GMV and orders"
              description={compare ? 'Solid is this period; dashed is the one before it.' : undefined}
              height="lg"
              loading={loading}
              className="xl:col-span-2"
              empty={data && data.series.length === 0 ? <p className="type-body text-fg-muted">No orders in this range.</p> : undefined}
              tableView={
                data ? (
                  <table className="w-full text-left type-caption">
                    <thead className="text-fg-muted">
                      <tr>
                        <th scope="col" className="py-1 pr-3 font-medium">Day</th>
                        <th scope="col" className="py-1 pr-3 text-right font-medium">GMV</th>
                        <th scope="col" className="py-1 text-right font-medium">Orders</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.series.map((point) => (
                        <tr key={String(point.day)} className="border-t border-border-subtle">
                          <td className="py-1 pr-3">{formatDayMonth(String(point.day))}</td>
                          <td className="py-1 pr-3 text-right tabular">{formatINR(Number(point.gmv))}</td>
                          <td className="py-1 text-right tabular">{formatNumber(Number(point.orders))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : undefined
              }
            >
              <TrendChart
                data={data?.series ?? []}
                xKey="day"
                series={[{ key: 'gmv', label: 'GMV', slot: 1, format: (value) => formatINR(value) }]}
                compareKey={compare ? 'previousGmv' : undefined}
                formatX={(value) => formatDayMonth(String(value))}
                formatY={(value) => formatINRCompact(value)}
              />
            </ChartCard>

            <SectionCard
              title="Needs attention"
              description="Queues waiting on the marketplace team."
              className="xl:col-span-1"
              flush
            >
              <ul className="divide-y divide-border-subtle">
                {(data?.attention ?? []).map((item) => (
                  <li key={item.id}>
                    <Link
                      to={item.href}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-5"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Badge tone={item.tone === 'neutral' ? 'neutral' : item.tone} variant="subtle" size="sm">
                          {item.count}
                        </Badge>
                        <span className="min-w-0 truncate type-body text-fg">{item.label}</span>
                      </span>
                      <ArrowRight aria-hidden className="size-4 shrink-0 text-fg-subtle" />
                    </Link>
                  </li>
                ))}
                {!loading && data?.attention.length === 0 ? (
                  <li>
                    <EmptyState
                      variant="compact"
                      title="Nothing needs attention"
                      description="Every queue is clear. New work will appear here."
                    />
                  </li>
                ) : null}
              </ul>
            </SectionCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="Shipments by status" description="Click a bar to open that queue." loading={loading}>
              <BarBreakdownChart
                data={(data?.byStatus ?? []).map((row) => ({
                  status: statusMeta('shipment', row.status).label,
                  count: row.count,
                }))}
                categoryKey="status"
                series={[{ key: 'count', label: 'Shipments', slot: 2, format: (value) => formatNumber(value) }]}
                layout="vertical"
                // Statuses already own a colour — take it from the registry rather than
                // the categorical ramp, which has six slots for seven statuses.
                cellColors={(data?.byStatus ?? []).map((row) => STATUS_TONE_COLOR[statusMeta('shipment', row.status).tone])}
                formatValue={(value) => formatNumber(value)}
              />
            </ChartCard>

            <ChartCard
              title="Payment methods"
              description="Every payment attempt in this range, including the ones that failed."
              loading={loading}
            >
              <DonutChart
                data={(data?.payments ?? []).map((row) => ({
                  label: PAYMENT_METHOD_META[row.method].label,
                  value: row.orders,
                }))}
                centerValue={formatNumber((data?.payments ?? []).reduce((sum, row) => sum + row.orders, 0))}
                centerLabel="payments"
                formatValue={(value) => `${formatNumber(value)} payments`}
              />
            </ChartCard>

            <ChartCard title="Category share" description="GMV by top-level category." loading={loading}>
              <DonutChart
                data={(data?.categories ?? []).slice(0, 6).map((row) => ({ label: row.name, value: row.gmv }))}
                centerValue={formatINRCompact((data?.categories ?? []).reduce((sum, row) => sum + row.gmv, 0))}
                centerLabel="GMV"
                formatValue={(value) => formatINR(value)}
              />
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard title="Top sellers" actions={<Link to="/admin/sellers" className="type-caption text-link hover:underline">All sellers</Link>} flush>
              <ul className="divide-y divide-border-subtle">
                {(data?.sellers ?? []).map((row) => (
                  <li key={row.seller.id} className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
                    <Link to={`/admin/sellers/${row.seller.id}`} className="min-w-0 truncate type-body text-fg hover:text-primary hover:underline">
                      {row.seller.displayName}
                    </Link>
                    <span className="shrink-0 type-body text-fg tabular">{formatINRCompact(row.gmv)}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard title="Top regions" flush>
              <ul className="divide-y divide-border-subtle">
                {(data?.regions ?? []).map((row) => (
                  <li key={`${row.state}-${row.city}`} className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
                    <span className="min-w-0 truncate type-body text-fg">
                      {row.city}
                      <span className="text-fg-muted"> · {row.state}</span>
                    </span>
                    <span className="shrink-0 type-body text-fg tabular">{formatINRCompact(row.gmv)}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard
              title="Recent orders"
              actions={<Link to="/admin/orders" className="type-caption text-link hover:underline">All orders</Link>}
              flush
            >
              <ul className="divide-y divide-border-subtle">
                {(data?.recent ?? []).map((row) => (
                  <li key={row.order.id} className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
                    <span className="flex min-w-0 flex-col">
                      <Link to={`/admin/orders/${row.order.id}`} className="type-body text-fg hover:text-primary hover:underline">
                        {row.order.id}
                      </Link>
                      <span className="type-caption text-fg-muted">
                        {row.customer?.name ?? 'Shopper'} · {formatRelative(row.order.placedAt)}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="type-body text-fg tabular">{formatINR(row.order.totals.total)}</span>
                      {row.shipments[0] ? (
                        <StatusBadge domain="shipment" status={row.shipments[0].status} size="sm" withTooltip />
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>
        </>
      )}
    </>
  )
}
