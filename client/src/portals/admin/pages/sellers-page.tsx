import { Ban, BadgeCheck, Copy, Ellipsis, Eye, ShieldAlert, Store } from 'lucide-react'
import { toast } from 'sonner'
import { Link, useNavigate } from 'react-router'
import {
  dbActions,
  getSellerCounts,
  getSellers,
  useDb,
  useDemoQuery,
  type KycStatus,
  type SellerRow,
  type SellerTab,
} from '@/data'
import { Avatar } from '@/components/ui/avatar'
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
import { useConfirm } from '@/components/ui/use-confirm'
import { formatDate, formatINR, formatNumber, formatRating, pluralize } from '@/lib/format'
import { useUrlState } from '@/lib/use-url-state'
import { LoadFailed } from '../components/record-states'

/** Opening a dialog straight from a menu item fights Radix's focus return; let the menu close first. */
function deferred(run: () => void) {
  window.setTimeout(run, 0)
}

const SUSPEND_REASON =
  'Suspended by the marketplace team pending a compliance review. Your listings stay hidden until this is resolved.'

/** One badge for the whole checklist: the worst outstanding item wins. */
function kycSummary(row: SellerRow): KycStatus {
  const items = row.seller.kyc.filter((item) => item.required)
  if (items.some((item) => item.status === 'needs_attention')) return 'needs_attention'
  if (items.some((item) => item.status === 'not_submitted')) return 'not_submitted'
  if (items.every((item) => item.status === 'verified')) return 'verified'
  return 'submitted'
}

