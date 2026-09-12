import { Ban, CircleCheck, Copy, Ellipsis, Eye, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Link, useNavigate } from 'react-router'
import { dbActions, getCustomers, useDemoQuery, type CustomerRow } from '@/data'
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
import { DataTable, type Column } from '@/components/dashboard/data-table'
import { ExportButton } from '@/components/dashboard/export-button'
import { FilterBar } from '@/components/dashboard/filter-bar'
import { useConfirm } from '@/components/ui/use-confirm'
import { formatINR, formatNumber, formatPercent, formatRelative } from '@/lib/format'
import { maskEmail, formatPhone } from '@/lib/mask'
import { useUrlState } from '@/lib/use-url-state'

/** Opening a dialog straight from a menu item fights Radix's focus return; let the menu close first. */
function deferred(run: () => void) {
  window.setTimeout(run, 0)
}

/** Shoppers on the marketplace. The reference implementation of the table pattern. */
export default function AdminUsersPage() {
  const [q, setQ] = useUrlState<string>('q', '')
  const [status, setStatus] = useUrlState<'all' | 'active' | 'blocked'>('status', 'all')
  const confirm = useConfirm()
  const navigate = useNavigate()

  const query = useDemoQuery((view) => getCustomers(view, { q, status }), [q, status])
  const rows = query.data ?? []

  const toggleBlock = async (row: CustomerRow) => {
    const blocking = row.customer.status === 'active'
    const ok = await confirm({
      title: blocking ? `Block ${row.customer.name}?` : `Unblock ${row.customer.name}?`,
      description: blocking
        ? 'They will not be able to place new orders. Existing orders are unaffected.'
        : 'They will be able to shop and place orders again.',
      confirmLabel: blocking ? 'Block shopper' : 'Unblock shopper',
      tone: blocking ? 'danger' : 'default',
    })
    if (!ok) return
    dbActions.setCustomerStatus(row.customer.id, blocking ? 'blocked' : 'active', blocking ? 'Repeated return abuse' : undefined)
    toast.success(blocking ? 'Shopper blocked' : 'Shopper unblocked', {
      description: `${row.customer.name} · ${blocking ? 'cannot place new orders' : 'can shop again'}`,
    })
  }

  const blockMany = async (ids: string[], clear: () => void) => {
    const targets = rows.filter((row) => ids.includes(row.customer.id) && row.customer.status === 'active')
    if (!targets.length) {
      toast.message('Nothing to block', { description: 'Every shopper you selected is already blocked.' })
      return
    }
    const ok = await confirm({
      title: `Block ${targets.length} ${targets.length === 1 ? 'shopper' : 'shoppers'}?`,
      description: 'They will not be able to place new orders. Existing orders are unaffected.',
      confirmLabel: 'Block shoppers',
      tone: 'danger',
    })
    if (!ok) return
    targets.forEach((row) => dbActions.setCustomerStatus(row.customer.id, 'blocked', 'Repeated return abuse'))
    clear()
    toast.success(`${targets.length} ${targets.length === 1 ? 'shopper' : 'shoppers'} blocked`, {
      description: 'They can be unblocked from this list at any time.',
    })
  }

  const csvHeaders = ['Name', 'Email', 'Mobile', 'Orders', 'Total spend', 'Return rate', 'Status'] as const
  const csvRow = (row: CustomerRow) => [
    row.customer.name,
    row.customer.email,
    row.customer.phone,
    row.orders,
    row.spend,
    `${Math.round(row.returnRatio * 100)}%`,
    row.customer.status,
  ]

  const columns: Column<CustomerRow>[] = [
    {
      id: 'name',
      header: 'Shopper',
      mobile: 'title',
      sortValue: (row) => row.customer.name,
      cell: (row) => (
        <span className="flex items-center gap-2.5">
          <Avatar name={row.customer.name} size="sm" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate">{row.customer.name}</span>
            <span className="type-caption text-fg-muted">{maskEmail(row.customer.email)}</span>
          </span>
        </span>
      ),
    },
    {
      id: 'phone',
      header: 'Mobile',
      hideable: true,
      defaultHidden: true,
      mobile: 'subtitle',
      cell: (row) => <span className="whitespace-nowrap tabular">{formatPhone(row.customer.phone)}</span>,
    },
    {
      id: 'orders',
      header: 'Orders',
      align: 'end',
      sortValue: (row) => row.orders,
      mobile: 'meta',
      cell: (row) => formatNumber(row.orders),
    },
    {
      id: 'spend',
      header: 'Total spend',
      align: 'end',
      sortValue: (row) => row.spend,
      mobile: 'meta',
      cell: (row) => formatINR(row.spend),
    },
    {
      id: 'returns',
      header: 'Return rate',
      align: 'end',
      hideBelow: 'md',
      hideable: true,
      sortValue: (row) => row.returnRatio,
      cell: (row) => (
        <span className={row.returnRatio > 0.3 ? 'text-warning-subtle-fg' : undefined}>
          {formatPercent(row.returnRatio, { decimals: 0 })}
        </span>
      ),
    },
    {
      id: 'last',
      header: 'Last order',
      hideBelow: 'xl',
      hideable: true,
      sortValue: (row) => row.lastOrderAt ?? '',
      cell: (row) => (
        <span className="whitespace-nowrap">
          {row.lastOrderAt ? formatRelative(row.lastOrderAt) : <span className="text-fg-subtle">Never</span>}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      sortValue: (row) => row.customer.status,
      cell: (row) => <StatusBadge domain="customer" status={row.customer.status} size="sm" />,
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
            <IconButton label={`Actions for ${row.customer.name}`} size="sm" variant="ghost" icon={<Ellipsis aria-hidden />} />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem icon={<Eye aria-hidden />} onSelect={() => void navigate(`/admin/users/${row.customer.id}`)}>
              View details
            </DropdownMenuItem>
            <DropdownMenuItem
              icon={<Copy aria-hidden />}
              onSelect={() => {
                void navigator.clipboard.writeText(row.customer.email)
                toast.success('Email copied')
              }}
            >
              Copy email
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {row.customer.status === 'active' ? (
              <DropdownMenuItem destructive icon={<Ban aria-hidden />} onSelect={() => deferred(() => toggleBlock(row))}>
                Block shopper
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem icon={<CircleCheck aria-hidden />} onSelect={() => deferred(() => toggleBlock(row))}>
                Unblock shopper
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
        title="Customers"
        description="Everyone shopping on the marketplace. Staff accounts live under Settings › Team."
        meta={query.status === 'success' ? <span>{formatNumber(rows.length)} shoppers</span> : null}
      />

      <DataTable
        tableId="admin-customers"
        caption="Shoppers registered on the marketplace"
        data={rows}
        columns={columns}
        getRowId={(row) => row.customer.id}
        rowHref={(row) => `/admin/users/${row.customer.id}`}
        loading={query.status === 'loading'}
        initialSort={{ id: 'spend', dir: 'desc' }}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <Button size="sm" variant="outline" leftIcon={<Ban aria-hidden />} onClick={() => void blockMany(ids, clear)}>
              Block
            </Button>
            <ExportButton
              filename="chowk-customers-selected"
              label="Export selected"
              headers={csvHeaders}
              rows={() => rows.filter((row) => ids.includes(row.customer.id)).map(csvRow)}
            />
          </>
        )}
        toolbar={
          <FilterBar
            search={{ value: q, onChange: setQ, placeholder: 'Search name, email or mobile' }}
            facets={[
              {
                id: 'status',
                label: 'Status',
                single: true,
                selected: status === 'all' ? [] : [status],
                onChange: (selected) => setStatus((selected[0] as 'active' | 'blocked') ?? 'all'),
                options: [
                  { value: 'active', label: 'Active' },
                  { value: 'blocked', label: 'Blocked' },
                ],
              },
            ]}
            onReset={() => {
              setQ('')
              setStatus('all')
            }}
            actions={
              <ExportButton filename="chowk-customers" headers={csvHeaders} rows={() => rows.map(csvRow)} />
            }
          />
        }
        empty={
          <EmptyState
            icon={<Users aria-hidden />}
            title={q || status !== 'all' ? 'No shoppers match these filters' : 'No shoppers yet'}
            description={
              q || status !== 'all'
                ? 'Try a different search, or clear the status filter.'
                : 'Shoppers appear here as soon as they create an account.'
            }
            action={
              q || status !== 'all' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setQ('')
                    setStatus('all')
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" variant="outline" asChild>
                  <Link to="/admin/sellers">View sellers</Link>
                </Button>
              )
            }
          />
        }
      />
    </>
  )
}
