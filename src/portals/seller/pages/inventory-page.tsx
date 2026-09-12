import { Boxes, Ellipsis, Pencil, TriangleAlert, Upload } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import {
  dbActions,
  getSellerInventory,
  useDemoQuery,
  useSession,
  type InventoryRow,
} from '@/data'
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
import { Img } from '@/components/ui/img'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { DataTable, type Column } from '@/components/dashboard/data-table'
import { ExportButton } from '@/components/dashboard/export-button'
import { FilterBar } from '@/components/dashboard/filter-bar'
import { formatNumber, pluralize } from '@/lib/format'
import { useUrlState } from '@/lib/use-url-state'
import { BulkStockDialog, type BulkStockRow } from '../components/bulk-stock-dialog'
import { InlineNumber } from '../components/inline-number'

/** Opening a dialog straight from a menu item fights Radix's focus return; let the menu close first. */
function deferred(run: () => void) {
  window.setTimeout(run, 0)
}

function coverLine(row: InventoryRow): string {
  if (row.variant.stock <= 0) return 'Out of stock'
  if (row.daysOfCover === null) return 'No sales in 30 days'
  return `About ${row.daysOfCover} ${pluralize(row.daysOfCover, 'day')} left`
}

/** Stock and price, editable in place, with the low-stock list one chip away. */
export default function SellerInventoryPage() {
  const sellerId = useSession((state) => state.sellerId)
  const navigate = useNavigate()
  const [q, setQ] = useUrlState<string>('q', '')
  const [low, setLow] = useUrlState<string>('low', '')
  const [bulkOpen, setBulkOpen] = useState(false)

  const lowOnly = low === '1' || low === 'true'
  const query = useDemoQuery((view) => getSellerInventory(view, sellerId, { lowOnly, q }), [sellerId, lowOnly, q])
  // A forced empty state (?demo=empty) still returns real data; the screen must honour it.
  const rows = query.status === 'empty' ? [] : (query.data ?? [])
  const filtered = Boolean(q) || lowOnly
  const lowCount = rows.filter((row) => row.status !== 'in_stock').length

  const update = (row: InventoryRow, patch: { stock?: number; price?: number; lowStockAt?: number }, what: string) => {
    const previous = {
      stock: row.variant.stock,
      price: row.variant.price,
      lowStockAt: row.variant.lowStockAt,
    }
    const result = dbActions.updateVariant(row.product.id, row.variant.id, patch)
    if (!result.ok) {
      toast.error('Could not save that change', { description: result.error })
      return
    }
    toast.success(`${what} updated`, {
      description: `${row.product.title}${row.variant.sku ? ` · ${row.variant.sku}` : ''}`,
      action: {
        label: 'Undo',
        onClick: () => {
          dbActions.updateVariant(row.product.id, row.variant.id, previous)
          toast.message('Change undone')
        },
      },
    })
  }

  const csvHeaders = ['SKU', 'Product', 'Stock', 'Price'] as const
  const csvRow = (row: InventoryRow) => [row.variant.sku, `${row.product.title} ${row.variant.options.colour ?? ''}`.trim(), row.variant.stock, row.variant.price]

  const bulkRows: BulkStockRow[] = rows.map((row) => ({
    sku: row.variant.sku,
    productId: row.product.id,
    variantId: row.variant.id,
    title: row.product.title,
    stock: row.variant.stock,
    price: row.variant.price,
  }))

  const columns: Column<InventoryRow>[] = [
    {
      id: 'product',
      header: 'Product',
      mobile: 'title',
      width: 'lg',
      sortValue: (row) => row.product.title,
      cell: (row) => (
        <span className="flex items-center gap-2.5">
          <Img image={row.product.media[0] ?? 'phone-noir'} alt="" ratio="square" width={40} className="size-10 shrink-0 overflow-hidden rounded-thumb" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate">{row.product.title}</span>
            <span className="type-caption text-fg-muted">
              {Object.values(row.variant.options).filter(Boolean).join(' · ') || 'Single variant'}
            </span>
          </span>
        </span>
      ),
    },
    {
      id: 'sku',
      header: 'SKU',
      hideBelow: 'xl',
      hideable: true,
      mobile: 'subtitle',
      sortValue: (row) => row.variant.sku,
      cell: (row) => <span className="type-code">{row.variant.sku}</span>,
    },
    {
      id: 'stock',
      header: 'Stock',
      align: 'end',
      sortValue: (row) => row.variant.stock,
      cell: (row) => (
        <span className="flex justify-end">
          <InlineNumber
            label={`Stock for ${row.product.title} ${row.variant.sku}`}
            value={row.variant.stock}
            onCommit={(next) => update(row, { stock: next }, 'Stock')}
          />
        </span>
      ),
    },
    {
      id: 'price',
      header: 'Price',
      align: 'end',
      sortValue: (row) => row.variant.price,
      cell: (row) => (
        <span className="flex justify-end">
          <InlineNumber
            label={`Price for ${row.product.title} ${row.variant.sku}`}
            value={row.variant.price}
            prefix="₹"
            min={1}
            onCommit={(next) => update(row, { price: next }, 'Price')}
          />
        </span>
      ),
    },
    {
      id: 'threshold',
      header: 'Low at',
      align: 'end',
      hideBelow: 'xl',
      hideable: true,
      sortValue: (row) => row.variant.lowStockAt,
      cell: (row) => (
        <span className="flex justify-end">
          <InlineNumber
            label={`Low-stock threshold for ${row.variant.sku}`}
            value={row.variant.lowStockAt}
            onCommit={(next) => update(row, { lowStockAt: next }, 'Low-stock threshold')}
          />
        </span>
      ),
    },
    {
      id: 'sold',
      header: 'Sold 30d',
      align: 'end',
      hideBelow: 'lg',
      hideable: true,
      mobile: 'meta',
      sortValue: (row) => row.sold30,
      cell: (row) => formatNumber(row.sold30),
    },
    {
      id: 'cover',
      header: 'Cover',
      hideBelow: 'lg',
      hideable: true,
      sortValue: (row) => row.daysOfCover ?? 9999,
      cell: (row) => <span className="whitespace-nowrap type-caption text-fg-muted">{coverLine(row)}</span>,
    },
    {
      id: 'status',
      header: 'Stock level',
      mobile: 'badge',
      sortValue: (row) => row.variant.stock,
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
            <IconButton label={`Actions for ${row.variant.sku}`} size="sm" variant="ghost" icon={<Ellipsis aria-hidden />} />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem icon={<Pencil aria-hidden />} onSelect={() => void navigate(`/seller/products/${row.product.id}/edit`)}>
              Edit listing
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => deferred(() => update(row, { stock: row.variant.stock + 10 }, 'Stock'))}>
              Add 10 units
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => deferred(() => update(row, { stock: 0 }, 'Stock'))}>
              Mark out of stock
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Type over any stock or price and it saves — with an undo in the toast."
        meta={
          <>
            <span>{formatNumber(rows.length)} variants</span>
            {lowCount > 0 ? <span className="text-warning-subtle-fg">{formatNumber(lowCount)} low or out of stock</span> : null}
          </>
        }
        actions={
          <Button variant="outline" leftIcon={<Upload aria-hidden />} onClick={() => setBulkOpen(true)}>
            Bulk update
          </Button>
        }
      />

      <DataTable
        tableId="seller-inventory"
        caption="Stock and price for every variant you sell"
        data={rows}
        columns={columns}
        getRowId={(row) => row.variant.id}
        loading={query.status === 'loading'}
        initialSort={{ id: 'stock', dir: 'asc' }}
        toolbar={
          <FilterBar
            search={{ value: q, onChange: setQ, placeholder: 'Search product or brand' }}
            facets={[
              {
                id: 'low',
                label: 'Stock level',
                single: true,
                selected: lowOnly ? ['low'] : [],
                onChange: (selected) => setLow(selected[0] === 'low' ? '1' : ''),
                options: [{ value: 'low', label: 'Low stock only' }],
              },
            ]}
            onReset={() => {
              setQ('')
              setLow('')
            }}
            actions={<ExportButton filename="chowk-stock" headers={csvHeaders} rows={() => rows.map(csvRow)} />}
          />
        }
        empty={
          query.status === 'error' ? (
            <EmptyState
              icon={<TriangleAlert aria-hidden />}
              title="We couldn’t load your stock"
              description="The list didn’t come back. Try again."
              action={<Button onClick={query.retry}>Retry</Button>}
            />
          ) : filtered ? (
            <EmptyState
              icon={<Boxes aria-hidden />}
              title={lowOnly ? 'Nothing is running low' : 'No variants match this search'}
              description={
                lowOnly
                  ? 'Every variant is comfortably above its low-stock threshold.'
                  : 'Try a different search, or clear the filters.'
              }
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setQ('')
                    setLow('')
                  }}
                >
                  Show all stock
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Boxes aria-hidden />}
              title="Nothing to stock yet"
              description="Inventory appears here once a listing has been submitted for review. Drafts are not counted."
              action={
                <Button size="sm" asChild>
                  <Link to="/seller/products/new">Add product</Link>
                </Button>
              }
            />
          )
        }
      />

      <BulkStockDialog open={bulkOpen} onOpenChange={setBulkOpen} rows={bulkRows} />
    </>
  )
}
