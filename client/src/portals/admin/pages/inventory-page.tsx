import { Bell, Boxes, Ellipsis, Eye, Store } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { dbActions, getLowStock, useDb, useDemoQuery } from '@/data'
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
import { Switch } from '@/components/ui/switch'
import { DataTable, type Column } from '@/components/dashboard/data-table'
import { ExportButton } from '@/components/dashboard/export-button'
import { FilterBar } from '@/components/dashboard/filter-bar'
import { useConfirm } from '@/components/ui/use-confirm'
import { formatINR, formatNumber, pluralize } from '@/lib/format'
import { useUrlState } from '@/lib/use-url-state'
import { LoadFailed } from '../components/record-states'

/** Opening a dialog straight from a menu item fights Radix's focus return; let the menu close first. */
function deferred(run: () => void) {
  window.setTimeout(run, 0)
}

/** What is running out across every seller, and who needs telling. */
export default function AdminInventoryPage() {
  const [q, setQ] = useUrlState<string>('q', '')
  const [sellerId, setSellerId] = useUrlState<string>('seller', '')
  const [status, setStatus] = useUrlState<string>('status', '')
  const [includeInStock, setIncludeInStock] = useUrlState<string>('all', '')
  const confirm = useConfirm()
  const navigate = useNavigate()

  const sellers = useDb((view) => view.sellers.map((seller) => ({ value: seller.id, label: seller.displayName })), [])

  const query = useDemoQuery(
    (view) => {
      const needle = q.trim().toLowerCase()
      return getLowStock(view, {
        ...(sellerId ? { sellerId } : {}),
        ...(includeInStock ? { includeInStock: true } : {}),
      })
        .filter((row) => !status || row.status === status)
        .filter(
          (row) =>
            !needle ||
            row.product.title.toLowerCase().includes(needle) ||
            row.product.brand.toLowerCase().includes(needle) ||
            row.sku.toLowerCase().includes(needle),
        )
    },
    [q, sellerId, status, includeInStock],
  )

  // `?demo=empty` still hands back real rows, so blank them here to show the empty state.
  const rows = query.status === 'empty' ? [] : (query.data ?? [])
  type Row = (typeof rows)[number]

  const filtered = Boolean(q || sellerId || status)
  const resetAll = () => {
    setQ('')
    setSellerId('')
    setStatus('')
  }

  const notify = async (row: Row) => {
    const ok = await confirm({
      title: `Tell ${row.seller?.displayName ?? 'the seller'} about this?`,
      description: `They will see a low-stock alert for ${row.product.title} (${row.label}), which has ${row.stock} ${pluralize(row.stock, 'unit')} left.`,
      confirmLabel: 'Send alert',
    })
    if (!ok) return
    if (!row.seller) return
    const result = dbActions.notifySeller(row.seller.id, {
      kind: 'stock',
      title: 'Running low on stock',
      body: `${row.product.title} (${row.label}) has ${row.stock} ${pluralize(row.stock, 'unit')} left.`,
      href: '/seller/inventory?low=1',
    })
    if (!result.ok) {
      toast.error('Could not send the alert', { description: result.error })
      return
    }
    toast.success('Low-stock alert sent', {
      description: `${row.seller.displayName} · ${row.sku} — visible in Seller Hub.`,
    })
  }

  const notifyMany = async (ids: string[], clear: () => void) => {
    const targets = rows.filter((row) => ids.includes(row.variantId))
    if (!targets.length) return
    const stores = new Set(targets.map((row) => row.seller?.id ?? ''))
    const ok = await confirm({
      title: `Send ${targets.length} low-stock ${pluralize(targets.length, 'alert')}?`,
      description: `${stores.size} ${pluralize(stores.size, 'seller')} will be told which of their variants are running out.`,
      confirmLabel: 'Send alerts',
    })
    if (!ok) return
    // One alert per seller, listing the variants that are running out.
    for (const sellerId of stores) {
      if (!sellerId) continue
      const theirs = targets.filter((row) => row.seller?.id === sellerId)
      dbActions.notifySeller(sellerId, {
        kind: 'stock',
        title: `${theirs.length} ${pluralize(theirs.length, 'variant')} running low`,
        body: theirs.map((row) => `${row.product.title} (${row.label}) · ${row.stock} left`).join('; '),
        href: '/seller/inventory?low=1',
      })
    }
    clear()
    toast.success(`${targets.length} ${pluralize(targets.length, 'alert')} sent`, {
      description: `Across ${stores.size} ${pluralize(stores.size, 'seller')} — visible in Seller Hub.`,
    })
  }

  const csvHeaders = ['Product', 'Brand', 'Variant', 'SKU', 'Seller', 'Stock', 'Price', 'Status'] as const
  const csvRow = (row: Row) => [
    row.product.title,
    row.product.brand,
    row.label,
    row.sku,
    row.seller?.displayName ?? '',
    row.stock,
    row.product.variants.find((variant) => variant.id === row.variantId)?.price ?? '',
    row.status,
  ]

  const columns: Column<Row>[] = [
    {
      id: 'product',
      header: 'Product',
      mobile: 'title',
      sortValue: (row) => row.product.title,
      cell: (row) => (
        <span className="flex min-w-0 flex-col">
          <span className="line-clamp-2">{row.product.title}</span>
          <span className="type-caption text-fg-muted">{row.product.brand}</span>
        </span>
      ),
    },
    {
      id: 'variant',
      header: 'Variant',
      mobile: 'subtitle',
      sortValue: (row) => row.label,
      cell: (row) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate">{row.label}</span>
          <span className="font-mono type-caption text-fg-muted">{row.sku}</span>
        </span>
      ),
    },
    {
      id: 'seller',
      header: 'Seller',
      hideBelow: 'lg',
      mobile: 'subtitle',
      sortValue: (row) => row.seller?.displayName ?? '',
      cell: (row) => <span className="truncate">{row.seller?.displayName ?? 'Seller removed'}</span>,
    },
    {
      id: 'price',
      header: 'Price',
      align: 'end',
      hideBelow: 'xl',
      hideable: true,
      sortValue: (row) => row.product.variants.find((variant) => variant.id === row.variantId)?.price ?? 0,
      cell: (row) => formatINR(row.product.variants.find((variant) => variant.id === row.variantId)?.price ?? 0),
    },
    {
      id: 'stock',
      header: 'Left',
      align: 'end',
      mobile: 'meta',
      sortValue: (row) => row.stock,
      cell: (row) => formatNumber(row.stock),
    },
    {
      id: 'status',
      header: 'Stock',
      mobile: 'badge',
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge domain="stock" status={row.status} size="sm" withTooltip />,
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
            <IconButton label={`Actions for ${row.sku}`} size="sm" variant="ghost" icon={<Ellipsis aria-hidden />} />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem icon={<Bell aria-hidden />} onSelect={() => deferred(() => notify(row))}>
              Notify seller
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem icon={<Eye aria-hidden />} onSelect={() => void navigate(`/admin/products/${row.product.id}`)}>
              View listing
            </DropdownMenuItem>
            {row.seller ? (
              <DropdownMenuItem icon={<Store aria-hidden />} onSelect={() => void navigate(`/admin/sellers/${row.seller?.id ?? ''}`)}>
                View seller
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
        title="Inventory"
        description="Variants that are out of stock or running low, across every live listing on the marketplace."
        meta={
          query.status === 'success' ? (
            <span>
              {formatNumber(rows.length)} {pluralize(rows.length, 'variant')}
            </span>
          ) : null
        }
      />

      {query.status === 'error' ? (
        <LoadFailed title="We couldn’t load the stock levels" onRetry={query.retry} />
      ) : (
        <DataTable
          tableId="admin-inventory"
          caption="Low and out-of-stock variants across the marketplace"
          data={rows}
          columns={columns}
          getRowId={(row) => row.variantId}
          loading={query.status === 'loading'}
          initialSort={{ id: 'stock', dir: 'asc' }}
          selectable
          bulkActions={(ids, clear) => (
            <>
              <Button size="sm" variant="outline" leftIcon={<Bell aria-hidden />} onClick={() => void notifyMany(ids, clear)}>
                Notify sellers
              </Button>
              <ExportButton
                filename="chowk-inventory-selected"
                label="Export selected"
                headers={csvHeaders}
                rows={() => rows.filter((row) => ids.includes(row.variantId)).map(csvRow)}
              />
            </>
          )}
          toolbar={
            <FilterBar
              search={{ value: q, onChange: setQ, placeholder: 'Search product, brand or SKU' }}
              facets={[
                {
                  id: 'status',
                  label: 'Stock',
                  single: true,
                  selected: status ? [status] : [],
                  onChange: (selected) => setStatus(selected[0] ?? ''),
                  options: [
                    { value: 'out_of_stock', label: 'Out of stock' },
                    { value: 'low_stock', label: 'Low stock' },
                    ...(includeInStock ? [{ value: 'in_stock', label: 'In stock' }] : []),
                  ],
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
              actions={
                <>
                  <Switch
                    label="Include in stock"
                    checked={includeInStock === '1'}
                    onCheckedChange={(checked) => setIncludeInStock(checked ? '1' : '')}
                  />
                  <ExportButton filename="chowk-inventory" headers={csvHeaders} rows={() => rows.map(csvRow)} />
                </>
              }
            />
          }
          empty={
            <EmptyState
              icon={<Boxes aria-hidden />}
              title={filtered ? 'Nothing matches these filters' : 'Everything is in stock'}
              description={
                filtered
                  ? 'Try a different search, or clear the seller and stock filters.'
                  : 'No live variant is out of stock or below its low-stock threshold right now.'
              }
              action={
                filtered ? (
                  <Button size="sm" variant="outline" onClick={resetAll}>
                    Clear filters
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/admin/products">View the catalogue</Link>
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
