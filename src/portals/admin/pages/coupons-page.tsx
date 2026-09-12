import { BadgePercent, Copy, Ellipsis, Pause, Play, Plus, SquarePen } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DEMO_NOW, dbActions, getCoupons, useDb, useDemoQuery, type Coupon } from '@/data'
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
import { DataTable, type Column } from '@/components/dashboard/data-table'
import { ExportButton } from '@/components/dashboard/export-button'
import { FilterBar } from '@/components/dashboard/filter-bar'
import { formatDate, formatINR, formatNumber, pluralize } from '@/lib/format'
import { statusOptions } from '@/lib/status'
import { useUrlState } from '@/lib/use-url-state'
import { CouponDrawer } from '../components/coupon-drawer'
import { LoadFailed } from '../components/record-states'

/** Opening a drawer straight from a menu item fights Radix's focus return; let the menu close first. */
function deferred(run: () => void) {
  window.setTimeout(run, 0)
}

function discountLabel(coupon: Coupon): string {
  if (coupon.kind === 'flat') return `${formatINR(coupon.value)} off`
  return coupon.maxDiscount ? `${coupon.value}% off up to ${formatINR(coupon.maxDiscount)}` : `${coupon.value}% off`
}

/** Platform and seller-funded coupons, created in a drawer beside the list. */
export default function AdminCouponsPage() {
  const [q, setQ] = useUrlState<string>('q', '')
  const [status, setStatus] = useUrlState<string>('status', '')
  const [funder, setFunder] = useUrlState<string>('funder', '')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [target, setTarget] = useState<{ coupon?: Coupon; nonce: number }>({ nonce: 0 })

  const sellers = useDb((view) => view.sellers.map((seller) => ({ value: seller.id, label: seller.displayName })), [])
  const categories = useDb((view) => view.rootCategories.map((category) => ({ id: category.id, name: category.name })), [])

  const query = useDemoQuery(
    (view) => {
      const needle = q.trim().toLowerCase()
      return getCoupons(view, DEMO_NOW)
        .filter((row) => !status || row.status === status)
        .filter((row) => !funder || row.coupon.fundedBy === funder)
        .filter(
          (row) =>
            !needle ||
            row.coupon.code.toLowerCase().includes(needle) ||
            row.coupon.title.toLowerCase().includes(needle),
        )
    },
    [q, status, funder],
  )

  // `?demo=empty` still hands back real rows, so blank them here to show the empty state.
  const rows = query.status === 'empty' ? [] : (query.data ?? [])
  type Row = (typeof rows)[number]

  const filtered = Boolean(q || status || funder)
  const resetAll = () => {
    setQ('')
    setStatus('')
    setFunder('')
  }

  const openDrawer = (coupon?: Coupon) => {
    setTarget((previous) => (coupon ? { coupon, nonce: previous.nonce + 1 } : { nonce: previous.nonce + 1 }))
    setDrawerOpen(true)
  }

  const save = (coupon: Coupon) => {
    dbActions.upsertCoupon(coupon)
    setDrawerOpen(false)
    toast.success(target.coupon ? 'Coupon saved' : 'Coupon created', {
      description: `${coupon.code} · ${discountLabel(coupon)}`,
    })
  }

  const togglePause = (row: Row) => {
    const pausing = !row.coupon.paused
    dbActions.setCouponPaused(row.coupon.code, pausing)
    toast.success(pausing ? 'Coupon paused' : 'Coupon resumed', {
      description: pausing ? `${row.coupon.code} stops working at checkout straight away.` : `${row.coupon.code} works at checkout again.`,
    })
  }

  const csvHeaders = ['Code', 'Name', 'Discount', 'Minimum order', 'Funded by', 'Starts', 'Ends', 'Used', 'Limit', 'Status'] as const
  const csvRow = (row: Row) => [
    row.coupon.code,
    row.coupon.title,
    discountLabel(row.coupon),
    row.coupon.minOrder,
    row.coupon.fundedBy === 'seller' ? (row.seller?.displayName ?? 'Seller') : 'Chowk',
    row.coupon.startsAt.slice(0, 10),
    row.coupon.endsAt.slice(0, 10),
    row.coupon.used,
    row.coupon.usageLimit ?? '',
    row.status,
  ]

  const columns: Column<Row>[] = [
    {
      id: 'code',
      header: 'Coupon',
      mobile: 'title',
      sortValue: (row) => row.coupon.code,
      cell: (row) => (
        <span className="flex min-w-0 flex-col">
          <span className="font-mono whitespace-nowrap">{row.coupon.code}</span>
          <span className="truncate type-caption text-fg-muted">{row.coupon.title}</span>
        </span>
      ),
    },
    {
      id: 'discount',
      header: 'Discount',
      mobile: 'subtitle',
      sortValue: (row) => row.coupon.value,
      cell: (row) => (
        <span className="flex min-w-0 flex-col">
          <span className="whitespace-nowrap text-discount">{discountLabel(row.coupon)}</span>
          <span className="type-caption text-fg-muted">
            {row.coupon.minOrder > 0 ? `Above ${formatINR(row.coupon.minOrder)}` : 'No minimum'}
            {row.coupon.firstOrderOnly ? ' · first order only' : ''}
            {row.coupon.prepaidOnly ? ' · prepaid only' : ''}
          </span>
        </span>
      ),
    },
    {
      id: 'categories',
      header: 'Applies to',
      hideBelow: 'xl',
      hideable: true,
      cell: (row) => (
        <span className="line-clamp-2">{row.categories.length ? row.categories.join(', ') : 'Everything'}</span>
      ),
    },
    {
      id: 'funder',
      header: 'Funded by',
      hideBelow: 'lg',
      hideable: true,
      sortValue: (row) => row.coupon.fundedBy,
      cell: (row) => (
        <span className="truncate">
          {row.coupon.fundedBy === 'seller' ? (row.seller?.displayName ?? 'A seller') : 'Chowk'}
        </span>
      ),
    },
    {
      id: 'validity',
      header: 'Valid',
      hideBelow: 'lg',
      sortValue: (row) => row.coupon.endsAt,
      cell: (row) => (
        <span className="whitespace-nowrap">
          {formatDate(row.coupon.startsAt)} – {formatDate(row.coupon.endsAt)}
        </span>
      ),
    },
    {
      id: 'used',
      header: 'Used',
      align: 'end',
      mobile: 'meta',
      sortValue: (row) => row.coupon.used,
      cell: (row) => (
        <span className="tabular">
          {formatNumber(row.coupon.used)}
          {row.coupon.usageLimit ? <span className="text-fg-muted"> / {formatNumber(row.coupon.usageLimit)}</span> : null}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge domain="coupon" status={row.status} size="sm" withTooltip />,
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
            <IconButton label={`Actions for ${row.coupon.code}`} size="sm" variant="ghost" icon={<Ellipsis aria-hidden />} />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem icon={<SquarePen aria-hidden />} onSelect={() => deferred(() => openDrawer(row.coupon))}>
              Edit coupon
            </DropdownMenuItem>
            <DropdownMenuItem
              icon={<Copy aria-hidden />}
              onSelect={() => {
                void navigator.clipboard.writeText(row.coupon.code)
                toast.success('Code copied')
              }}
            >
              Copy code
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {row.coupon.paused ? (
              <DropdownMenuItem icon={<Play aria-hidden />} onSelect={() => togglePause(row)}>
                Resume coupon
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem icon={<Pause aria-hidden />} onSelect={() => togglePause(row)}>
                Pause coupon
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
        title="Coupons"
        description="Codes shoppers type at checkout. A coupon only ever discounts the lines it applies to."
        meta={
          query.status === 'success' ? (
            <span>
              {formatNumber(rows.length)} {pluralize(rows.length, 'coupon')}
            </span>
          ) : null
        }
        actions={
          <Button leftIcon={<Plus aria-hidden />} onClick={() => openDrawer()}>
            Create coupon
          </Button>
        }
      />

      {query.status === 'error' ? (
        <LoadFailed title="We couldn’t load the coupons" onRetry={query.retry} />
      ) : (
        <DataTable
          tableId="admin-coupons"
          caption="Coupons available on the marketplace"
          data={rows}
          columns={columns}
          getRowId={(row) => row.coupon.code}
          loading={query.status === 'loading'}
          toolbar={
            <FilterBar
              search={{ value: q, onChange: setQ, placeholder: 'Search code or name' }}
              facets={[
                {
                  id: 'status',
                  label: 'Status',
                  single: true,
                  selected: status ? [status] : [],
                  onChange: (selected) => setStatus(selected[0] ?? ''),
                  options: statusOptions('coupon'),
                },
                {
                  id: 'funder',
                  label: 'Funded by',
                  single: true,
                  selected: funder ? [funder] : [],
                  onChange: (selected) => setFunder(selected[0] ?? ''),
                  options: [
                    { value: 'platform', label: 'Chowk' },
                    { value: 'seller', label: 'A seller' },
                  ],
                },
              ]}
              onReset={resetAll}
              actions={<ExportButton filename="chowk-coupons" headers={csvHeaders} rows={() => rows.map(csvRow)} />}
            />
          }
          empty={
            <EmptyState
              icon={<BadgePercent aria-hidden />}
              title={filtered ? 'No coupons match these filters' : 'No coupons yet'}
              description={
                filtered
                  ? 'Try a different search, or clear the status and funder filters.'
                  : 'Create a coupon and shoppers can use the code at checkout straight away.'
              }
              action={
                filtered ? (
                  <Button size="sm" variant="outline" onClick={resetAll}>
                    Clear filters
                  </Button>
                ) : (
                  <Button size="sm" leftIcon={<Plus aria-hidden />} onClick={() => openDrawer()}>
                    Create coupon
                  </Button>
                )
              }
            />
          }
        />
      )}

      <CouponDrawer
        key={target.nonce}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        {...(target.coupon ? { editing: target.coupon } : {})}
        sellers={sellers}
        categories={categories}
        onSave={save}
      />
    </>
  )
}
