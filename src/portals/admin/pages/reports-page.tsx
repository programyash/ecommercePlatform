import { CalendarClock, ChartColumn, Printer } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  DEMO_NOW,
  REPORTS,
  getReport,
  useDb,
  useDemoQuery,
  type DateRange,
  type RangePreset,
  type ReportColumn,
  type ReportId,
} from '@/data'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/card'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Select } from '@/components/ui/select'
import { BarBreakdownChart } from '@/components/charts/bar-chart'
import { ChartCard } from '@/components/charts/chart-card'
import { TrendChart } from '@/components/charts/trend-chart'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { ExportButton } from '@/components/dashboard/export-button'
import { KpiStrip } from '@/components/dashboard/kpi-strip'
import { cn } from '@/lib/cn'
import { addDays, rangeFromPreset, rangeLength, weekdayIST } from '@/lib/date'
import { formatDate, formatDayMonth, formatINR, formatINRCompact, formatNumber, formatNumberCompact } from '@/lib/format'
import { useUrlState } from '@/lib/use-url-state'
import { useUiStore } from '@/stores/ui'
import { ReportTable, type ReportRow } from '../components/report-table'
import { LoadFailed } from '../components/record-states'

type Grain = 'day' | 'week' | 'month'

/** Which reports are a time series, what to plot, and which previous-period key to dash in. */
const TIME_REPORTS: Partial<Record<ReportId, { keys: string[]; compareFrom?: string }>> = {
  sales: { keys: ['gmv'], compareFrom: 'previousGmv' },
  orders: { keys: ['shipments', 'delivered', 'cancelled'] },
  shoppers: { keys: ['newCustomers', 'orders'], compareFrom: 'previousOrders' },
}

/** Categorical reports: which column labels the bars and which one they measure. */
const BAR_REPORTS: Partial<Record<ReportId, { category: string; value: string; label: string }>> = {
  sellers: { category: 'seller', value: 'gmv', label: 'GMV' },
  products: { category: 'product', value: 'revenue', label: 'Revenue' },
  payments: { category: 'method', value: 'value', label: 'Value' },
  tax: { category: 'state', value: 'total', label: 'Total GST' },
}

const MAX_DAILY_DAYS = 92
const BAR_LIMIT = 10

function isoOf(day: string): string {
  return `${day}T00:00:00+05:30`
}

function bucketOf(day: string, grain: Grain): { key: string; label: string } {
  if (grain === 'month') {
    const key = day.slice(0, 7)
    const parts = formatDate(isoOf(`${key}-01`)).split(' ')
    return { key, label: parts.slice(1).join(' ') }
  }
  if (grain === 'week') {
    const start = addDays(day, -weekdayIST(isoOf(day)))
    return { key: start, label: `Week of ${formatDayMonth(isoOf(start))}` }
  }
  return { key: day, label: day }
}

/** Sum the daily rows into weeks or months; the chart and the table read the same array. */
function group(rows: ReportRow[], columns: ReportColumn[], grain: Grain, compareFrom?: string): ReportRow[] {
  if (grain === 'day') return rows
  const numeric = columns.filter((column) => column.format !== 'text').map((column) => column.key)
  const buckets = new Map<string, ReportRow>()
  for (const row of rows) {
    const day = String(row['day'] ?? '')
    const bucket = bucketOf(day, grain)
    const current = buckets.get(bucket.key) ?? { day: bucket.label }
    for (const key of numeric) current[key] = Number(current[key] ?? 0) + Number(row[key] ?? 0)
    if (compareFrom) current[compareFrom] = Number(current[compareFrom] ?? 0) + Number(row[compareFrom] ?? 0)
    buckets.set(bucket.key, current)
  }
  return [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0])).map((entry) => entry[1])
}

/** A footer for reports whose selector does not ship one: the sum of the rows on screen. */
function totalsOfRows(rows: ReportRow[], columns: ReportColumn[]): ReportRow | undefined {
  if (rows.length === 0 || columns.length === 0) return undefined
  const footer: ReportRow = {}
  columns.forEach((column, index) => {
    if (index === 0) {
      footer[column.key] = 'Total'
    } else if (column.format === 'text' || column.format === 'percent') {
      footer[column.key] = ''
    } else {
      footer[column.key] = rows.reduce((sum, row) => sum + Number(row[column.key] ?? 0), 0)
    }
  })
  return footer
}

