import { Ellipsis, FileText, Landmark, TriangleAlert, Wallet } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  getNextPayout,
  getSellerPayouts,
  useDb,
  useDemoQuery,
  useSession,
  type Payout,
} from '@/data'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/ui/card'
import { DescriptionList } from '@/components/ui/description-list'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { IconButton } from '@/components/ui/icon-button'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { DataTable, type Column } from '@/components/dashboard/data-table'
import { ExportButton } from '@/components/dashboard/export-button'
import { FilterBar } from '@/components/dashboard/filter-bar'
import { formatDate, formatDayShort, formatINR, formatNumber } from '@/lib/format'
import { maskAccount } from '@/lib/mask'
import { estimateEarnings } from '@/lib/settlement'
import { useUrlState } from '@/lib/use-url-state'
import { SettlementLines } from '../components/settlement-lines'

/** Opening a dialog straight from a menu item fights Radix's focus return; let the menu close first. */
function deferred(run: () => void) {
  window.setTimeout(run, 0)
}

const dayIso = (day: string) => `${day}T00:00:00+05:30`

/** The worked example on the page: one ₹17,999 phone, settled in full. */
const EXAMPLE_SALE = 17_999

function StatementDialog({ payout, onClose }: { payout: Payout | null; onClose: () => void }) {
  return (
    <Dialog
      open={Boolean(payout)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {payout ? (
        <DialogContent
          title={`Statement ${payout.id}`}
          description={`${formatDate(dayIso(payout.periodStart))} to ${formatDate(dayIso(payout.periodEnd))} · ${payout.shipmentIds.length} ${payout.shipmentIds.length === 1 ? 'order' : 'orders'}`}
          size="md"
          footer={
            <>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
              <ExportButton
                filename={`chowk-statement-${payout.id}`}
                label="Download statement"
                size="md"
                headers={['Line', 'Amount']}
                rows={() => [...payout.lines.map((line) => [line.label, line.amount] as const), ['Net payout', payout.net] as const]}
              />
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <SettlementLines lines={payout.lines} net={payout.net} caption={`Settlement lines for ${payout.id}`} />
            <DescriptionList
              columns={2}
              items={[
                { term: 'Status', detail: <StatusBadge domain="payout" status={payout.status} size="sm" /> },
                { term: 'Expected on', detail: formatDayShort(dayIso(payout.scheduledFor)) },
                ...(payout.utr ? [{ term: 'Bank reference', detail: payout.utr, copyValue: payout.utr }] : []),
                ...(payout.holdReason ? [{ term: 'Why it is on hold', detail: payout.holdReason }] : []),
              ]}
            />
            <div>
              <p className="type-label text-fg">Orders in this payout</p>
              <p className="type-caption text-fg-muted">{payout.shipmentIds.join(', ')}</p>
            </div>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}

/** Every settlement, and the arithmetic behind it. */
export default function SellerPayoutsPage() {
  const sellerId = useSession((state) => state.sellerId)
  const [status, setStatus] = useUrlState<string>('status', 'all')
  const [statement, setStatement] = useState<Payout | null>(null)

  const settings = useDb((view) => view.settings, [])
  const seller = useDb((view) => view.sellers.find((entry) => entry.id === sellerId), [sellerId])
  const next = useDb((view) => getNextPayout(view, sellerId), [sellerId])

  const query = useDemoQuery(
    (view) => getSellerPayouts(view, sellerId).filter((payout) => status === 'all' || payout.status === status),
    [sellerId, status],
  )
  // A forced empty state (?demo=empty) still returns real data; the screen must honour it.
  const rows = query.status === 'empty' ? [] : (query.data ?? [])

  const paid = rows.filter((payout) => payout.status === 'paid')
  const onHold = rows.filter((payout) => payout.status === 'on_hold')
  const example = estimateEarnings(EXAMPLE_SALE, 5, 18, settings)

  const csvHeaders = ['Payout', 'Period start', 'Period end', 'Expected on', 'Orders', 'Gross', 'Net', 'Status', 'Bank reference'] as const
  const csvRow = (payout: Payout) => [
    payout.id,
    payout.periodStart,
    payout.periodEnd,
    payout.scheduledFor,
    payout.shipmentIds.length,
    payout.gross,
    payout.net,
    payout.status,
    payout.utr ?? '',
  ]

  const columns: Column<Payout>[] = [
    {
      id: 'id',
      header: 'Payout',
      mobile: 'title',
      sortValue: (payout) => payout.id,
      cell: (payout) => <span className="type-code">{payout.id}</span>,
    },
    {
      id: 'period',
      header: 'Period',
      hideBelow: 'lg',
      hideable: true,
      mobile: 'subtitle',
      sortValue: (payout) => payout.periodStart,
      cell: (payout) => (
        <span className="whitespace-nowrap">
          {formatDate(dayIso(payout.periodStart))} – {formatDate(dayIso(payout.periodEnd))}
        </span>
      ),
    },
    {
      id: 'scheduled',
      header: 'Expected on',
      sortValue: (payout) => payout.scheduledFor,
      cell: (payout) => (
        <span className="flex flex-col">
          <span className="whitespace-nowrap">{formatDayShort(dayIso(payout.scheduledFor))}</span>
          {payout.paidAt ? <span className="type-caption text-fg-muted">Paid {formatDate(payout.paidAt)}</span> : null}
        </span>
      ),
    },
    {
      id: 'orders',
      header: 'Orders',
      align: 'end',
      hideBelow: 'xl',
      hideable: true,
      mobile: 'meta',
      sortValue: (payout) => payout.shipmentIds.length,
      cell: (payout) => formatNumber(payout.shipmentIds.length),
    },
    {
      id: 'gross',
      header: 'Sale value',
      align: 'end',
      hideBelow: 'lg',
      hideable: true,
      sortValue: (payout) => payout.gross,
      cell: (payout) => formatINR(payout.gross, { decimals: 2 }),
    },
    {
      id: 'net',
      header: 'Net payout',
      align: 'end',
      mobile: 'meta',
      sortValue: (payout) => payout.net,
      cell: (payout) => <span className="font-semibold text-fg">{formatINR(payout.net, { decimals: 2 })}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      sortValue: (payout) => payout.status,
      cell: (payout) => <StatusBadge domain="payout" status={payout.status} size="sm" withTooltip />,
    },
    {
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'end',
      width: 'xs',
      mobile: 'action',
      cell: (payout) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton label={`Actions for ${payout.id}`} size="sm" variant="ghost" icon={<Ellipsis aria-hidden />} />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem icon={<FileText aria-hidden />} onSelect={() => deferred(() => setStatement(payout))}>
              View statement
            </DropdownMenuItem>
            {payout.utr ? (
              <DropdownMenuItem
                onSelect={() => {
                  void navigator.clipboard?.writeText(payout.utr ?? '')
                  toast.success('Bank reference copied')
                }}
              >
                Copy bank reference
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Payouts"
        description="A sale is settled seven days after it is delivered, and paid into your bank account on the next Tuesday."
        meta={
          seller ? (
            <>
              <span>
                {seller.bank.bankName} {maskAccount(seller.bank.last4)}
              </span>
              <span>{seller.bank.verified ? 'Account verified' : 'Account not verified yet'}</span>
            </>
          ) : null
        }
        actions={<ExportButton filename="chowk-payouts" headers={csvHeaders} rows={() => rows.map(csvRow)} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Next payout">
          {next ? (
            <div className="flex flex-col gap-2">
              <p className="type-kpi text-fg">{formatINR(next.net, { decimals: 2 })}</p>
              <p className="type-body text-fg-muted">
                {formatDayShort(dayIso(next.scheduledFor))} · {next.shipmentIds.length}{' '}
                {next.shipmentIds.length === 1 ? 'order' : 'orders'}
              </p>
              <StatusBadge domain="payout" status={next.status} size="sm" withTooltip />
              {next.holdReason ? <p className="type-caption text-warning-subtle-fg">{next.holdReason}</p> : null}
            </div>
          ) : (
            <p className="type-body text-fg-muted">
              Nothing is queued. Deliveries settle seven days later, so a payout appears here as soon as an order lands.
            </p>
          )}
        </SectionCard>

        <SectionCard title="Paid so far">
          <p className="type-kpi text-fg">{formatINR(paid.reduce((sum, payout) => sum + payout.net, 0))}</p>
          <p className="type-body text-fg-muted">
            Across {formatNumber(paid.length)} {paid.length === 1 ? 'payout' : 'payouts'}
          </p>
        </SectionCard>

        <SectionCard title="On hold">
          <p className="type-kpi text-fg">{formatINR(onHold.reduce((sum, payout) => sum + payout.net, 0))}</p>
          <p className="type-body text-fg-muted">
            {onHold.length === 0
              ? 'Nothing held back.'
              : `${formatNumber(onHold.length)} ${onHold.length === 1 ? 'payout is' : 'payouts are'} waiting on the finance team.`}
          </p>
        </SectionCard>
      </div>

      <SectionCard
        title="How a payout is worked out"
        description={`A worked example: one ${formatINR(EXAMPLE_SALE)} phone at 5% commission and 18% GST, delivered and settled in full.`}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <SettlementLines
            lines={example.lines}
            net={example.net}
            caption={`Settlement for a ${formatINR(EXAMPLE_SALE)} sale`}
          />
          <ul className="flex flex-col gap-2 type-caption text-fg-muted">
            <li>
              <span className="font-semibold text-fg">Commission</span> comes from the product's category, not from your account.
            </li>
            <li>
              <span className="font-semibold text-fg">Fixed fee</span> of {formatINR(settings.fixedFee)} and{' '}
              <span className="font-semibold text-fg">shipping</span> of {formatINR(settings.shippingFeePerShipment)} are charged once
              per shipment.
            </li>
            <li>
              <span className="font-semibold text-fg">GST {settings.gstOnFeesPct}% on fees</span> applies to the commission, fixed fee
              and shipping together — not to the sale.
            </li>
            <li>
              <span className="font-semibold text-fg">TCS {settings.tcsPct}%</span> and{' '}
              <span className="font-semibold text-fg">TDS {settings.tdsPct}%</span> are charged on the taxable value — the sale with GST
              stripped out — which is why they are not a flat percentage of the sale.
            </li>
            <li>Coupons funded by Chowk never reduce what you are paid; seller-funded coupons do.</li>
          </ul>
        </div>
      </SectionCard>

      <DataTable
        tableId="seller-payouts"
        caption="Weekly settlements for your store"
        data={rows}
        columns={columns}
        getRowId={(payout) => payout.id}
        loading={query.status === 'loading'}
        initialSort={{ id: 'scheduled', dir: 'desc' }}
        toolbar={
          <FilterBar
            facets={[
              {
                id: 'status',
                label: 'Status',
                single: true,
                selected: status === 'all' ? [] : [status],
                onChange: (selected) => setStatus(selected[0] ?? 'all'),
                options: [
                  { value: 'scheduled', label: 'Scheduled' },
                  { value: 'processing', label: 'Processing' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'on_hold', label: 'On hold' },
                  { value: 'failed', label: 'Failed' },
                ],
              },
            ]}
            onReset={() => setStatus('all')}
          />
        }
        empty={
          query.status === 'error' ? (
            <EmptyState
              icon={<TriangleAlert aria-hidden />}
              title="We couldn’t load your payouts"
              description="The statement list didn’t come back. Try again."
              action={<Button onClick={query.retry}>Retry</Button>}
            />
          ) : status !== 'all' ? (
            <EmptyState
              icon={<Wallet aria-hidden />}
              title="No payouts with this status"
              description="Clear the filter to see every settlement."
              action={
                <Button size="sm" variant="outline" onClick={() => setStatus('all')}>
                  Clear filter
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Landmark aria-hidden />}
              title="No payouts yet"
              description="Your first settlement appears seven days after your first delivery, and is paid on the Tuesday that follows."
            />
          )
        }
      />

      <StatementDialog payout={statement} onClose={() => setStatement(null)} />
    </>
  )
}
