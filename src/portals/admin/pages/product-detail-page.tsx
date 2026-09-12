import { Ban, CircleCheck, Copy, Ellipsis, Store, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { dbActions, getProductDetail, useDemoQuery } from '@/data'
import { Button } from '@/components/ui/button'
import { DescriptionList } from '@/components/ui/description-list'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { IconButton } from '@/components/ui/icon-button'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { ProductGallery } from '@/components/commerce/product-gallery'
import { SpecsTable } from '@/components/commerce/specs-table'
import { useConfirm } from '@/components/ui/use-confirm'
import { formatDate, formatDateTime, formatINR, formatNumber, formatPercent, formatRating, pluralize } from '@/lib/format'
import { stockStatus } from '@/lib/status'
import { ModerationDiff } from '../components/moderation-diff'
import { LoadFailed, RecordNotFound } from '../components/record-states'
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

/** One listing, what changed since it was last approved, and the decision to take. */
export default function AdminProductDetailPage() {
  const params = useParams()
  const productId = params.productId ?? ''
  const navigate = useNavigate()
  const confirm = useConfirm()
  const [rejecting, setRejecting] = useState(false)
  const [message, setMessage] = useState('')

  const query = useDemoQuery((view) => getProductDetail(view, productId), [productId])
  const crumbs = [{ label: 'Products', to: '/admin/products' }, { label: 'Listing' }]

  if (query.status === 'error') {
    return (
      <>
        <PageHeader title="Listing" breadcrumbs={crumbs} />
        <LoadFailed title="We couldn’t load this listing" onRetry={query.retry} />
      </>
    )
  }

  if (query.status === 'loading') {
    return (
      <>
        <PageHeader title="Listing" breadcrumbs={crumbs} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-card" />
          <Skeleton className="h-80 w-full rounded-card" />
        </div>
      </>
    )
  }

  if (query.status === 'empty' || !query.data) {
    return (
      <>
        <PageHeader title="Listing not found" breadcrumbs={crumbs} />
        <RecordNotFound
          title="We couldn’t find that listing"
          description={`No listing on the marketplace has the id “${productId}”. It may have been removed by its seller.`}
          backTo="/admin/products"
          backLabel="Back to products"
        />
      </>
    )
  }

  const detail = query.data
  const product = detail.product
  const pending = product.status === 'pending'
  const changes = product.moderation?.changes ?? []

  const approve = () => {
    dbActions.moderateProduct(product.id, 'approve')
    toast.success('Listing approved', { description: `${product.title} is live on Chowk.` })
  }

  const submitReject = () => {
    const text = message.trim()
    if (!text) return
    dbActions.moderateProduct(product.id, 'reject', text)
    setRejecting(false)
    toast.success('Listing rejected', { description: 'The seller sees your reason on the listing, word for word.' })
  }

  const setBlocked = async (block: boolean) => {
    const ok = await confirm({
      title: block ? `Block “${product.title}”?` : `Restore “${product.title}”?`,
      description: block
        ? `It disappears from the storefront straight away. The seller will see: “${BLOCK_REASON}”`
        : 'The listing goes back on sale and shoppers can buy it again.',
      confirmLabel: block ? 'Block listing' : 'Restore listing',
      tone: block ? 'danger' : 'default',
    })
    if (!ok) return
    dbActions.moderateProduct(product.id, block ? 'block' : 'approve', block ? BLOCK_REASON : undefined)
    toast.success(block ? 'Listing blocked' : 'Listing restored', { description: product.title })
  }

  return (
    <>
      <PageHeader
        title={product.title}
        documentTitle={`${product.title} · Products`}
        breadcrumbs={[{ label: 'Products', to: '/admin/products' }, { label: product.title }]}
        badge={<StatusBadge domain="listing" status={product.status} withTooltip />}
        description={`${product.brand} · ${detail.category?.name ?? 'Uncategorised'}`}
        meta={
          <>
            <span>{detail.seller?.displayName ?? 'Seller removed'}</span>
            <span className="tabular">{formatINR(detail.price)}</span>
            <span>
              {formatNumber(detail.stock)} {pluralize(detail.stock, 'unit')} in stock
            </span>
            <span>Updated {formatDate(product.updatedAt)}</span>
          </>
        }
        actions={
          <>
            {pending ? (
              <Button leftIcon={<CircleCheck aria-hidden />} onClick={approve}>
                Approve listing
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton label="More actions" variant="outline" icon={<Ellipsis aria-hidden />} />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem icon={<Store aria-hidden />} onSelect={() => void navigate(`/p/${product.slug}`)}>
                  View on the storefront
                </DropdownMenuItem>
                {detail.seller ? (
                  <DropdownMenuItem
                    icon={<Store aria-hidden />}
                    onSelect={() => void navigate(`/admin/sellers/${detail.seller?.id ?? ''}`)}
                  >
                    View seller
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  icon={<Copy aria-hidden />}
                  onSelect={() => {
                    void navigator.clipboard.writeText(product.id)
                    toast.success('Listing id copied')
                  }}
                >
                  Copy listing id
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {pending ? (
                  <DropdownMenuItem
                    destructive
                    icon={<Ban aria-hidden />}
                    onSelect={() =>
                      deferred(() => {
                        setMessage('')
                        setRejecting(true)
                      })
                    }
                  >
                    Reject listing
                  </DropdownMenuItem>
                ) : null}
                {product.status === 'blocked' ? (
                  <DropdownMenuItem icon={<CircleCheck aria-hidden />} onSelect={() => deferred(() => void setBlocked(false))}>
                    Restore listing
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem destructive icon={<Ban aria-hidden />} onSelect={() => deferred(() => void setBlocked(true))}>
                    Block listing
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {product.moderation?.reason && product.status !== 'live' ? (
        <section className="flex flex-col gap-1 rounded-card border border-warning-border bg-warning-subtle p-4">
          <h2 className="flex items-center gap-2 type-label text-warning-subtle-fg">
            <TriangleAlert aria-hidden className="size-4" />
            What the seller sees on this listing
          </h2>
          <p className="type-body text-fg">{product.moderation.reason}</p>
          {product.moderation.reviewedAt ? (
            <p className="type-caption text-fg-muted">Reviewed {formatDateTime(product.moderation.reviewedAt)}</p>
          ) : null}
        </section>
      ) : null}

      {pending ? (
        <SectionCard
          title="Review this submission"
          description={
            product.moderation?.submittedAt
              ? `Submitted ${formatDateTime(product.moderation.submittedAt)}`
              : 'Waiting for a catalogue decision.'
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" leftIcon={<CircleCheck aria-hidden />} onClick={approve}>
                Approve
              </Button>
              <Button
                size="sm"
                variant="danger-outline"
                leftIcon={<Ban aria-hidden />}
                onClick={() => {
                  setMessage('')
                  setRejecting(true)
                }}
              >
                Reject
              </Button>
            </div>
          }
        >
          <ModerationDiff product={product} changes={changes} categoryName={detail.category?.name ?? '—'} />
        </SectionCard>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Images" description={`${formatNumber(product.media.length)} ${pluralize(product.media.length, 'image')} on the listing.`}>
          <ProductGallery media={product.media} title={product.title} />
        </SectionCard>

        <SectionCard title="Listing details">
          <DescriptionList
            items={[
              { term: 'Seller', detail: detail.seller?.displayName ?? 'Seller removed' },
              { term: 'Category', detail: detail.path.map((entry) => entry.name).join(' › ') || '—' },
              { term: 'Price', detail: `${formatINR(detail.price)} · MRP ${formatINR(detail.mrp)} · ${formatNumber(detail.discount)}% off` },
              { term: 'HSN and GST', detail: `${product.hsn} · ${product.gstRate}%` },
              { term: 'Dispatch', detail: `${formatNumber(product.dispatchDays)} working ${pluralize(product.dispatchDays, 'day')}` },
              { term: 'Return window', detail: product.returnDays > 0 ? `${formatNumber(product.returnDays)} days` : 'Not returnable' },
              { term: 'Cash on delivery', detail: product.cod ? 'Available' : 'Not available' },
              { term: 'Country of origin', detail: product.countryOfOrigin },
              { term: 'Manufacturer or importer', detail: product.manufacturer },
              ...(product.warranty ? [{ term: 'Warranty', detail: product.warranty }] : []),
              {
                term: 'Weight and size',
                detail: `${product.weightKg} kg · ${product.dimensionsCm.join(' × ')} cm`,
              },
              {
                term: 'Rating',
                detail:
                  detail.rating.count > 0
                    ? `${formatRating(detail.rating.avg)} from ${formatNumber(detail.rating.count)} ${pluralize(detail.rating.count, 'rating')}`
                    : 'No ratings yet',
              },
              { term: 'Listing id', detail: product.id, copyValue: product.id },
            ]}
          />
        </SectionCard>
      </div>

      <SectionCard title="Variants" description="Every combination the seller offers, with its own SKU and stock." flush>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Variants of {product.title}</caption>
            <thead>
              <tr className="border-y border-border bg-surface-2">
                <th scope="col" className="px-4 py-2.5 type-caption font-semibold whitespace-nowrap text-fg-muted">Variant</th>
                <th scope="col" className="px-4 py-2.5 type-caption font-semibold whitespace-nowrap text-fg-muted">SKU</th>
                <th scope="col" className="px-4 py-2.5 text-right type-caption font-semibold whitespace-nowrap text-fg-muted">MRP</th>
                <th scope="col" className="px-4 py-2.5 text-right type-caption font-semibold whitespace-nowrap text-fg-muted">Price</th>
                <th scope="col" className="px-4 py-2.5 text-right type-caption font-semibold whitespace-nowrap text-fg-muted">Discount</th>
                <th scope="col" className="px-4 py-2.5 text-right type-caption font-semibold whitespace-nowrap text-fg-muted">Stock</th>
                <th scope="col" className="px-4 py-2.5 type-caption font-semibold whitespace-nowrap text-fg-muted">Availability</th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((variant) => (
                <tr key={variant.id} className="border-b border-border-subtle last:border-b-0">
                  <td className="px-4 py-2.5 type-body text-fg">
                    {Object.values(variant.options).join(' · ') || 'Single variant'}
                    {variant.active ? null : <span className="text-fg-muted"> · paused by the seller</span>}
                  </td>
                  <td className="px-4 py-2.5 font-mono type-caption text-fg-muted">{variant.sku}</td>
                  <td className="px-4 py-2.5 text-right type-body text-fg tabular">{formatINR(variant.mrp)}</td>
                  <td className="px-4 py-2.5 text-right type-body text-fg tabular">{formatINR(variant.price)}</td>
                  <td className="px-4 py-2.5 text-right type-body text-discount tabular">
                    {variant.mrp > variant.price ? formatPercent((variant.mrp - variant.price) / variant.mrp, { decimals: 0 }) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right type-body text-fg tabular">{formatNumber(variant.stock)}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge domain="stock" status={stockStatus(variant.stock, variant.lowStockAt)} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Description and highlights">
          <div className="flex flex-col gap-3">
            <p className="type-body text-fg-muted">{product.description}</p>
            <ul className="flex flex-col gap-1.5">
              {product.highlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-2 type-body text-fg">
                  <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-border-strong" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        </SectionCard>

        <SectionCard title="Specifications">
          {product.specs.length > 0 ? (
            <SpecsTable groups={product.specs} />
          ) : (
            <p className="type-body text-fg-muted">This listing has no specifications yet.</p>
          )}
        </SectionCard>
      </div>

      <ReasonSheet
        open={rejecting}
        onOpenChange={setRejecting}
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
