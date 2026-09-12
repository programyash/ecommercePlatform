import { ArrowRight, Package, Plus, Store, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import {
  DEMO_NOW,
  getNextPayout,
  getSellerActionItems,
  getSellerKpis,
  getSellerProducts,
  getSellerRatingSummary,
  getSellerSeries,
  getSellerShipments,
  getSellerTopProducts,
  productStockStatus,
  useDb,
  useDemoQuery,
  useSession,
  type DateRange,
  type RangePreset,
} from '@/data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { StatusBadge } from '@/components/ui/status-badge'
import { RatingSummary } from '@/components/commerce/rating-summary'
import { ChartCard } from '@/components/charts/chart-card'
import { TrendChart } from '@/components/charts/trend-chart'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { KpiStrip } from '@/components/dashboard/kpi-strip'
import { hourOfDayIST, rangeFromPreset } from '@/lib/date'
import { formatDayMonth, formatDayShort, formatDueIn, formatINR, formatINRCompact, formatNumber, formatRelative } from '@/lib/format'
import { useUrlState } from '@/lib/use-url-state'
import { useUiStore } from '@/stores/ui'
import { accountModeOf, isAccountMode, kycOutstanding } from '../components/account-mode'
import { AccountNotice, KycProgress, SetupChecklist, type SetupStep } from '../components/account-panels'

type Metric = 'gmv' | 'orders' | 'units'

const METRIC_LABEL: Record<Metric, string> = { gmv: 'Net sales', orders: 'Orders', units: 'Units' }
const METRIC_COMPARE: Record<Metric, string | undefined> = { gmv: 'previousGmv', orders: 'previousOrders', units: undefined }

function greeting(): string {
  const hour = hourOfDayIST(DEMO_NOW)
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/** Today's work first, then the numbers behind it. */
export default function SellerDashboardPage() {
  const sellerId = useSession((state) => state.sellerId)
  const preset = useUiStore((state) => state.rangePreset.seller)
  const setPreset = useUiStore((state) => state.setRangePreset)
  const [range, setRange] = useState<DateRange>(() => rangeFromPreset((preset as RangePreset) ?? '30d'))
  const [compare, setCompare] = useState(true)
  const [metric, setMetric] = useState<Metric>('gmv')
  // Lets a reviewer see every account mode without editing the seed data.
  const [modeParam] = useUrlState<string>('account', '')

  const shell = useDb(
    (view) => {
      const seller = view.sellers.find((entry) => entry.id === sellerId)
      const products = getSellerProducts(view, sellerId)
      return {
        seller,
        productCount: products.length,
        drafts: products.filter((product) => product.status === 'draft' || product.status === 'rejected').slice(0, 5),
        liveCount: products.filter((product) => product.status === 'live').length,
      }
    },
    [sellerId],
  )

  const dash = useDemoQuery(
    (view) => ({
      kpis: getSellerKpis(view, sellerId, range),
      series: getSellerSeries(view, sellerId, range, compare),
      actions: getSellerActionItems(view, sellerId),
      top: getSellerTopProducts(view, sellerId, range, 5),
      recent: [...getSellerShipments(view, sellerId)]
        .sort((a, b) => (a.order.placedAt < b.order.placedAt ? 1 : -1))
        .slice(0, 6),
      queue: getSellerShipments(view, sellerId, { tab: 'new' }).concat(getSellerShipments(view, sellerId, { tab: 'to_pack' })).slice(0, 6),
      payout: getNextPayout(view, sellerId),
      rating: getSellerRatingSummary(view, sellerId),
    }),
    [sellerId, range.from, range.to, compare],
  )

  const seller = shell.seller
  const derivedMode = accountModeOf(seller, shell.productCount)
  const mode = isAccountMode(modeParam) ? modeParam : derivedMode
  const loading = dash.status === 'loading'
  // A forced empty state (?demo=empty) still returns real data; the screen must honour it.
  const data = dash.status === 'empty' ? undefined : dash.data

  const header = (
    <PageHeader
      title={seller ? `${greeting()}, ${seller.ownerName.split(' ')[0] ?? seller.displayName}` : 'Dashboard'}
      documentTitle="Dashboard"
      badge={seller ? <StatusBadge domain="seller" status={seller.status} /> : null}
      meta={
        seller ? (
          <>
            <span>{seller.displayName}</span>
            <span>{seller.city}</span>
            <span>Joined {formatDayShort(seller.joinedAt)}</span>
          </>
        ) : null
      }
      actions={
        <>
          {seller ? (
            <Button variant="outline" size="sm" leftIcon={<Store aria-hidden />} asChild>
              <Link to={`/store/${seller.slug}`}>View store</Link>
            </Button>
          ) : null}
          {mode === 'active' ? (
            <DateRangePicker
              value={range}
              onChange={(next) => {
                setRange(next)
                if (next.preset) setPreset('seller', next.preset)
              }}
              compare={compare}
              onCompareChange={setCompare}
            />
          ) : null}
        </>
      }
    />
  )

  if (!seller) {
    return (
      <>
        {header}
        <EmptyState
          icon={<TriangleAlert aria-hidden />}
          title="We couldn’t find your seller account"
          description="Sign in again, or pick a demo seller to explore Seller Hub."
          action={
            <Button asChild>
              <Link to="/seller/login">Sign in</Link>
            </Button>
          }
        />
      </>
    )
  }

  if (dash.status === 'error') {
    return (
      <>
        {header}
        <EmptyState
          icon={<TriangleAlert aria-hidden />}
          title="We couldn’t load your dashboard"
          description="The numbers didn’t come back. Try again."
          action={<Button onClick={dash.retry}>Retry</Button>}
        />
      </>
    )
  }

  // ── Locked accounts ─────────────────────────────────────────────────────
  if (mode !== 'active' && mode !== 'new') {
    const openOrders = data?.queue ?? []
    return (
      <>
        {header}
        <AccountNotice seller={seller} mode={mode} />

        <div className="grid gap-4 lg:grid-cols-2">
          <KycProgress seller={seller} />

          {mode === 'suspended' ? (
            <SectionCard
              title="Orders you still have to dispatch"
              description="Suspension hides your listings; orders placed before it must still be sent."
              flush
            >
              {openOrders.length === 0 ? (
                <EmptyState variant="compact" title="Nothing left to dispatch" description="Every open order has been handed over." />
              ) : (
                <ul className="divide-y divide-border-subtle">
                  {openOrders.map((row) => (
                    <li key={row.shipment.id}>
                      <Link
                        to={`/seller/orders/${row.shipment.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-5"
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="type-body text-fg">{row.shipment.id}</span>
                          <span className="type-caption text-fg-muted">{row.buyer}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className={row.overdue ? 'type-caption text-danger-subtle-fg' : 'type-caption text-fg-muted'}>
                            {formatDueIn(row.dueAt)}
                          </span>
                          <StatusBadge domain="shipment" status={row.shipment.status} size="sm" withTooltip />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          ) : (
            <SectionCard
              title="Drafts you can work on"
              description="Prepare listings now and submit them the moment your account is approved."
              actions={
                <Button size="sm" variant="outline" leftIcon={<Plus aria-hidden />} asChild>
                  <Link to="/seller/products/new">Add a product</Link>
                </Button>
              }
              flush
            >
              {shell.drafts.length === 0 ? (
                <EmptyState
                  variant="compact"
                  title="No drafts yet"
                  description="Start a listing now — you can save it as a draft while your account is checked."
                />
              ) : (
                <ul className="divide-y divide-border-subtle">
                  {shell.drafts.map((product) => (
                    <li key={product.id}>
                      <Link
                        to={`/seller/products/${product.id}/edit`}
                        className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-5"
                      >
                        <span className="min-w-0 truncate type-body text-fg">{product.title}</span>
                        <StatusBadge domain="listing" status={product.status} size="sm" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          )}
        </div>

        {mode === 'suspended' ? (
          <SectionCard title="Your listings are hidden">
            <p className="type-body text-fg-muted">
              {formatNumber(shell.liveCount)} {shell.liveCount === 1 ? 'listing is' : 'listings are'} hidden from shoppers while
              your account is suspended. They come back automatically once the marketplace team lifts the suspension — you do not
              have to relist anything.
            </p>
          </SectionCard>
        ) : null}
      </>
    )
  }

  // ── New seller ──────────────────────────────────────────────────────────
  if (mode === 'new') {
    const steps: SetupStep[] = [
      {
        id: 'verify',
        label: 'Finish verification',
        detail:
          kycOutstanding(seller.kyc).length === 0
            ? 'Every document has been checked.'
            : `${kycOutstanding(seller.kyc).length} documents still to clear.`,
        done: kycOutstanding(seller.kyc).length === 0,
        to: '/seller/profile?tab=business',
        cta: 'Open',
      },
      {
        id: 'pickup',
        label: 'Confirm your pickup address',
        detail: `${seller.pickupAddress.line1}, ${seller.city} ${seller.pickupAddress.pin}`,
        done: Boolean(seller.pickupAddress.pin),
        to: '/seller/profile?tab=pickup',
        cta: 'Check',
      },
      {
        id: 'bank',
        label: 'Add the account we pay into',
        detail: seller.bank.verified ? `${seller.bank.bankName} ····${seller.bank.last4}` : 'Waiting for the ₹1 test deposit to clear.',
        done: seller.bank.verified,
        to: '/seller/profile?tab=bank',
        cta: 'Open',
      },
      {
        id: 'product',
        label: 'List your first product',
        detail: 'Seven short sections. Most listings pass review first time.',
        done: shell.productCount > 0,
        to: '/seller/products/new',
        cta: 'Add product',
      },
    ]
    return (
      <>
        {header}
        <SetupChecklist steps={steps} />
        <div className="grid gap-4 lg:grid-cols-2">
          <KycProgress seller={seller} />
          <SectionCard title="How selling on Chowk works">
            <ol className="flex flex-col gap-3">
              {[
                'A shopper buys. The order lands in Orders as “New”, with a dispatch deadline in words.',
                'You confirm, pack and hand over to DemoShip. Labels and the manifest print from the same screen.',
                'Seven days after delivery the sale is settled, and the payout lands in your bank account on the next Tuesday.',
              ].map((line, index) => (
                <li key={line} className="flex gap-3">
                  <span
                    aria-hidden
                    className="grid size-6 shrink-0 place-items-center rounded-full border border-border bg-surface-2 text-2xs font-semibold text-fg-muted tabular"
                  >
                    {index + 1}
                  </span>
                  <span className="type-body text-fg-muted">{line}</span>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>
      </>
    )
  }

  // ── Trading ─────────────────────────────────────────────────────────────
  const payout = data?.payout
  const compareKey = compare ? METRIC_COMPARE[metric] : undefined

  return (
    <>
      {header}

      <KpiStrip kpis={data?.kpis ?? []} loading={loading} />

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard
          title="Action needed"
          description="Everything waiting on you right now. Each line opens that list, already filtered."
          className="xl:order-2 xl:col-span-1"
          flush
        >
          <ul className="divide-y divide-border-subtle">
            {(data?.actions ?? []).map((item) => (
              <li key={item.id}>
                <Link
                  to={item.href}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-5"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Badge tone={item.tone} variant="subtle" size="sm">
                      {item.count}
                    </Badge>
                    <span className="min-w-0 type-body text-fg">{item.label}</span>
                  </span>
                  <ArrowRight aria-hidden className="size-4 shrink-0 text-fg-subtle" />
                </Link>
              </li>
            ))}
            {!loading && data?.actions.length === 0 ? (
              <li>
                <EmptyState
                  variant="compact"
                  title="You’re all caught up"
                  description="Nothing to confirm, pack or reply to. New work appears here."
                />
              </li>
            ) : null}
          </ul>
        </SectionCard>

        <ChartCard
          title="Sales and orders"
          description={compare && compareKey ? 'Solid is this period; dashed is the one before it.' : 'One measure at a time — the scales are not comparable.'}
          height="lg"
          loading={loading}
          className="xl:order-1 xl:col-span-2"
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
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard
          title="Top products"
          description="Best sellers in this range."
          className="xl:col-span-2"
          actions={
            <Link to="/seller/products" className="type-caption text-link hover:underline">
              All products
            </Link>
          }
          bodyClassName="overflow-x-auto"
        >
          {(data?.top ?? []).length === 0 ? (
            <EmptyState
              variant="compact"
              icon={<Package aria-hidden />}
              title="Nothing sold in this range"
              description="Widen the date range, or check that your listings are live."
            />
          ) : (
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Best-selling products in the selected range</caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="py-2 pr-3 type-caption font-semibold text-fg-muted">Product</th>
                  <th scope="col" className="py-2 pr-3 text-right type-caption font-semibold whitespace-nowrap text-fg-muted">Units</th>
                  <th scope="col" className="py-2 pr-3 text-right type-caption font-semibold whitespace-nowrap text-fg-muted">Revenue</th>
                  <th scope="col" className="py-2 text-right type-caption font-semibold whitespace-nowrap text-fg-muted">In stock</th>
                </tr>
              </thead>
              <tbody>
                {(data?.top ?? []).map((row) => (
                  <tr key={row.product.id} className="border-b border-border-subtle last:border-b-0">
                    <td className="py-2.5 pr-3 type-body">
                      <Link
                        to={`/seller/products/${row.product.id}/edit`}
                        className="rounded-badge font-medium text-fg hover:text-primary hover:underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {row.product.title}
                      </Link>
                      <span className="block type-caption text-fg-muted">{row.product.brand}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-right type-body text-fg tabular">{formatNumber(row.units)}</td>
                    <td className="py-2.5 pr-3 text-right type-body text-fg tabular">{formatINR(row.revenue)}</td>
                    <td className="py-2.5 text-right type-body tabular">
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <span className="text-fg">{formatNumber(row.stock)}</span>
                        {productStockStatus(row.product) === 'in_stock' ? null : (
                          <StatusBadge domain="stock" status={productStockStatus(row.product)} size="sm" withTooltip />
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        <div className="flex flex-col gap-4 xl:col-span-1">
          <SectionCard
            title="Next payout"
            actions={
              <Link to="/seller/payouts" className="type-caption text-link hover:underline">
                All payouts
              </Link>
            }
          >
            {payout ? (
              <div className="flex flex-col gap-2">
                <p className="type-kpi text-fg">{formatINR(payout.net)}</p>
                <p className="type-body text-fg-muted">
                  Expected on {formatDayShort(`${payout.scheduledFor}T00:00:00+05:30`)} · {payout.shipmentIds.length}{' '}
                  {payout.shipmentIds.length === 1 ? 'order' : 'orders'}
                </p>
                <StatusBadge domain="payout" status={payout.status} size="sm" withTooltip />
                {payout.holdReason ? <p className="type-caption text-warning-subtle-fg">{payout.holdReason}</p> : null}
              </div>
            ) : (
              <p className="type-body text-fg-muted">
                No payout is scheduled yet. A sale is settled seven days after it is delivered, and paid on the next Tuesday.
              </p>
            )}
          </SectionCard>

          <SectionCard
            title="Ratings"
            actions={
              <Link to="/seller/reviews" className="type-caption text-link hover:underline">
                All reviews
              </Link>
            }
          >
            {data && data.rating.count > 0 ? (
              <RatingSummary rating={{ avg: data.rating.average, count: data.rating.count, dist: data.rating.dist }} />
            ) : (
              <p className="type-body text-fg-muted">No ratings yet. They appear here once shoppers review a delivered order.</p>
            )}
          </SectionCard>
        </div>
      </div>

      <SectionCard
        title="Recent orders"
        actions={
          <Link to="/seller/orders" className="type-caption text-link hover:underline">
            All orders
          </Link>
        }
        flush
      >
        <ul className="divide-y divide-border-subtle">
          {(data?.recent ?? []).map((row) => (
            <li key={row.shipment.id}>
              <Link
                to={`/seller/orders/${row.shipment.id}`}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-5"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="type-body text-fg">{row.shipment.id}</span>
                  <span className="type-caption text-fg-muted">
                    {row.buyer} · {formatRelative(row.order.placedAt)}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="type-body text-fg tabular">{formatINR(row.amount)}</span>
                  <StatusBadge domain="shipment" status={row.shipment.status} size="sm" />
                </span>
              </Link>
            </li>
          ))}
          {!loading && data?.recent.length === 0 ? (
            <li>
              <EmptyState
                variant="compact"
                title="No orders yet"
                description="When shoppers buy your products, new orders appear here for you to confirm and pack."
              />
            </li>
          ) : null}
        </ul>
      </SectionCard>
    </>
  )
}
