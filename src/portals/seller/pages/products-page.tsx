import { CircleCheck, Ellipsis, EyeOff, Package, Pencil, Plus, Store, TriangleAlert } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import {
  dbActions,
  getSellerProducts,
  productStock,
  productStockStatus,
  sellerProductPrice,
  useDb,
  useDemoQuery,
  useSession,
  type Product,
  type SellerProductTab,
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
import { Tabs } from '@/components/ui/tabs'
import { DataTable, type Column } from '@/components/dashboard/data-table'
import { ExportButton } from '@/components/dashboard/export-button'
import { FilterBar } from '@/components/dashboard/filter-bar'
import { useConfirm } from '@/components/ui/use-confirm'
import { formatDate, formatINR, formatNumber, formatRelative } from '@/lib/format'
import { useUrlState } from '@/lib/use-url-state'

/** Opening a dialog straight from a menu item fights Radix's focus return; let the menu close first. */
function deferred(run: () => void) {
  window.setTimeout(run, 0)
}

const TABS: { value: SellerProductTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'pending', label: 'Pending review' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'draft', label: 'Draft' },
  { value: 'inactive', label: 'Inactive' },
]

/** The seller's catalogue, grouped by where each listing stands with moderation. */
export default function SellerProductsPage() {
  const sellerId = useSession((state) => state.sellerId)
  const navigate = useNavigate()
  const confirm = useConfirm()
  const [tab, setTab] = useUrlState<SellerProductTab>('tab', 'all')
  const [q, setQ] = useUrlState<string>('q', '')

  const counts = useDb(
    (view) => {
      const all = getSellerProducts(view, sellerId)
      return {
        all: all.length,
        live: all.filter((product) => product.status === 'live').length,
        pending: all.filter((product) => product.status === 'pending').length,
        rejected: all.filter((product) => product.status === 'rejected' || product.status === 'blocked').length,
        draft: all.filter((product) => product.status === 'draft').length,
        inactive: all.filter((product) => product.status === 'inactive').length,
      }
    },
    [sellerId],
  )

  const query = useDemoQuery((view) => getSellerProducts(view, sellerId, { tab, q }), [sellerId, tab, q])
  // A forced empty state (?demo=empty) still returns real data; the screen must honour it.
  const rows = query.status === 'empty' ? [] : (query.data ?? [])
  const filtered = Boolean(q) || tab !== 'all'

  const setActive = async (product: Product, active: boolean) => {
    if (!active) {
      const ok = await confirm({
        title: `Hide ${product.title}?`,
        description: 'Shoppers will not see this listing until you activate it again. Open orders are unaffected.',
        confirmLabel: 'Hide listing',
      })
      if (!ok) return
    }
    const result = dbActions.setProductActive(product.id, active)
    if (!result.ok) {
      toast.error('Could not update this listing', { description: result.error })
      return
    }
    toast.success(active ? 'Listing is live again' : 'Listing hidden', {
      description: active ? 'Shoppers can buy it now.' : 'Activate it from this list whenever you are ready.',
    })
  }

  const bulkSetActive = async (ids: string[], clear: () => void, active: boolean) => {
    const targets = rows.filter(
      (product) => ids.includes(product.id) && (active ? product.status === 'inactive' : product.status === 'live'),
    )
    if (targets.length === 0) {
      toast.message(active ? 'Nothing to activate' : 'Nothing to hide', {
        description: active
          ? 'Only listings you have hidden can be activated. Rejected and draft listings go through review.'
          : 'Only live listings can be hidden.',
      })
      return
    }
    if (!active) {
      const ok = await confirm({
        title: `Hide ${targets.length} ${targets.length === 1 ? 'listing' : 'listings'}?`,
        description: 'Shoppers will not see them until you activate them again.',
        confirmLabel: 'Hide listings',
      })
      if (!ok) return
    }
    targets.forEach((product) => dbActions.setProductActive(product.id, active))
    clear()
    const skipped = ids.length - targets.length
    toast.success(`${targets.length} ${targets.length === 1 ? 'listing' : 'listings'} ${active ? 'activated' : 'hidden'}`, {
      description: skipped > 0 ? `${skipped} skipped — only live or hidden listings can be switched.` : undefined,
    })
  }

  const csvHeaders = ['Title', 'Brand', 'Status', 'Price', 'Stock', 'Variants', 'Updated'] as const
  const csvRow = (product: Product) => [
    product.title,
    product.brand,
    product.status,
    sellerProductPrice(product),
    productStock(product),
    product.variants.length,
    formatDate(product.updatedAt),
  ]

  const columns: Column<Product>[] = [
    {
      id: 'title',
      header: 'Listing',
      mobile: 'title',
      width: 'lg',
      sortValue: (product) => product.title,
      cell: (product) => (
        <span className="flex items-center gap-2.5">
          <Img image={product.media[0] ?? 'phone-noir'} alt="" ratio="square" width={40} className="size-10 shrink-0 overflow-hidden rounded-thumb" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate">{product.title}</span>
            <span className="type-caption text-fg-muted">{product.brand}</span>
          </span>
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      sortValue: (product) => product.status,
      cell: (product) => <StatusBadge domain="listing" status={product.status} size="sm" withTooltip />,
    },
    {
      id: 'reason',
      header: 'What to fix',
      hideBelow: 'xl',
      hideable: true,
      cell: (product) =>
        product.moderation?.reason && (product.status === 'rejected' || product.status === 'blocked') ? (
          <span className="line-clamp-2 type-caption text-danger-subtle-fg">{product.moderation.reason}</span>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
    {
      id: 'price',
      header: 'Price',
      align: 'end',
      mobile: 'meta',
      sortValue: (product) => sellerProductPrice(product),
      cell: (product) => formatINR(sellerProductPrice(product)),
    },
    {
      id: 'stock',
      header: 'Stock',
      align: 'end',
      mobile: 'meta',
      sortValue: (product) => productStock(product),
      cell: (product) => {
        const status = productStockStatus(product)
        return (
          <span className="inline-flex items-center justify-end gap-1.5">
            <span className="text-fg">{formatNumber(productStock(product))}</span>
            {status === 'in_stock' ? null : <StatusBadge domain="stock" status={status} size="sm" withTooltip />}
          </span>
        )
      },
    },
    {
      id: 'variants',
      header: 'Variants',
      align: 'end',
      hideBelow: 'lg',
      hideable: true,
      sortValue: (product) => product.variants.length,
      cell: (product) => formatNumber(product.variants.length),
    },
    {
      id: 'updated',
      header: 'Updated',
      hideBelow: 'lg',
      hideable: true,
      sortValue: (product) => product.updatedAt,
      cell: (product) => <span className="whitespace-nowrap">{formatRelative(product.updatedAt)}</span>,
    },
    {
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'end',
      width: 'xs',
      mobile: 'action',
      cell: (product) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton label={`Actions for ${product.title}`} size="sm" variant="ghost" icon={<Ellipsis aria-hidden />} />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem icon={<Pencil aria-hidden />} onSelect={() => void navigate(`/seller/products/${product.id}/edit`)}>
              {product.status === 'rejected' ? 'Fix and resubmit' : 'Edit listing'}
            </DropdownMenuItem>
            {product.status === 'live' ? (
              <DropdownMenuItem icon={<Store aria-hidden />} onSelect={() => void navigate(`/p/${product.slug}`)}>
                View on Chowk
              </DropdownMenuItem>
            ) : null}
            {product.status === 'live' || product.status === 'inactive' ? (
              <>
                <DropdownMenuSeparator />
                {product.status === 'live' ? (
                  <DropdownMenuItem destructive icon={<EyeOff aria-hidden />} onSelect={() => deferred(() => void setActive(product, false))}>
                    Hide listing
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem icon={<CircleCheck aria-hidden />} onSelect={() => deferred(() => void setActive(product, true))}>
                    Activate listing
                  </DropdownMenuItem>
                )}
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Products"
        description="Every listing you have, and exactly where it stands with catalogue moderation."
        meta={
          <>
            <span>{formatNumber(counts.all)} listings</span>
            <span>{formatNumber(counts.live)} live</span>
            {counts.rejected > 0 ? <span className="text-danger-subtle-fg">{formatNumber(counts.rejected)} need fixing</span> : null}
          </>
        }
        actions={
          <Button leftIcon={<Plus aria-hidden />} asChild>
            <Link to="/seller/products/new">Add product</Link>
          </Button>
        }
      >
        <Tabs
          aria-label="Listing status"
          value={tab}
          onValueChange={(value) => setTab(value as SellerProductTab)}
          items={TABS.map((entry) => ({ value: entry.value, label: entry.label, count: counts[entry.value] }))}
        />
      </PageHeader>

      <DataTable
        tableId="seller-products"
        caption="Your listings, by moderation status"
        data={rows}
        columns={columns}
        getRowId={(product) => product.id}
        rowHref={(product) => `/seller/products/${product.id}/edit`}
        loading={query.status === 'loading'}
        initialSort={{ id: 'updated', dir: 'desc' }}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <Button size="sm" variant="outline" leftIcon={<CircleCheck aria-hidden />} onClick={() => void bulkSetActive(ids, clear, true)}>
              Activate
            </Button>
            <Button size="sm" variant="outline" leftIcon={<EyeOff aria-hidden />} onClick={() => void bulkSetActive(ids, clear, false)}>
              Hide
            </Button>
            <ExportButton
              filename="chowk-listings-selected"
              label="Export selected"
              headers={csvHeaders}
              rows={() => rows.filter((product) => ids.includes(product.id)).map(csvRow)}
            />
          </>
        )}
        toolbar={
          <FilterBar
            search={{ value: q, onChange: setQ, placeholder: 'Search title or brand' }}
            onReset={() => {
              setQ('')
              setTab('all')
            }}
            actions={<ExportButton filename="chowk-listings" headers={csvHeaders} rows={() => rows.map(csvRow)} />}
          />
        }
        empty={
          query.status === 'error' ? (
            <EmptyState
              icon={<TriangleAlert aria-hidden />}
              title="We couldn’t load your listings"
              description="The catalogue didn’t come back. Try again."
              action={<Button onClick={query.retry}>Retry</Button>}
            />
          ) : filtered ? (
            <EmptyState
              icon={<Package aria-hidden />}
              title="No listings here"
              description={
                tab === 'rejected'
                  ? 'Nothing has been rejected — that is the tab you want to keep empty.'
                  : 'Try another tab, or clear the search.'
              }
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setQ('')
                    setTab('all')
                  }}
                >
                  Show all listings
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Package aria-hidden />}
              title="You haven’t listed anything yet"
              description="Add your first product. Most listings pass review the first time if the images are clean and the category is right."
              action={
                <Button size="sm" asChild>
                  <Link to="/seller/products/new">Add product</Link>
                </Button>
              }
            />
          )
        }
      />
    </>
  )
}