/** Seven reports, one shape: range, filters, KPIs, a chart, then the same numbers in a table. */
export default function AdminReportsPage() {
  const preset = useUiStore((state) => state.rangePreset.admin)
  const setPreset = useUiStore((state) => state.setRangePreset)
  const [report, setReport] = useUrlState<ReportId>('report', 'sales')
  const [grain, setGrain] = useUrlState<Grain>('grain', 'day')
  const [sellerId, setSellerId] = useUrlState<string>('seller', 'all')
  const [range, setRange] = useState<DateRange>(() => rangeFromPreset((preset as RangePreset) ?? '30d', DEMO_NOW))
  const [compare, setCompare] = useState(true)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [frequency, setFrequency] = useState('weekly')

  const sellers = useDb(
    (view) => [
      { value: 'all', label: 'All sellers' },
      ...view.sellers.map((seller) => ({ value: seller.id, label: seller.displayName })),
    ],
    [],
  )
  const admin = useDb((view) => view.admins[0], [])

  const query = useDemoQuery(
    (view) => getReport(view, report, range, sellerId === 'all' ? {} : { sellerId }),
    [report, range.from, range.to, sellerId],
  )

  const timeSpec = TIME_REPORTS[report]
  const barSpec = BAR_REPORTS[report]
  const tooLongForDaily = rangeLength(range) > MAX_DAILY_DAYS
  const effectiveGrain: Grain = timeSpec && grain === 'day' && tooLongForDaily ? 'week' : grain

  // `?demo=empty` forces the empty state even though a report object always comes back.
  const data = query.status === 'empty' ? undefined : query.data
  const seriesByDay = new Map<string, Record<string, number | string>>(
    (data?.series ?? []).map((point) => [String(point.day), point]),
  )
  const baseRows: ReportRow[] = (data?.rows ?? []).map((row) => {
    if (!timeSpec?.compareFrom) return row
    const point = seriesByDay.get(String(row['day'] ?? ''))
    return { ...row, [timeSpec.compareFrom]: Number(point?.[timeSpec.compareFrom] ?? 0) }
  })
  const rows = timeSpec ? group(baseRows, data?.columns ?? [], effectiveGrain, timeSpec.compareFrom) : baseRows
  const barRows = barSpec ? rows.slice(0, BAR_LIMIT) : []
  const tableTotals = data?.totals ?? totalsOfRows(rows, data?.columns ?? [])

  const csvHeaders = (data?.columns ?? []).map((column) => column.label)
  const csvRows = () => rows.map((row) => (data?.columns ?? []).map((column) => row[column.key] ?? ''))

  const activeReport = REPORTS.find((entry) => entry.id === report) ?? REPORTS[0]
  const sellerName = sellers.find((entry) => entry.value === sellerId)?.label ?? 'All sellers'

  return (
    <>
      <PageHeader
        title="Reports"
        description="Answer a question, then take the numbers with you. Every table matches the chart above it."
        actions={
          <DateRangePicker
            value={range}
            onChange={(next) => {
              setRange(next)
              if (next.preset) setPreset('admin', next.preset)
            }}
            compare={compare}
            {...(timeSpec?.compareFrom ? { onCompareChange: setCompare } : {})}
          />
        }
      />

      <div className="grid gap-4 xl:grid-cols-12">
        {/* Sticky: the picker is far shorter than the report beside it, and following
            the page down would otherwise leave a tall empty column. */}
        <nav aria-label="Reports" className="hidden xl:col-span-3 xl:sticky xl:top-20 xl:block">
          <SectionCard title="Reports" flush>
            <ul className="flex flex-col p-2">
              {REPORTS.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => setReport(entry.id)}
                    aria-current={entry.id === report ? 'page' : undefined}
                    className={cn(
                      'flex w-full flex-col gap-0.5 rounded-control px-3 py-2.5 text-left transition-colors',
                      'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                      entry.id === report
                        ? 'bg-primary-subtle text-primary-subtle-fg'
                        : 'text-fg hover:bg-surface-2',
                    )}
                  >
                    <span className="type-label">{entry.title}</span>
                    <span className="type-caption text-fg-muted">{entry.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </SectionCard>
        </nav>

        <div className="flex flex-col gap-4 xl:col-span-9">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-64 xl:hidden">
              <Field label="Report">
                {({ id }) => (
                  <Select
                    id={id}
                    value={report}
                    onValueChange={(value) => setReport(value as ReportId)}
                    options={REPORTS.map((entry) => ({ value: entry.id, label: entry.title }))}
                  />
                )}
              </Field>
            </div>
            <div className="w-full sm:w-56">
              <Field label="Seller">
                {({ id }) => <Select id={id} value={sellerId} onValueChange={setSellerId} options={sellers} />}
              </Field>
            </div>
            {timeSpec ? (
              <SegmentedControl
                aria-label="Group by"
                value={grain}
                onValueChange={(value) => setGrain(value)}
                options={[
                  { value: 'day', label: 'Day' },
                  { value: 'week', label: 'Week' },
                  { value: 'month', label: 'Month' },
                ]}
              />
            ) : null}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <ExportButton filename={`chowk-${report}-report`} headers={csvHeaders} rows={csvRows} />
              <Button size="sm" variant="outline" leftIcon={<Printer aria-hidden />} onClick={() => window.print()}>
                Print
              </Button>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<CalendarClock aria-hidden />}
                onClick={() => setScheduleOpen(true)}
              >
                Schedule
              </Button>
            </div>
          </div>

          {timeSpec && grain === 'day' && tooLongForDaily ? (
            <p role="status" className="rounded-card border border-border bg-surface-2 px-4 py-2.5 type-body text-fg-muted">
              Range too long for daily — showing weekly.
            </p>
          ) : null}

          {query.status === 'error' ? (
            <LoadFailed title="We couldn’t build this report" onRetry={query.retry} />
          ) : (
            <>
              <KpiStrip kpis={data?.kpis ?? []} loading={query.status === 'loading'} showSparklines={false} />

              <ChartCard
                title={activeReport?.title ?? 'Report'}
                description={
                  barSpec
                    ? `Top ${Math.min(BAR_LIMIT, rows.length)} by ${barSpec.label.toLowerCase()} · ${sellerName}`
                    : `${sellerName} · ${compare && timeSpec?.compareFrom ? 'dashed is the previous period' : 'this period'}`
                }
                height="lg"
                loading={query.status === 'loading'}
                empty={
                  data && rows.length === 0 ? (
                    <EmptyState
                      variant="compact"
                      icon={<ChartColumn aria-hidden />}
                      title="No data in this range"
                      description="Widen the date range, or clear the seller filter."
                    />
                  ) : undefined
                }
              >
                {barSpec ? (
                  <BarBreakdownChart
                    data={barRows}
                    categoryKey={barSpec.category}
                    layout="vertical"
                    colorByCategory
                    series={[{ key: barSpec.value, label: barSpec.label, slot: 1, format: (value) => formatINR(value) }]}
                    formatValue={(value) => formatINRCompact(value)}
                  />
                ) : (
                  <TrendChart
                    data={rows}
                    xKey="day"
                    kind={timeSpec && timeSpec.keys.length > 1 ? 'line' : 'area'}
                    series={(timeSpec?.keys ?? []).map((key, index) => ({
                      key,
                      label: data?.columns.find((column) => column.key === key)?.label ?? key,
                      slot: ((index % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6,
                      format: (value) =>
                        data?.columns.find((column) => column.key === key)?.format === 'inr'
                          ? formatINR(value)
                          : formatNumber(value),
                    }))}
                    {...(compare && timeSpec?.compareFrom ? { compareKey: timeSpec.compareFrom } : {})}
                    formatX={(value) => (/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? formatDayMonth(isoOf(String(value))) : String(value))}
                    formatY={(value) =>
                      report === 'sales' ? formatINRCompact(value) : formatNumberCompact(value)
                    }
                  />
                )}
              </ChartCard>

              {query.status === 'loading' ? null : rows.length === 0 ? (
                <EmptyState
                  icon={<ChartColumn aria-hidden />}
                  title="No rows to show"
                  description="Nothing was recorded in this date range. Try a wider range, or a different seller."
                />
              ) : (
                <ReportTable
                  caption={`${activeReport?.title ?? 'Report'} — ${sellerName}`}
                  columns={data?.columns ?? []}
                  rows={rows}
                  {...(tableTotals ? { totals: tableTotals } : {})}
                />
              )}
            </>
          )}
        </div>
      </div>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent
          title="Schedule this report"
          description="A mock in this sample — nothing is emailed."
          footer={
            <>
              <Button variant="outline" onClick={() => setScheduleOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setScheduleOpen(false)
                  toast.success('Report scheduled', {
                    description: `${activeReport?.title ?? 'Report'} · ${frequency} to ${admin?.email ?? 'the marketplace team'}. This sample does not send email.`,
                  })
                }}
              >
                Schedule report
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Field label="How often">
              {({ id }) => (
                <Select
                  id={id}
                  value={frequency}
                  onValueChange={setFrequency}
                  options={[
                    { value: 'daily', label: 'Every morning' },
                    { value: 'weekly', label: 'Every Monday' },
                    { value: 'monthly', label: 'On the 1st of the month' },
                  ]}
                />
              )}
            </Field>
            <div className="flex flex-col gap-1">
              <p className="type-label text-fg">Send to</p>
              <p className="type-body text-fg">{admin?.email ?? 'the marketplace team'}</p>
              <p className="type-caption text-fg-muted">Scheduled reports go to the signed-in staff account.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
