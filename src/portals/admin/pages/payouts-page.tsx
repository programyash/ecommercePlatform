import { BanknoteArrowUp, Ellipsis, FileText, Pause, Play, Store, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { dbActions, getPayoutBatches, useDb, useDemoQuery, type Payout } from '@/data'
import { Button } from '@/components/ui/button'
import { DescriptionList } from '@/components/ui/description-list'
import { Dialog, DialogContent } from '@/components/ui/dialog'
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
import { RadioGroup } from '@/components/ui/radio-group'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import { DataTable, type Column } from '@/components/dashboard/data-table'
import { ExportButton } from '@/components/dashboard/export-button'
import { FilterBar } from '@/components/dashboard/filter-bar'
import { useConfirm } from '@/components/ui/use-confirm'
import { cn } from '@/lib/cn'
import { formatDate, formatINR, formatNumber, pluralize } from '@/lib/format'
import { statusOptions } from '@/lib/status'
import { useUrlState } from '@/lib/use-url-state'
import { LoadFailed } from '../components/record-states'

/** Opening a dialog straight from a menu item fights Radix's focus return; let the menu close first. */
function deferred(run: () => void) {
  window.setTimeout(run, 0)
}

const HOLD_REASONS = [
  'Bank details are being re-verified with the seller.',
  'A return on this batch is still open.',
  'Held for a compliance check on recent orders.',
]

function dayIso(day: string): string {
  return `${day}T00:00:00+05:30`
}

/** Settlement batches: what each seller is owed, and why anything is on hold. */
export default function AdminPayoutsPage() {
  const [q, setQ] = useUrlState<string>('q', '')
  const [status, setStatus] = useUrlState<string>('status', '')
  const [sellerId, setSellerId] = useUrlState<string>('seller', '')
  const [statement, setStatement] = useState<string | null>(null)
  const [holding, setHolding] = useState<string | null>(null)
  const [reason, setReason] = useState(HOLD_REASONS[0] ?? '')
  const confirm = useConfirm()
  const navigate = useNavigate()

  const sellers = useDb((view) => view.sellers.map((seller) => ({ value: seller.id, label: seller.displayName })), [])

  const query = useDemoQuery(
    (view) =>
      getPayoutBatches(view, {
        ...(status ? { status: status as Payout['status'] } : {}),
        ...(sellerId ? { sellerId } : {}),
        ...(q ? { q } : {}),
      }),
    [q, status, sellerId],
  )

  // `?demo=empty` still hands back real rows, so blank them here to show the empty state.
  const rows = query.status === 'empty' ? [] : (query.data ?? [])
  type Row = (typeof rows)[number]

  const filtered = Boolean(q || status || sellerId)
  const resetAll = () => {
    setQ('')
    setStatus('')
    setSellerId('')
  }

  const open = rows.find((row) => row.payout.id === statement)

  const release = (row: Row) => {
    dbActions.releasePayout(row.payout.id)
    toast.success('Payout released', { description: `${row.payout.id} goes out in the next payout run.` })
  }

  const markPaid = async (row: Row) => {
    const ok = await confirm({
      title: `Mark ${row.payout.id} as paid?`,
      description: `${formatINR(row.payout.net, { decimals: 2 })} to ${row.seller?.displayName ?? 'the seller'}. A bank reference is recorded against the batch.`,
      confirmLabel: 'Mark as paid',
    })
    if (!ok) return
    dbActions.markPayoutPaid(row.payout.id)
    toast.success('Payout marked as paid', { description: `${row.payout.id} · ${formatINR(row.payout.net, { decimals: 2 })}` })
  }

  const submitHold = () => {
    if (!holding) return
    dbActions.holdPayout(holding, reason)
    setHolding(null)
    toast.success('Payout on hold', { description: 'The finance team will see the reason on the batch.' })
  }

  const payMany = async (ids: string[], clear: () => void) => {
    const targets = rows.filter((row) => ids.includes(row.payout.id) && row.payout.status !== 'paid' && row.payout.status !== 'on_hold')
    if (!targets.length) {
      toast.message('Nothing to pay', { description: 'The batches you selected are already paid, or on hold.' })
      return
    }
    const total = targets.reduce((sum, row) => sum + row.payout.net, 0)
    const ok = await confirm({
      title: `Mark ${targets.length} ${pluralize(targets.length, 'payout')} as paid?`,
      description: `${formatINR(total, { decimals: 2 })} across ${targets.length} ${pluralize(targets.length, 'batch', 'batches')}.`,
      confirmLabel: 'Mark as paid',
    })
    if (!ok) return
    targets.forEach((row) => dbActions.markPayoutPaid(row.payout.id))
    clear()
    toast.success(`${targets.length} ${pluralize(targets.length, 'payout')} marked as paid`, {
      description: formatINR(total, { decimals: 2 }),
    })
  }

  const csvHeaders = ['Payout', 'Seller', 'Period start', 'Period end', 'Scheduled for', 'Shipments', 'Gross', 'Net', 'Status', 'UTR'] as const
  const csvRow = (row: Row) => [
    row.payout.id,
    row.seller?.displayName ?? '',
    row.payout.periodStart,
    row.payout.periodEnd,
    row.payout.scheduledFor,
    row.shipments,
    row.payout.gross,
    row.payout.net,
    row.payout.status,
    row.payout.utr ?? '',
  ]

  const columns: Column<Row>[] = [
    {
      id: 'id',
      header: 'Batch',
      mobile: 'title',
      sortValue: (row) => row.payout.id,
      cell: (row) => <span className="font-mono whitespace-nowrap">{row.payout.id}</span>,
    },
    {
      id: 'seller',
      header: 'Seller',
      mobile: 'subtitle',
      sortValue: (row) => row.seller?.displayName ?? '',
      cell: (row) => <span className="truncate">{row.seller?.displayName ?? 'Seller removed'}</span>,
    },
    {
      id: 'period',
      header: 'Period',
      hideBelow: 'lg',
      hideable: true,
      sortValue: (row) => row.payout.periodStart,
      cell: (row) => (
        <span className="whitespace-nowrap">
          {formatDate(dayIso(row.payout.periodStart))} – {formatDate(dayIso(row.payout.periodEnd))}
        </span>
      ),
    },
    {
      id: 'scheduled',
      header: 'Scheduled',
      hideBelow: 'md',
      mobile: 'subtitle',
      sortValue: (row) => row.payout.scheduledFor,
      cell: (row) => <span className="whitespace-nowrap">{formatDate(dayIso(row.payout.scheduledFor))}</span>,
    },
    {
      id: 'shipments',
      header: 'Orders',
      align: 'end',
      hideBelow: 'xl',
      hideable: true,
      sortValue: (row) => row.shipments,
      cell: (row) => formatNumber(row.shipments),
    },
    {
      id: 'gross',
      header: 'Gross',
      align: 'end',
      hideBelow: 'xl',
      hideable: true,
      sortValue: (row) => row.payout.gross,
      cell: (row) => formatINR(row.payout.gross, { decimals: 2 }),
    },
    {
      id: 'net',
      header: 'Net',
      align: 'end',
      mobile: 'meta',
      sortValue: (row) => row.payout.net,
      cell: (row) => formatINR(row.payout.net, { decimals: 2 }),
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      sortValue: (row) => row.payout.status,
      cell: (row) => (
        <span className="flex flex-col items-start gap-1">
          <StatusBadge domain="payout" status={row.payout.status} size="sm" withTooltip />
          {row.payout.holdReason ? <span className="type-caption text-fg-muted">{row.payout.holdReason}</span> : null}
          {row.payout.utr ? <span className="font-mono type-caption text-fg-muted">UTR {row.payout.utr}</span> : null}
        </span>
      ),
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
            <IconButton label={`Actions for ${row.payout.id}`} size="sm" variant="ghost" icon={<Ellipsis aria-hidden />} />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem icon={<FileText aria-hidden />} onSelect={() => setStatement(row.payout.id)}>
              View statement
            </DropdownMenuItem>
            {row.seller ? (
              <DropdownMenuItem icon={<Store aria-hidden />} onSelect={() => void navigate(`/admin/sellers/${row.seller?.id ?? ''}`)}>
                View seller
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            {row.payout.status === 'on_hold' ? (
              <DropdownMenuItem icon={<Play aria-hidden />} onSelect={() => release(row)}>
                Release payout
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                icon={<Pause aria-hidden />}
                onSelect={() =>
                  deferred(() => {
                    setReason(HOLD_REASONS[0] ?? '')
                    setHolding(row.payout.id)
                  })
                }
              >
                Hold payout
              </DropdownMenuItem>
            )}
            {row.payout.status === 'paid' ? null : (
              <DropdownMenuItem icon={<BanknoteArrowUp aria-hidden />} onSelect={() => deferred(() => markPaid(row))}>
                Mark as paid
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Payouts"
        description="Sellers are paid seven days after delivery. Every deduction is itemised on the statement."
        meta={
          query.status === 'success' ? (
            <>
              <span>
                {formatNumber(rows.length)} {pluralize(rows.length, 'batch', 'batches')}
              </span>
              <span className="tabular">
                {formatINR(
                  rows.filter((row) => row.payout.status !== 'paid').reduce((sum, row) => sum + row.payout.net, 0),
                )}{' '}
                still to pay
              </span>
            </>
          ) : null
        }
      />

      {query.status === 'error' ? (
        <LoadFailed title="We couldn’t load the payouts" onRetry={query.retry} />
      ) : (
        <DataTable
          tableId="admin-payouts"
          caption="Settlement batches across the marketplace"
          data={rows}
          columns={columns}
          getRowId={(row) => row.payout.id}
          loading={query.status === 'loading'}
          selectable
          bulkActions={(ids, clear) => (
            <>
              <Button size="sm" variant="outline" leftIcon={<BanknoteArrowUp aria-hidden />} onClick={() => void payMany(ids, clear)}>
                Mark as paid
              </Button>
              <ExportButton
                filename="chowk-payouts-selected"
                label="Export selected"
                headers={csvHeaders}
                rows={() => rows.filter((row) => ids.includes(row.payout.id)).map(csvRow)}
              />
            </>
          )}
          toolbar={
            <FilterBar
              search={{ value: q, onChange: setQ, placeholder: 'Search batch id, seller or UTR' }}
              facets={[
                {
                  id: 'status',
                  label: 'Status',
                  single: true,
                  selected: status ? [status] : [],
                  onChange: (selected) => setStatus(selected[0] ?? ''),
                  options: statusOptions('payout'),
                },
                {
                  id: 'seller',
                  label: 'Seller',
                  single: true,
                  selected: sellerId ? [sellerId] : [],
                  onChange: (selected) => setSellerId(selected[0] ?? ''),
                  options: sellers,
                },
              ]}
              onReset={resetAll}
              actions={<ExportButton filename="chowk-payouts" headers={csvHeaders} rows={() => rows.map(csvRow)} />}
            />
          }
          empty={
            <EmptyState
              icon={<Wallet aria-hidden />}
              title={filtered ? 'No payouts match these filters' : 'No payouts yet'}
              description={
                filtered
                  ? 'Try a different search, or clear the status and seller filters.'
                  : 'A batch is created seven days after the first delivery of the period.'
              }
              action={
                filtered ? (
                  <Button size="sm" variant="outline" onClick={resetAll}>
                    Clear filters
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/admin/orders">View orders</Link>
                  </Button>
                )
              }
            />
          }
        />
      )}

      <Sheet open={statement !== null} onOpenChange={(next) => !next && setStatement(null)}>
        <SheetContent
          title={open ? `Statement ${open.payout.id}` : 'Statement'}
          description={open?.seller?.displayName ?? undefined}
        >
          {open ? (
            <div className="flex flex-col gap-5">
              <DescriptionList
                layout="inline"
                items={[
                  {
                    term: 'Period',
                    detail: `${formatDate(dayIso(open.payout.periodStart))} – ${formatDate(dayIso(open.payout.periodEnd))}`,
                  },
                  { term: 'Scheduled for', detail: formatDate(dayIso(open.payout.scheduledFor)) },
                  {
                    term: 'Shipments',
                    detail: `${formatNumber(open.shipments)} ${pluralize(open.shipments, 'shipment')}`,
                  },
                  { term: 'Status', detail: <StatusBadge domain="payout" status={open.payout.status} size="sm" /> },
                  ...(open.payout.utr ? [{ term: 'Bank reference', detail: open.payout.utr, copyValue: open.payout.utr }] : []),
                  ...(open.payout.paidAt ? [{ term: 'Paid on', detail: formatDate(open.payout.paidAt) }] : []),
                ]}
              />

              {open.payout.holdReason ? (
                <p className="rounded-card border border-warning-border bg-warning-subtle p-3 type-body text-fg">
                  {open.payout.holdReason}
                </p>
              ) : null}

              <div className="overflow-x-auto rounded-card border border-border">
                <table className="w-full border-collapse text-left">
                  <caption className="sr-only">Settlement lines for {open.payout.id}</caption>
                  <thead>
                    <tr className="border-b border-border bg-surface-2">
                      <th scope="col" className="px-3 py-2 type-caption font-semibold text-fg-muted">Line</th>
                      <th scope="col" className="px-3 py-2 text-right type-caption font-semibold text-fg-muted">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {open.payout.lines.map((line) => (
                      <tr key={line.kind + line.label} className="border-b border-border-subtle last:border-b-0">
                        <td className="px-3 py-2 type-body text-fg">{line.label}</td>
                        <td
                          className={cn(
                            'px-3 py-2 text-right type-body tabular',
                            line.amount < 0 ? 'text-fg-muted' : 'text-fg',
                          )}
                        >
                          {formatINR(line.amount, { decimals: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-surface-2">
                      <th scope="row" className="px-3 py-2 text-left type-label text-fg">Net payout</th>
                      <td className="px-3 py-2 text-right type-label text-fg tabular">
                        {formatINR(open.payout.net, { decimals: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <p className="type-caption text-fg-muted">
                TCS and TDS are charged on the taxable value — the sale net of GST — which is why they are not a flat
                percentage of the sale amount.
              </p>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={holding !== null} onOpenChange={(next) => !next && setHolding(null)}>
        <DialogContent
          title="Hold this payout"
          description="The batch is taken out of the next payout run until it is released."
          footer={
            <>
              <Button variant="outline" onClick={() => setHolding(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={submitHold}>
                Hold payout
              </Button>
            </>
          }
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="pb-2 type-label text-fg">Reason</legend>
            <RadioGroup
              aria-label="Hold reason"
              variant="card"
              value={reason}
              onValueChange={setReason}
              options={HOLD_REASONS.map((entry) => ({ value: entry, label: entry }))}
            />
          </fieldset>
        </DialogContent>
      </Dialog>
    </>
  )
}