/** Every seller on the marketplace, and the applications waiting for a decision. */
export default function AdminSellersPage() {
  const [tab, setTab] = useUrlState<SellerTab>('tab', 'all')
  const [q, setQ] = useUrlState<string>('q', '')
  const confirm = useConfirm()
  const navigate = useNavigate()

  const counts = useDb((view) => getSellerCounts(view), [])
  const query = useDemoQuery(
    (view) =>
      getSellers(view, { tab, q }).map((row) => ({
        ...row,
        categoryNames: row.seller.categoryIds
          .map((id) => view.categoryById.get(id)?.name)
          .filter((name): name is string => Boolean(name)),
      })),
    [tab, q],
  )
  // `?demo=empty` still hands back real rows, so blank them here to show the empty state.
  const rows = query.status === 'empty' ? [] : (query.data ?? [])
  const filtered = q !== '' || tab !== 'all'

  type Row = (typeof rows)[number]

  const approve = async (row: Row) => {
    const ok = await confirm({
      title: `Approve ${row.seller.displayName}?`,
      description:
        'Seller Hub unlocks immediately: they can list products and take orders. The decision is written to the activity log.',
      confirmLabel: 'Approve seller',
    })
    if (!ok) return
    dbActions.setSellerStatus(row.seller.id, 'active')
    toast.success('Seller approved', { description: `${row.seller.displayName} can start listing right away.` })
  }

  const setSuspended = async (row: Row, suspend: boolean) => {
    const ok = await confirm({
      title: suspend ? `Suspend ${row.seller.displayName}?` : `Reinstate ${row.seller.displayName}?`,
      description: suspend
        ? `Their listings are hidden from shoppers straight away. They will see: “${SUSPEND_REASON}”`
        : 'Their listings go back on sale and they can take orders again.',
      confirmLabel: suspend ? 'Suspend seller' : 'Reinstate seller',
      tone: suspend ? 'danger' : 'default',
    })
    if (!ok) return
    dbActions.setSellerStatus(row.seller.id, suspend ? 'suspended' : 'active', suspend ? SUSPEND_REASON : undefined)
    toast.success(suspend ? 'Seller suspended' : 'Seller reinstated', {
      description: `${row.seller.displayName} · ${suspend ? 'listings hidden' : 'listings live again'}`,
    })
  }

  const suspendMany = async (ids: string[], clear: () => void) => {
    const targets = rows.filter((row) => ids.includes(row.seller.id) && row.seller.status === 'active')
    if (!targets.length) {
      toast.message('Nothing to suspend', { description: 'None of the sellers you selected are currently active.' })
      return
    }
    const ok = await confirm({
      title: `Suspend ${targets.length} ${pluralize(targets.length, 'seller')}?`,
      description: `Their listings are hidden from shoppers straight away. They will see: “${SUSPEND_REASON}”`,
      confirmLabel: 'Suspend sellers',
      tone: 'danger',
    })
    if (!ok) return
    targets.forEach((row) => dbActions.setSellerStatus(row.seller.id, 'suspended', SUSPEND_REASON))
    clear()
    toast.success(`${targets.length} ${pluralize(targets.length, 'seller')} suspended`, {
      description: 'Reinstate them from this list once the review is done.',
    })
  }

  const csvHeaders = [
    'Store', 'Legal name', 'Owner', 'City', 'State', 'Categories', 'KYC verified', 'Rating', '90-day GMV', 'Live products', 'Status', 'Joined',
  ] as const
  const csvRow = (row: Row) => [
    row.seller.displayName,
    row.seller.legalName,
    row.seller.ownerName,
    row.seller.city,
    row.seller.state,
    row.categoryNames.join(' | '),
    `${row.kycVerified}/${row.kycRequired}`,
    row.seller.rating ?? '',
    row.gmv90,
    row.liveProducts,
    row.seller.status,
    row.seller.joinedAt.slice(0, 10),
  ]

  const columns: Column<Row>[] = [
    {
      id: 'store',
      header: 'Store',
      mobile: 'title',
      sortValue: (row) => row.seller.displayName,
      cell: (row) => (
        <span className="flex items-center gap-2.5">
          <Avatar name={row.seller.displayName} size="sm" shape="square" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate">{row.seller.displayName}</span>
            <span className="truncate type-caption text-fg-muted">{row.seller.legalName}</span>
          </span>
        </span>
      ),
    },
    {
      id: 'owner',
      header: 'Owner',
      hideBelow: 'xl',
      hideable: true,
      mobile: 'subtitle',
      sortValue: (row) => row.seller.ownerName,
      cell: (row) => <span className="truncate">{row.seller.ownerName}</span>,
    },
    {
      id: 'location',
      header: 'City',
      hideBelow: 'lg',
      hideable: true,
      mobile: 'subtitle',
      sortValue: (row) => row.seller.city,
      cell: (row) => (
        <span className="whitespace-nowrap">
          {row.seller.city}
          <span className="text-fg-muted"> · {row.seller.state}</span>
        </span>
      ),
    },
    {
      id: 'categories',
      header: 'Categories',
      hideBelow: 'xl',
      hideable: true,
      defaultHidden: true,
      cell: (row) => (
        <span className="line-clamp-2">{row.categoryNames.length ? row.categoryNames.join(', ') : '—'}</span>
      ),
    },
    {
      id: 'kyc',
      header: 'KYC',
      mobile: 'meta',
      sortValue: (row) => row.kycVerified / Math.max(1, row.kycRequired),
      cell: (row) => (
        <span className="flex flex-col items-start gap-1">
          <StatusBadge domain="kyc" status={kycSummary(row)} size="sm" withTooltip />
          <span className="type-caption text-fg-muted tabular">
            {row.kycVerified} of {row.kycRequired} verified
          </span>
        </span>
      ),
    },
    {
      id: 'rating',
      header: 'Rating',
      align: 'end',
      hideBelow: 'xl',
      hideable: true,
      sortValue: (row) => row.seller.rating ?? -1,
      cell: (row) =>
        row.seller.rating ? (
          <span className="whitespace-nowrap">
            {formatRating(row.seller.rating)}
            <span className="text-fg-muted"> ({formatNumber(row.seller.ratingCount)})</span>
          </span>
        ) : (
          <span className="text-fg-subtle">No ratings</span>
        ),
    },
    {
      id: 'gmv',
      header: '90-day GMV',
      align: 'end',
      mobile: 'meta',
      sortValue: (row) => row.gmv90,
      cell: (row) => formatINR(row.gmv90),
    },
    {
      id: 'products',
      header: 'Live',
      align: 'end',
      hideBelow: 'md',
      hideable: true,
      mobile: 'meta',
      sortValue: (row) => row.liveProducts,
      cell: (row) => formatNumber(row.liveProducts),
    },
    {
      id: 'joined',
      header: tab === 'pending' ? 'Waiting' : 'Joined',
      hideBelow: 'lg',
      sortValue: (row) => (tab === 'pending' ? row.waitingDays : row.seller.joinedAt),
      cell: (row) =>
        tab === 'pending' ? (
          <span className="whitespace-nowrap">
            Waiting {row.waitingDays} {pluralize(row.waitingDays, 'day')}
          </span>
        ) : (
          <span className="whitespace-nowrap">{formatDate(row.seller.joinedAt)}</span>
        ),
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      sortValue: (row) => row.seller.status,
      cell: (row) => <StatusBadge domain="seller" status={row.seller.status} size="sm" withTooltip />,
    },
    {
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'end',
      width: 'xs',
      mobile: 'action',
      cell: (row) => {
        const awaiting = row.seller.status === 'under_review' || row.seller.status === 'action_required'
        const readyToApprove = awaiting && row.kycVerified === row.kycRequired
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton
                label={`Actions for ${row.seller.displayName}`}
                size="sm"
                variant="ghost"
                icon={<Ellipsis aria-hidden />}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem icon={<Eye aria-hidden />} onSelect={() => void navigate(`/admin/sellers/${row.seller.id}`)}>
                View details
              </DropdownMenuItem>
              <DropdownMenuItem
                icon={<Copy aria-hidden />}
                onSelect={() => {
                  void navigator.clipboard.writeText(row.seller.email)
                  toast.success('Email copied')
                }}
              >
                Copy email
              </DropdownMenuItem>
              {row.seller.status === 'active' ? (
                <DropdownMenuItem icon={<Store aria-hidden />} onSelect={() => void navigate(`/store/${row.seller.slug}`)}>
                  View storefront
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              {readyToApprove ? (
                <DropdownMenuItem icon={<BadgeCheck aria-hidden />} onSelect={() => deferred(() => approve(row))}>
                  Approve seller
                </DropdownMenuItem>
              ) : null}
              {awaiting && !readyToApprove ? (
                <DropdownMenuItem
                  icon={<ShieldAlert aria-hidden />}
                  onSelect={() => void navigate(`/admin/sellers/${row.seller.id}?tab=kyc`)}
                >
                  Finish KYC checks
                </DropdownMenuItem>
              ) : null}
              {row.seller.status === 'active' ? (
                <DropdownMenuItem destructive icon={<Ban aria-hidden />} onSelect={() => deferred(() => setSuspended(row, true))}>
                  Suspend seller
                </DropdownMenuItem>
              ) : null}
              {row.seller.status === 'suspended' ? (
                <DropdownMenuItem icon={<BadgeCheck aria-hidden />} onSelect={() => deferred(() => setSuspended(row, false))}>
                  Reinstate seller
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <>
      <PageHeader
        title="Sellers"
        description="Every store on the marketplace, and the applications waiting for a decision."
        meta={query.status === 'success' ? <span>{formatNumber(rows.length)} {pluralize(rows.length, 'seller')}</span> : null}
      >
        <Tabs
          aria-label="Seller accounts"
          value={tab}
          onValueChange={(next) => setTab(next as SellerTab)}
          items={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'pending', label: 'Pending approval', count: counts.under_review },
            { value: 'action_required', label: 'Action required', count: counts.action_required },
            { value: 'active', label: 'Active', count: counts.active },
            { value: 'suspended', label: 'Suspended', count: counts.suspended },
            { value: 'rejected', label: 'Rejected', count: counts.rejected },
          ]}
        />
      </PageHeader>

      {query.status === 'error' ? (
        <LoadFailed title="We couldn’t load the sellers" onRetry={query.retry} />
      ) : (
        <DataTable
          tableId="admin-sellers"
          caption="Sellers registered on the marketplace"
          data={rows}
          columns={columns}
          getRowId={(row) => row.seller.id}
          rowHref={(row) => `/admin/sellers/${row.seller.id}`}
          loading={query.status === 'loading'}
          initialSort={tab === 'pending' ? { id: 'joined', dir: 'desc' } : { id: 'gmv', dir: 'desc' }}
          selectable
          bulkActions={(ids, clear) => (
            <>
              <Button size="sm" variant="outline" leftIcon={<Ban aria-hidden />} onClick={() => void suspendMany(ids, clear)}>
                Suspend
              </Button>
              <ExportButton
                filename="chowk-sellers-selected"
                label="Export selected"
                headers={csvHeaders}
                rows={() => rows.filter((row) => ids.includes(row.seller.id)).map(csvRow)}
              />
            </>
          )}
          toolbar={
            <FilterBar
              search={{ value: q, onChange: setQ, placeholder: 'Search store, legal name, owner or city' }}
              onReset={() => {
                setQ('')
                setTab('all')
              }}
              actions={<ExportButton filename="chowk-sellers" headers={csvHeaders} rows={() => rows.map(csvRow)} />}
            />
          }
          empty={
            <EmptyState
              icon={<Store aria-hidden />}
              title={tab === 'pending' ? 'No applications waiting' : filtered ? 'No sellers match these filters' : 'No sellers yet'}
              description={
                tab === 'pending'
                  ? 'You’ve reviewed every seller application. New ones will appear here.'
                  : filtered
                    ? 'Try a different search, or switch back to All.'
                    : 'Sellers appear here as soon as they apply to sell on Chowk.'
              }
              action={
                filtered ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setQ('')
                      setTab('all')
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/admin/users">View shoppers</Link>
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
