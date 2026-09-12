import { Ban, CircleCheck, Copy, Ellipsis, Eye, Package, Store } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import {
  DEMO_NOW,
  dbActions,
  getModerationQueue,
  productPrice,
  productStock,
  useDb,
  useDemoQuery,
  type Product,
  type ProductStatus,
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
import { SectionCard } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { Tabs } from '@/components/ui/tabs'
import { DataTable, type Column } from '@/components/dashboard/data-table'
import { ExportButton } from '@/components/dashboard/export-button'
import { FilterBar } from '@/components/dashboard/filter-bar'
import { useConfirm } from '@/components/ui/use-confirm'
import { formatDate, formatINR, formatNumber, formatRating, pluralize } from '@/lib/format'
import { statusOptions, stockStatus } from '@/lib/status'
import { useUrlState } from '@/lib/use-url-state'
import { ModerationDiff } from '../components/moderation-diff'
import { LoadFailed } from '../components/record-states'
import { ReasonSheet, type ReasonTemplate } from '../components/reason-sheet'

/** Opening a dialog straight from a menu item fights Radix's focus return; let the menu close first. */
function deferred(run: () => void) {
  window.setTimeout(run, 0)
}

const BLOCK_REASON = 'Blocked by the catalogue team while a policy check is completed.'

const REJECT_TEMPLATES: ReasonTemplate[] = [
  {
    id: 'watermark',
    label: 'Images contain watermarks',
    body: 'Listing rejected: images contain watermarks. Replace images 2 and 4, then resubmit.',
  },
  {
    id: 'title',
    label: 'Title reads like an advert',
    body: 'Listing rejected: the title contains promotional words such as “best” and “sale”. Write the title as brand, product and key attribute only, then resubmit.',
  },
  {
    id: 'category',
    label: 'Filed in the wrong category',
    body: 'Listing rejected: this product is filed in the wrong category, so shoppers will not find it and the commission and GST would be wrong. Move it to the right category and resubmit.',
  },
  {
    id: 'compliance',
    label: 'Compliance details missing',
    body: 'Listing rejected: country of origin and the manufacturer or importer address are required on every listing. Add both under Compliance, then resubmit.',
  },
]

/** The catalogue, and the queue of listings waiting for a decision. */
export default function AdminProductsPage() {
  const [tab, setTab] = useUrlState<'catalogue' | 'moderation'>('tab', 'catalogue')
  const [q, setQ] = useUrlState<string>('q', '')
  const [status, setStatus] = useUrlState<string>('status', '')
  const [sellerId, setSellerId] = useUrlState<string>('seller', '')
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const confirm = useConfirm()
  const navigate = useNavigate()

  const sellers = useDb((view) => view.sellers.map((seller) => ({ value: seller.id, label: seller.displayName })), [])
  const pendingCount = useDb((view) => view.products.filter((product) => product.status === 'pending').length, [])

  const catalogue = useDemoQuery(
    (view) => {
      const needle = q.trim().toLowerCase()
      return view.products
        .filter((product) => !status || product.status === status)
        .filter((product) => !sellerId || product.sellerId === sellerId)
        .filter(
          (product) =>
            !needle ||
            product.title.toLowerCase().includes(needle) ||
            product.brand.toLowerCase().includes(needle) ||
            (view.sellerById.get(product.sellerId)?.displayName ?? '').toLowerCase().includes(needle),
        )
        .map((product) => ({
          product,
          sellerName: view.sellerById.get(product.sellerId)?.displayName ?? 'Seller removed',
          categoryName: view.categoryById.get(product.categoryId)?.name ?? '—',
        }))
    },
    [q, status, sellerId],
  )

  const moderation = useDemoQuery(
    (view) =>
      getModerationQueue(view, DEMO_NOW).map((row) => ({
        ...row,
        categoryName: view.categoryById.get(row.product.categoryId)?.name ?? '—',
      })),
    [],
  )

  // `?demo=empty` still hands back real rows, so blank them here to show the empty state.
  const rows = catalogue.status === 'empty' ? [] : (catalogue.data ?? [])
  const queue = moderation.status === 'empty' ? [] : (moderation.data ?? [])
  type Row = (typeof rows)[number]

  const filtered = Boolean(q || status || sellerId)
  const resetAll = () => {
    setQ('')
    setStatus('')
    setSellerId('')
  }

  const approve = (product: Product) => {
    dbActions.moderateProduct(product.id, 'approve')
    toast.success('Listing approved', { description: `${product.title} is live on Chowk.` })
  }

  const submitReject = () => {
    const text = message.trim()
    if (!rejecting || !text) return
    dbActions.moderateProduct(rejecting, 'reject', text)
    setRejecting(null)
    toast.success('Listing rejected', { description: 'The seller sees your reason on the listing, word for word.' })
  }

  const setBlocked = async (product: Product, block: boolean) => {
    const ok = await confirm({
      title: block ? `Block “${product.title}”?` : `Restore “${product.title}”?`,
      description: block
        ? `It disappears from the storefront straight away. The seller will see: “${BLOCK_REASON}”`
        : 'The listing goes back on sale under its previous status.',
      confirmLabel: block ? 'Block listing' : 'Restore listing',
      tone: block ? 'danger' : 'default',
    })
    if (!ok) return
    if (block) dbActions.moderateProduct(product.id, 'block', BLOCK_REASON)
    else dbActions.moderateProduct(product.id, 'approve')
    toast.success(block ? 'Listing blocked' : 'Listing restored', { description: product.title })
  }

  const blockMany = async (ids: string[], clear: () => void) => {
    const targets = rows.filter((row) => ids.includes(row.product.id) && row.product.status !== 'blocked')
    if (!targets.length) {
      toast.message('Nothing to block', { description: 'Every listing you selected is already blocked.' })
      return
    }
    const ok = await confirm({
      title: `Block ${targets.length} ${pluralize(targets.length, 'listing')}?`,
      description: `They disappear from the storefront straight away. Each seller will see: “${BLOCK_REASON}”`,
      confirmLabel: 'Block listings',
      tone: 'danger',
    })
    if (!ok) return
    targets.forEach((row) => dbActions.moderateProduct(row.product.id, 'block', BLOCK_REASON))
    clear()
    toast.success(`${targets.length} ${pluralize(targets.length, 'listing')} blocked`, {
      description: 'Restore them from this list once the check is done.',
    })
  }

  const csvHeaders = ['Title', 'Brand', 'Seller', 'Category', 'Price', 'Stock', 'Rating', 'Status', 'Updated'] as const
  const csvRow = (row: Row) => [
    row.product.title,
    row.product.brand,
    row.sellerName,
    row.categoryName,
    productPrice(row.product),
    productStock(row.product),
    row.product.rating.avg,
    row.product.status,
    row.product.updatedAt.slice(0, 10),
  ]

  const columns: Column<Row>[] = [
    {
      id: 'title',
      header: 'Listing',
      mobile: 'title',
      sortValue: (row) => row.product.title,
      cell: (row) => (
        <span className="flex items-center gap-2.5">
          {row.product.media[0] ? (
            <Img
              image={row.product.media[0]}
              alt=""
              ratio="square"
              width={96}
              sizes="40px"
              className="size-10 shrink-0 rounded-thumb"
            />
          ) : null}
          <span className="flex min-w-0 flex-col">
            <span className="line-clamp-2">{row.product.title}</span>
            <span className="type-caption text-fg-muted">{row.product.brand}</span>
          </span>
        </span>
      ),
    },
    {
      id: 'seller',
      header: 'Seller',
      hideBelow: 'lg',
      mobile: 'subtitle',
      sortValue: (row) => row.sellerName,
      cell: (row) => <span className="truncate">{row.sellerName}</span>,
    },
    {
      id: 'category',
      header: 'Category',
      hideBelow: 'xl',
      hideable: true,
      sortValue: (row) => row.categoryName,
      cell: (row) => <span className="truncate">{row.categoryName}</span>,
    },
    {
      id: 'price',
      header: 'Price',
      align: 'end',
      mobile: 'meta',
      sortValue: (row) => productPrice(row.product),
      cell: (row) => formatINR(productPrice(row.product)),
    },
    {
      id: 'stock',
      header: 'Stock',
      align: 'end',
      hideBelow: 'md',
      mobile: 'meta',
      sortValue: (row) => productStock(row.product),
      cell: (row) => (
        <span className="inline-flex items-center gap-2">
          <span className="tabular">{formatNumber(productStock(row.product))}</span>
          <StatusBadge domain="stock" status={stockStatus(productStock(row.product))} size="sm" withTooltip />
        </span>
      ),
    },
    {
      id: 'rating',
      header: 'Rating',
      align: 'end',
      hideBelow: 'xl',
      hideable: true,
      sortValue: (row) => row.product.rating.avg,
      cell: (row) =>
        row.product.rating.count > 0 ? (
          <span className="whitespace-nowrap">
            {formatRating(row.product.rating.avg)}
            <span className="text-fg-muted"> ({formatNumber(row.product.rating.count)})</span>
          </span>
        ) : (
          <span className="text-fg-subtle">No ratings</span>
        ),
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      sortValue: (row) => row.product.status,
      cell: (row) => <StatusBadge domain="listing" status={row.product.status} size="sm" withTooltip />,
    },
    {
      id: 'updated',
      header: 'Updated',
      hideBelow: 'xl',
      hideable: true,
      sortValue: (row) => row.product.updatedAt,
      cell: (row) => <span className="whitespace-nowrap">{formatDate(row.product.updatedAt)}</span>,
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
            <IconButton
              label={`Actions for ${row.product.title}`}
              size="sm"
              variant="ghost"
              icon={<Ellipsis aria-hidden />}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem icon={<Eye aria-hidden />} onSelect={() => void navigate(`/admin/products/${row.product.id}`)}>
              Review listing
            </DropdownMenuItem>
            {row.product.status === 'live' ? (
              <DropdownMenuItem icon={<Store aria-hidden />} onSelect={() => void navigate(`/p/${row.product.slug}`)}>
                View on the storefront
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              icon={<Copy aria-hidden />}
              onSelect={() => {
                void navigator.clipboard.writeText(row.product.id)
                toast.success('Listing id copied')
              }}
            >
              Copy listing id
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {row.product.status === 'pending' ? (
              <>
                <DropdownMenuItem icon={<CircleCheck aria-hidden />} onSelect={() => approve(row.product)}>
                  Approve listing
                </DropdownMenuItem>
                <DropdownMenuItem
                  destructive
                  icon={<Ban aria-hidden />}
                  onSelect={() =>
                    deferred(() => {
                      setMessage('')
                      setRejecting(row.product.id)
                    })
                  }
                >
                  Reject listing
                </DropdownMenuItem>
              </>
            ) : null}
            {row.product.status === 'blocked' ? (
              <DropdownMenuItem icon={<CircleCheck aria-hidden />} onSelect={() => deferred(() => setBlocked(row.product, false))}>
                Restore listing
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem destructive icon={<Ban aria-hidden />} onSelect={() => deferred(() => setBlocked(row.product, true))}>
                Block listing
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
        title="Products"
        description="Everything listed on the marketplace, and the listings waiting for catalogue review."
        meta={
          catalogue.status === 'success' && tab === 'catalogue' ? (
            <span>
              {formatNumber(rows.length)} {pluralize(rows.length, 'listing')}
            </span>
          ) : null
        }
      >
        <Tabs
          aria-label="Catalogue views"
          value={tab}
          onValueChange={(next) => setTab(next as 'catalogue' | 'moderation')}
          items={[
            { value: 'catalogue', label: 'Catalogue' },
            { value: 'moderation', label: 'Moderation queue', count: pendingCount },
          ]}
        />
      </PageHeader>

      {tab === 'catalogue' ? (
        catalogue.status === 'error' ? (
          <LoadFailed title="We couldn’t load the catalogue" onRetry={catalogue.retry} />
        ) : (
          <DataTable
            tableId="admin-products"
            caption="Listings across the marketplace"
            data={rows}
            columns={columns}
            getRowId={(row) => row.product.id}
            rowHref={(row) => `/admin/products/${row.product.id}`}
            loading={catalogue.status === 'loading'}
            initialSort={{ id: 'updated', dir: 'desc' }}
            selectable
            bulkActions={(ids, clear) => (
              <>
                <Button size="sm" variant="outline" leftIcon={<Ban aria-hidden />} onClick={() => void blockMany(ids, clear)}>
                  Block
                </Button>
                <ExportButton
                  filename="chowk-products-selected"
                  label="Export selected"
                  headers={csvHeaders}
                  rows={() => rows.filter((row) => ids.includes(row.product.id)).map(csvRow)}
                />
              </>
            )}
            toolbar={
              <FilterBar
                search={{ value: q, onChange: setQ, placeholder: 'Search title, brand or seller' }}
                facets={[
                  {
                    id: 'status',
                    label: 'Status',
                    single: true,
                    selected: status ? [status] : [],
                    onChange: (selected) => setStatus((selected[0] as ProductStatus | undefined) ?? ''),
                    options: statusOptions('listing'),
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
                actions={<ExportButton filename="chowk-products" headers={csvHeaders} rows={() => rows.map(csvRow)} />}
              />
            }
            empty={
              <EmptyState
                icon={<Package aria-hidden />}
                title={filtered ? 'No listings match these filters' : 'No listings yet'}
                description={
                  filtered
                    ? 'Try a different search, or clear the status and seller filters.'
                    : 'Listings appear here as soon as a seller submits one.'
                }
                action={
                  filtered ? (
                    <Button size="sm" variant="outline" onClick={resetAll}>
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
        )
      ) : moderation.status === 'error' ? (
        <LoadFailed title="We couldn’t load the queue" onRetry={moderation.retry} />
      ) : moderation.status === 'loading' ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-56 w-full rounded-card" />
          <Skeleton className="h-56 w-full rounded-card" />
        </div>
      ) : queue.length === 0 ? (
        <EmptyState
          icon={<Package aria-hidden />}
          title="Nothing waiting for review"
          description="You’ve reviewed every listing. New submissions land here as soon as sellers send them."
          action={
            <Button size="sm" variant="outline" onClick={() => setTab('catalogue')}>
              Back to the catalogue
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {queue.map((row) => (
            <SectionCard
              key={row.product.id}
              title={
                <Link to={`/admin/products/${row.product.id}`} className="hover:text-primary hover:underline">
                  {row.product.title}
                </Link>
              }
              description={`${row.seller?.displayName ?? 'Seller removed'} · waiting ${formatNumber(row.waitingHours)} ${pluralize(row.waitingHours, 'hour')} · ${row.categoryName}`}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" leftIcon={<CircleCheck aria-hidden />} onClick={() => approve(row.product)}>
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger-outline"
                    leftIcon={<Ban aria-hidden />}
                    onClick={() => {
                      setMessage('')
                      setRejecting(row.product.id)
                    }}
                  >
                    Reject
                  </Button>
                </div>
              }
            >
              <ModerationDiff product={row.product} changes={row.changes} categoryName={row.categoryName} />
            </SectionCard>
          ))}
        </div>
      )}

      <ReasonSheet
        open={rejecting !== null}
        onOpenChange={(open) => setRejecting(open ? rejecting : null)}
        title="Reject listing"
        description="The seller keeps the listing as a draft and can fix what you name here."
        templates={REJECT_TEMPLATES}
        value={message}
        onValueChange={setMessage}
        previewLabel="The seller will see this on the listing"
        previewHeading="Listing needs changes"
        submitLabel="Reject listing"
        tone="danger"
        onSubmit={submitReject}
      />
    </>
  )
}
