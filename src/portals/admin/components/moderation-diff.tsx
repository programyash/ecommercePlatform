import { Badge } from '@/components/ui/badge'
import { Img } from '@/components/ui/img'
import type { Product } from '@/data'
import { formatINR, formatNumber } from '@/lib/format'

/** Which submitted field each "what changed" line points at. */
const FIELD_KEYWORDS: Record<string, string[]> = {
  title: ['title'],
  brand: ['brand'],
  price: ['price', 'mrp'],
  images: ['image', 'photo'],
  description: ['description'],
  highlights: ['highlight', 'size chart', 'ingredient'],
  variants: ['variant', 'fabric', 'colour', 'size'],
  tax: ['hsn', 'gst'],
}

function changedFields(changes: readonly string[]): Set<string> {
  const fields = new Set<string>()
  for (const change of changes) {
    const text = change.toLowerCase()
    for (const [field, words] of Object.entries(FIELD_KEYWORDS)) {
      if (words.some((word) => text.includes(word))) fields.add(field)
    }
  }
  return fields
}

interface ModerationDiffProps {
  product: Product
  changes: readonly string[]
  /** Category name for the submitted listing. */
  categoryName: string
}

/**
 * What the seller changed, beside what they submitted. Seeded listings carry no
 * earlier snapshot, so a brand-new listing says so rather than inventing a "before".
 */
export function ModerationDiff({ product, changes, categoryName }: ModerationDiffProps) {
  const isNew = changes.some((change) => change.toLowerCase().includes('new listing'))
  const fields = changedFields(changes)
  const price = product.variants[0]?.price ?? 0
  const mrp = product.variants[0]?.mrp ?? 0

  const rows: { field: string; term: string; detail: string }[] = [
    { field: 'title', term: 'Title', detail: product.title },
    { field: 'brand', term: 'Brand', detail: product.brand },
    { field: 'category', term: 'Category', detail: categoryName },
    { field: 'price', term: 'Price', detail: `${formatINR(price)} · MRP ${formatINR(mrp)}` },
    { field: 'images', term: 'Images', detail: `${formatNumber(product.media.length)} uploaded` },
    { field: 'variants', term: 'Variants', detail: `${formatNumber(product.variants.length)} in the combination table` },
    { field: 'highlights', term: 'Highlights', detail: `${formatNumber(product.highlights.length)} bullet points` },
    { field: 'tax', term: 'HSN and GST', detail: `${product.hsn} · ${product.gstRate}%` },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="flex flex-col gap-2">
        <h3 className="type-label text-fg">Changes since last approval</h3>
        {isNew ? (
          <p className="type-body text-fg-muted">
            This is a new listing — there is no approved version to compare it against.
          </p>
        ) : null}
        <ul className="flex flex-col gap-1.5">
          {changes.length === 0 ? (
            <li className="type-body text-fg-muted">The seller did not list what changed.</li>
          ) : (
            changes.map((change) => (
              <li key={change} className="flex items-start gap-2 type-body text-fg">
                <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
                <span>{change}</span>
              </li>
            ))
          )}
        </ul>
        {product.media[0] ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {product.media.slice(0, 4).map((media, index) => (
              <Img
                key={`${String(media)}-${index}`}
                image={media}
                alt=""
                ratio="square"
                width={120}
                sizes="64px"
                className="size-16 rounded-thumb"
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="type-label text-fg">Submitted listing</h3>
        <dl className="divide-y divide-border-subtle">
          {rows.map((row) => (
            <div key={row.field} className="flex items-start justify-between gap-3 py-2">
              <dt className="shrink-0 type-caption text-fg-muted">{row.term}</dt>
              <dd className="flex min-w-0 items-center gap-2 text-right type-body text-fg">
                <span className="min-w-0 break-words">{row.detail}</span>
                {fields.has(row.field) ? (
                  <Badge tone="warning" size="sm" variant="outline">
                    Changed
                  </Badge>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
