import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Eye,
  Plus,
  Trash2,
  TriangleAlert,
  Undo2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, useWatch, type FieldPath, type UseFormReturn } from 'react-hook-form'
import { Link, useBlocker, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  DEMO_NOW,
  dbActions,
  getCategoryPath,
  useDb,
  useSession,
  type Category,
  type GstRate,
  type MediaRef,
  type Product,
  type VariantAxis,
} from '@/data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { FieldError, FieldHint, Label } from '@/components/ui/field'
import { IconButton } from '@/components/ui/icon-button'
import { Img } from '@/components/ui/img'
import { Input, Textarea } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { Select } from '@/components/ui/select'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import { Switch } from '@/components/ui/switch'
import { ProductCard } from '@/components/commerce/product-card'
import { ErrorSummary, Form, FormActions, FormField } from '@/components/forms/form'
import { ImageUploader, type UploadedImage } from '@/components/forms/image-uploader'
import { CurrencyInput } from '@/components/forms/inputs'
import { cn } from '@/lib/cn'
import { formatINR, formatNumber, formatRelative } from '@/lib/format'
import { discountPercent } from '@/lib/pricing'
import { estimateEarnings } from '@/lib/settlement'
import { useMediaQuery } from '@/lib/use-media-query'
import { hsnSchema } from '@/lib/validators'
import { SettlementLines } from '../components/settlement-lines'

// ── Schema ────────────────────────────────────────────────────────────────

const editorSchema = z.object({
  categoryId: z.string().min(1, 'Choose the category this product belongs in.'),
  title: z.string().trim().min(10, 'Write at least 10 characters so shoppers can find it.').max(150, 'Keep the title under 150 characters.'),
  brand: z.string().trim().min(2, 'Enter a brand, or write Generic.'),
  description: z.string().trim().min(30, 'Describe the product in at least 30 characters.').max(2000, 'Keep the description under 2000 characters.'),
  highlights: z.array(z.string().trim().max(120, 'Keep each highlight under 120 characters.')).max(5, 'Five highlights is the maximum.'),
  keywords: z.string().trim().max(200, 'Keep keywords under 200 characters.'),
  mrp: z.number('Enter the MRP in rupees.').min(1, 'The MRP must be more than ₹0.'),
  price: z.number('Enter the selling price in rupees.').min(1, 'The selling price must be more than ₹0.'),
  hsn: hsnSchema,
  gstRate: z.enum(['0', '5', '18', '40']),
  weightKg: z.number('Enter the packed weight in kilograms.').min(0.01, 'The weight must be more than 0.'),
  lengthCm: z.number('Enter the box length in centimetres.').min(1, 'The length must be at least 1 cm.'),
  breadthCm: z.number('Enter the box breadth in centimetres.').min(1, 'The breadth must be at least 1 cm.'),
  heightCm: z.number('Enter the box height in centimetres.').min(1, 'The height must be at least 1 cm.'),
  dispatchDays: z.enum(['1', '2', '3']),
  countryOfOrigin: z.string().trim().min(2, 'Country of origin is required by law.'),
  manufacturer: z.string().trim().min(3, 'Name the manufacturer, packer or importer.'),
  warranty: z.string().trim().max(120, 'Keep the warranty note under 120 characters.'),
  netQuantity: z.string().trim().min(1, 'Net quantity is required by law, e.g. “1 unit” or “500 g”.'),
})

type EditorValues = z.infer<typeof editorSchema>
type EditorField = FieldPath<EditorValues>

const SECTIONS = [
  { id: 'category', label: 'Category', fields: ['categoryId'] },
  { id: 'basics', label: 'Basics', fields: ['title', 'brand', 'description', 'highlights', 'keywords'] },
  { id: 'images', label: 'Images', fields: [] },
  { id: 'variants', label: 'Variants', fields: [] },
  { id: 'pricing', label: 'Pricing & tax', fields: ['mrp', 'price', 'hsn', 'gstRate'] },
  { id: 'shipping', label: 'Shipping', fields: ['weightKg', 'lengthCm', 'breadthCm', 'heightCm', 'dispatchDays'] },
  { id: 'compliance', label: 'Compliance', fields: ['countryOfOrigin', 'manufacturer', 'warranty', 'netQuantity'] },
] as const satisfies readonly { id: string; label: string; fields: readonly EditorField[] }[]

type SectionId = (typeof SECTIONS)[number]['id']

const FIELD_LABEL: Record<string, string> = {
  categoryId: 'Category',
  title: 'Title',
  brand: 'Brand',
  description: 'Description',
  highlights: 'Highlights',
  keywords: 'Search keywords',
  mrp: 'MRP',
  price: 'Selling price',
  hsn: 'HSN code',
  gstRate: 'GST rate',
  weightKg: 'Weight',
  lengthCm: 'Length',
  breadthCm: 'Breadth',
  heightCm: 'Height',
  dispatchDays: 'Dispatch within',
  countryOfOrigin: 'Country of origin',
  manufacturer: 'Manufacturer, packer or importer',
  warranty: 'Warranty',
  netQuantity: 'Net quantity',
}

/** Words a rejection reason uses, and the section each one points at. */
const REJECTION_HINTS: { pattern: RegExp; section: SectionId }[] = [
  { pattern: /image|photo|watermark|picture/i, section: 'images' },
  { pattern: /title|description|highlight|keyword|brand/i, section: 'basics' },
  { pattern: /categor/i, section: 'category' },
  { pattern: /price|mrp|gst|hsn|tax/i, section: 'pricing' },
  { pattern: /weight|dimension|dispatch|ship/i, section: 'shipping' },
  { pattern: /origin|manufactur|warrant|quantity|complian/i, section: 'compliance' },
]

const COUNTRIES = ['India', 'China', 'Bangladesh', 'Vietnam', 'Germany', 'Japan', 'South Korea', 'United States']
const AXES: { value: VariantAxis; label: string; placeholder: string }[] = [
  { value: 'colour', label: 'Colour', placeholder: 'Midnight Teal, Ivory, Rose' },
  { value: 'size', label: 'Size', placeholder: 'S, M, L, XL' },
  { value: 'storage', label: 'Storage', placeholder: '128 GB, 256 GB' },
  { value: 'pack', label: 'Pack', placeholder: 'Pack of 1, Pack of 3' },
]

// ── Variant table state ───────────────────────────────────────────────────

interface AxisSpec {
  axis: VariantAxis
  values: string[]
}

interface RowData {
  sku: string
  mrp: number
  price: number
  stock: number
  active: boolean
}

function combosOf(axes: AxisSpec[]): Partial<Record<VariantAxis, string>>[] {
  const usable = axes.filter((spec) => spec.values.length > 0)
  if (usable.length === 0) return [{}]
  return usable.reduce<Partial<Record<VariantAxis, string>>[]>(
    (rows, spec) => rows.flatMap((row) => spec.values.map((value) => ({ ...row, [spec.axis]: value }))),
    [{}],
  )
}

function keyOf(options: Partial<Record<VariantAxis, string>>): string {
  return AXES.map((axis) => options[axis.value] ?? '').join('|')
}

function labelOf(options: Partial<Record<VariantAxis, string>>): string {
  const parts = Object.values(options).filter(Boolean)
  return parts.length ? parts.join(' · ') : 'Single variant'
}

function skuSeed(title: string, options: Partial<Record<VariantAxis, string>>): string {
  const base = title.replace(/[^A-Za-z0-9]+/g, '').slice(0, 6).toUpperCase() || 'ITEM'
  const suffix = Object.values(options)
    .filter(Boolean)
    .map((value) => String(value).replace(/[^A-Za-z0-9]+/g, '').slice(0, 3).toUpperCase())
    .join('-')
  return suffix ? `${base}-${suffix}` : base
}

// ── Small field helpers ───────────────────────────────────────────────────

type NumericField = 'mrp' | 'price' | 'weightKg' | 'lengthCm' | 'breadthCm' | 'heightCm'

interface NumberFieldProps {
  form: UseFormReturn<EditorValues>
  name: NumericField
  label: string
  hint?: string
  prefix?: string
  suffix?: string
  step?: string
  disabled?: boolean
}

/** `register` with `valueAsNumber`, wired to the same `field-<name>` id the error summary links to. */
function NumberField({ form, name, label, hint, prefix, suffix, step = '1', disabled }: NumberFieldProps) {
  const id = `field-${name}`
  const message = form.formState.errors[name]?.message
  const describedBy = message ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        step={step}
        disabled={disabled}
        prefix={prefix}
        suffix={suffix ? <span className="type-caption">{suffix}</span> : undefined}
        invalid={Boolean(message)}
        aria-describedby={describedBy}
        className="tabular"
        {...form.register(name, { valueAsNumber: true })}
      />
      {message ? (
        <FieldError id={`${id}-error`}>{String(message)}</FieldError>
      ) : hint ? (
        <FieldHint id={`${id}-hint`}>{hint}</FieldHint>
      ) : null}
    </div>
  )
}

const DRAFT_KEY = (id: string) => `chowk:listing-draft:${id}`

/** The wall clock, read only from event handlers and timers — never during render. */
function nowMs(): number {
  return Date.now()
}

// ── Page ──────────────────────────────────────────────────────────────────

/** Seven sections, one moderation state, and a preview of exactly what a shopper will see. */
export default function ProductEditorPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const sellerId = useSession((state) => state.sellerId)
  const wide = useMediaQuery('(min-width: 64rem)')

  const world = useDb(
    (view) => {
      const product = productId ? view.productById.get(productId) : undefined
      const leaves = view.categories
        .filter((category) => (view.childrenByCategory.get(category.id) ?? []).length === 0)
        .map((category) => ({
          category,
          path: getCategoryPath(view, category.id)
            .map((entry) => entry.name)
            .join(' › '),
        }))
      return {
        product,
        leaves,
        settings: view.settings,
        seller: view.sellers.find((entry) => entry.id === sellerId),
        placeholderFor: (categoryId: string): MediaRef | undefined =>
          (view.productsByCategory.get(categoryId) ?? []).find((entry) => entry.media.length > 0)?.media[0],
      }
    },
    [productId, sellerId],
  )

  const product = world.product
  const isEdit = Boolean(productId)
  const readOnly = product?.status === 'pending'

  const [images, setImages] = useState<UploadedImage[]>([])
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [savedLabel, setSavedLabel] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<SectionId>('category')
  const [categoryQuery, setCategoryQuery] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [axes, setAxes] = useState<AxisSpec[]>(() => {
    if (!product) return []
    return product.axes.map((axis) => ({
      axis,
      values: [...new Set(product.variants.map((variant) => variant.options[axis]).filter((value): value is string => Boolean(value)))],
    }))
  })
  const [rowData, setRowData] = useState<Record<string, RowData>>(() => {
    if (!product) return {}
    const entries: Record<string, RowData> = {}
    for (const variant of product.variants) {
      entries[keyOf(variant.options)] = {
        sku: variant.sku,
        mrp: variant.mrp,
        price: variant.price,
        stock: variant.stock,
        active: variant.active,
      }
    }
    return entries
  })

  const first = product?.variants[0]
  const form = useForm<EditorValues>({
    resolver: zodResolver(editorSchema),
    mode: 'onBlur',
    defaultValues: {
      categoryId: product?.categoryId ?? '',
      title: product?.title ?? '',
      brand: product?.brand ?? '',
      description: product?.description ?? '',
      highlights: product?.highlights ?? [''],
      keywords: (product?.keywords ?? []).join(', '),
      mrp: first?.mrp ?? 0,
      price: first?.price ?? 0,
      hsn: product?.hsn ?? '',
      gstRate: String(product?.gstRate ?? 18) as EditorValues['gstRate'],
      weightKg: product?.weightKg ?? 0.5,
      lengthCm: product?.dimensionsCm[0] ?? 20,
      breadthCm: product?.dimensionsCm[1] ?? 15,
      heightCm: product?.dimensionsCm[2] ?? 8,
      dispatchDays: String(product?.dispatchDays ?? 2) as EditorValues['dispatchDays'],
      countryOfOrigin: product?.countryOfOrigin ?? 'India',
      manufacturer: product?.manufacturer ?? '',
      warranty: product?.warranty ?? '',
      netQuantity: '1 unit',
    },
  })

  const dirty = form.formState.isDirty
  const values = form.getValues()
  // Named watches only: `form.watch()` returns a function the React compiler cannot memoise.
  const categoryId = useWatch({ control: form.control, name: 'categoryId' })
  const title = useWatch({ control: form.control, name: 'title' })
  const mrp = useWatch({ control: form.control, name: 'mrp' })
  const price = useWatch({ control: form.control, name: 'price' })
  const brand = useWatch({ control: form.control, name: 'brand' })
  const gstRate = useWatch({ control: form.control, name: 'gstRate' })

  const chosen = world.leaves.find((entry) => entry.category.id === categoryId)
  const category: Category | undefined = chosen?.category
  const combos = combosOf(axes)
  const rowFor = (options: Partial<Record<VariantAxis, string>>): RowData =>
    rowData[keyOf(options)] ?? {
      sku: skuSeed(title || 'ITEM', options),
      mrp: Number.isFinite(mrp) ? mrp : 0,
      price: Number.isFinite(price) ? price : 0,
      stock: 0,
      active: true,
    }

  // ── Autosave to this browser, so a half-written listing survives a reload ──
  useEffect(() => {
    if (readOnly || !dirty) return
    const timer = window.setInterval(() => {
      try {
        window.localStorage.setItem(
          DRAFT_KEY(productId ?? 'new'),
          JSON.stringify({ values: form.getValues(), axes, rowData }),
        )
      } catch {
        return
      }
      const at = nowMs()
      setSavedAt(at)
      setSavedLabel('just now')
    }, 20_000)
    return () => window.clearInterval(timer)
  }, [readOnly, dirty, productId, form, axes, rowData])

  useEffect(() => {
    if (savedAt === null) return
    const timer = window.setInterval(() => setSavedLabel(formatRelative(new Date(savedAt), new Date(nowMs()))), 30_000)
    return () => window.clearInterval(timer)
  }, [savedAt])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)

  const errorSignature = Object.keys(form.formState.errors).join(',')
  useEffect(() => {
    if (!showErrors) return
    document.getElementById('listing-errors')?.focus()
  }, [showErrors, errorSignature])

  // ── Derived validation ──────────────────────────────────────────────────
  const imageCount = images.filter((image) => !image.error).length + (product?.media.length ?? 0)
  const imageErrors = images.filter((image) => image.error).length + (imageCount === 0 ? 1 : 0)
  const variantErrors = combos.filter((options) => {
    const row = rowFor(options)
    return !row.sku.trim() || row.price > row.mrp || row.price <= 0 || row.stock < 0
  }).length

  const errorCount = (section: (typeof SECTIONS)[number]): number => {
    if (section.id === 'images') return imageErrors
    if (section.id === 'variants') return variantErrors
    return section.fields.filter((field) => Boolean(form.formState.errors[field])).length
  }
  const completed = (section: (typeof SECTIONS)[number]): boolean => {
    if (errorCount(section) > 0) return false
    if (section.id === 'images') return imageCount > 0
    if (section.id === 'variants') return combos.length > 0
    return section.fields.every((field) => {
      const value = values[field]
      if (Array.isArray(value)) return value.some((entry) => String(entry).trim().length > 0)
      if (typeof value === 'number') return Number.isFinite(value) && value > 0
      return String(value ?? '').trim().length > 0
    })
  }

  const summaryErrors = SECTIONS.flatMap((section) =>
    section.fields
      .filter((field) => Boolean(form.formState.errors[field]))
      .map((field) => ({ name: field, message: `${FIELD_LABEL[field] ?? field}: ${String(form.formState.errors[field]?.message)}` })),
  )
  const allErrors = [
    ...summaryErrors,
    ...(imageErrors > 0 ? [{ name: 'images', message: 'Images: add at least one photo and fix any file errors.' }] : []),
    ...(variantErrors > 0 ? [{ name: 'variants', message: 'Variants: every row needs a SKU and a price at or below its MRP.' }] : []),
  ]

  const rejectedSections = new Set<SectionId>(
    product?.status === 'rejected' && product.moderation?.reason
      ? REJECTION_HINTS.filter((hint) => hint.pattern.test(product.moderation?.reason ?? '')).map((hint) => hint.section)
      : [],
  )

  // ── Saving ──────────────────────────────────────────────────────────────
  const buildInput = (submit: boolean) => {
    const current = form.getValues()
    const usedAxes = axes.filter((spec) => spec.values.length > 0).map((spec) => spec.axis)
    const media: MediaRef[] =
      product?.media.length
        ? product.media
        : ([world.placeholderFor(current.categoryId)].filter(Boolean) as MediaRef[])
    return {
      ...(productId ? { id: productId } : {}),
      sellerId,
      title: current.title.trim(),
      brand: current.brand.trim(),
      categoryId: current.categoryId,
      description: current.description.trim(),
      highlights: current.highlights.map((entry) => entry.trim()).filter(Boolean),
      media,
      axes: usedAxes,
      variants: combos.map((options) => {
        const row = rowFor(options)
        return {
          sku: row.sku.trim(),
          options,
          mrp: row.mrp,
          price: row.price,
          stock: row.stock,
          active: row.active,
        }
      }),
      hsn: current.hsn,
      gstRate: Number(current.gstRate) as GstRate,
      dispatchDays: Number(current.dispatchDays),
      weightKg: current.weightKg,
      dimensionsCm: [current.lengthCm, current.breadthCm, current.heightCm] as [number, number, number],
      countryOfOrigin: current.countryOfOrigin.trim(),
      manufacturer: current.manufacturer.trim(),
      warranty: current.warranty.trim() || undefined,
      keywords: current.keywords.split(',').map((entry) => entry.trim()).filter(Boolean),
      submit,
    }
  }

  const persist = (submit: boolean, message: { title: string; description: string }) => {
    const result = dbActions.upsertProduct(buildInput(submit))
    if (!result.ok) {
      toast.error('Could not save this listing', { description: result.error })
      return
    }
    try {
      window.localStorage.removeItem(DRAFT_KEY(productId ?? 'new'))
    } catch {
      // A blocked local store only means the autosave copy outlives the session.
    }
    form.reset(form.getValues())
    const at = nowMs()
    setSavedAt(at)
    setSavedLabel('just now')
    toast.success(message.title, { description: message.description })
    if (!productId) void navigate(`/seller/products/${result.productId}/edit`, { replace: true })
    else if (submit) void navigate('/seller/products?tab=pending')
  }

  const onSubmit = () => {
    if (imageErrors > 0 || variantErrors > 0) {
      setShowErrors(true)
      document.getElementById('listing-errors')?.focus()
      return
    }
    persist(true, {
      title: 'Sent for review',
      description:
        product?.status === 'live'
          ? 'Your changes go to the catalogue team. The current version stays live until they are approved.'
          : 'Most listings are reviewed within one working day.',
    })
  }

  const previewProduct: Product = {
    id: productId ?? 'preview',
    slug: product?.slug ?? 'preview',
    title: title || 'Your product title appears here',
    brand: brand || 'Brand',
    categoryId,
    sellerId,
    otherOffers: [],
    description: values.description,
    highlights: values.highlights.filter(Boolean),
    specs: [],
    media: product?.media.length ? product.media : ([world.placeholderFor(categoryId)].filter(Boolean) as MediaRef[]),
    axes: axes.filter((spec) => spec.values.length > 0).map((spec) => spec.axis),
    variants: combos.map((options, index) => {
      const row = rowFor(options)
      return {
        id: `preview-${index}`,
        sku: row.sku,
        options,
        mrp: row.mrp,
        price: row.price,
        stock: row.stock,
        lowStockAt: 5,
        active: row.active,
      }
    }),
    rating: product?.rating ?? { avg: 0, count: 0, dist: [0, 0, 0, 0, 0] },
    tags: [],
    returnDays: category?.returnDays ?? 7,
    cod: true,
    status: product?.status ?? 'draft',
    hsn: values.hsn,
    gstRate: Number(gstRate) as GstRate,
    dispatchDays: Number(values.dispatchDays),
    weightKg: values.weightKg,
    dimensionsCm: [values.lengthCm, values.breadthCm, values.heightCm],
    countryOfOrigin: values.countryOfOrigin,
    manufacturer: values.manufacturer,
    keywords: [],
    createdAt: product?.createdAt ?? DEMO_NOW,
    updatedAt: product?.updatedAt ?? DEMO_NOW,
  }

  const earnings = estimateEarnings(
    Number.isFinite(price) && price > 0 ? price : 0,
    category?.commissionPct ?? 10,
    Number(gstRate) as GstRate,
    world.settings,
  )

  // ── Not found ───────────────────────────────────────────────────────────
  if (isEdit && !product) {
    return (
      <>
        <PageHeader
          title="Listing not found"
          breadcrumbs={[{ label: 'Seller Hub', to: '/seller' }, { label: 'Products', to: '/seller/products' }, { label: 'Edit' }]}
        />
        <EmptyState
          icon={<TriangleAlert aria-hidden />}
          title={`No listing called ${productId}`}
          description="It may have been removed. Open your catalogue and pick the listing you want to edit."
          action={
            <Button asChild>
              <Link to="/seller/products">Back to products</Link>
            </Button>
          }
        />
      </>
    )
  }

  const activeIndex = SECTIONS.findIndex((section) => section.id === activeSection)
  const visibleSections = wide ? SECTIONS : SECTIONS.filter((section) => section.id === activeSection)

  const previewPanel = (
    <div className="flex flex-col gap-4">
      <SectionCard title="How the card will look" description="The same card shoppers see in search and category pages.">
        {/* `inert` rather than `aria-hidden`: the card holds a link and a wishlist
            button, and aria-hidden alone would leave them in the tab order. */}
        <div className="pointer-events-none mx-auto max-w-form" inert>
          <ProductCard product={previewProduct} variant="grid" sellerName={world.seller?.displayName} />
        </div>
        <p className="mt-3 type-caption text-fg-muted">
          {brand || 'Brand'} · {formatINR(Number.isFinite(price) ? price : 0)}
          {Number.isFinite(mrp) && mrp > price ? ` · MRP ${formatINR(mrp)} · ${discountPercent(mrp, price)}% off` : ''} · inclusive of
          all taxes
        </p>
        {product?.status === 'live' ? (
          <Button size="sm" variant="outline" className="mt-3" leftIcon={<Eye aria-hidden />} asChild>
            <Link to={`/p/${product.slug}`}>Preview product page</Link>
          </Button>
        ) : (
          <p className="mt-3 type-caption text-fg-subtle">The full product page opens once this listing is live.</p>
        )}
      </SectionCard>

      <SectionCard title="What you earn" description={`At ${category?.commissionPct ?? 10}% commission for this category.`}>
        {/* Fees alone would show a negative payout before a price exists. Wait for one. */}
        {Number.isFinite(price) && price > 0 ? (
          <>
            <SettlementLines lines={earnings.lines} net={earnings.net} netLabel="You earn per unit" caption="Estimated earnings per unit" />
            <p className="mt-3 type-caption text-fg-muted">
              An estimate for one unit in its own parcel. Real payouts share the fixed fee across everything in a shipment.
            </p>
          </>
        ) : (
          <p className="type-caption text-fg-muted">
            Enter a selling price and this works out the commission, fees, GST, TCS and TDS, and what reaches your bank.
          </p>
        )}
      </SectionCard>
    </div>
  )

  return (
    <>
      <PageHeader
        title={isEdit ? 'Edit product' : 'Add product'}
        breadcrumbs={[
          { label: 'Seller Hub', to: '/seller' },
          { label: 'Products', to: '/seller/products' },
          { label: isEdit ? (product?.title ?? 'Edit') : 'New listing' },
        ]}
        badge={product ? <StatusBadge domain="listing" status={product.status} withTooltip /> : <StatusBadge domain="listing" status="draft" />}
        meta={
          <>
            {savedLabel ? <span>Draft saved · {savedLabel}</span> : <span>Not saved yet</span>}
            {category ? <span>{chosen?.path}</span> : null}
          </>
        }
        actions={
          <>
            {!wide ? (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" leftIcon={<Eye aria-hidden />}>
                    Preview
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" title="Preview">
                  {previewPanel}
                </SheetContent>
              </Sheet>
            ) : null}
            {readOnly ? (
              <Button
                variant="outline"
                leftIcon={<Undo2 aria-hidden />}
                onClick={() =>
                  persist(false, { title: 'Submission withdrawn', description: 'The listing is a draft again, so you can edit it.' })
                }
              >
                Withdraw submission
              </Button>
            ) : null}
          </>
        }
      />

      {product?.status === 'rejected' && product.moderation?.reason ? (
        <div className="flex flex-col gap-2 rounded-card border border-danger-border bg-danger-subtle p-4 text-danger-subtle-fg sm:p-5">
          <p className="flex items-center gap-2 type-title">
            <CircleAlert aria-hidden className="size-4 shrink-0" />
            Listing rejected
          </p>
          <p className="type-body">{product.moderation.reason}</p>
          {rejectedSections.size > 0 ? (
            <p className="type-caption">
              Marked below:{' '}
              {SECTIONS.filter((section) => rejectedSections.has(section.id))
                .map((section) => section.label)
                .join(', ')}
              .
            </p>
          ) : null}
        </div>
      ) : null}

      {product?.status === 'live' ? (
        <p className="rounded-card border border-info-border bg-info-subtle p-4 type-body text-info-subtle-fg">
          Changes go to review; the current version stays live until they are approved.
        </p>
      ) : null}

      {readOnly ? (
        <p className="rounded-card border border-warning-border bg-warning-subtle p-4 type-body text-warning-subtle-fg">
          This listing is with the catalogue team, so it is read-only. Withdraw the submission if you need to change something.
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Section list */}
        <nav aria-label="Listing sections" className="lg:col-span-3">
          <ol className="flex flex-col gap-0.5 lg:sticky lg:top-20">
            {SECTIONS.map((section, index) => {
              const errors = errorCount(section)
              const done = completed(section)
              const current = section.id === activeSection
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    aria-current={current ? 'step' : undefined}
                    onClick={() => {
                      setActiveSection(section.id)
                      if (wide) document.getElementById(`section-${section.id}`)?.scrollIntoView({ block: 'start' })
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left transition-colors',
                      'hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                      current && 'bg-primary-subtle text-primary-subtle-fg',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'grid size-5 shrink-0 place-items-center rounded-full border text-2xs font-semibold tabular',
                        done ? 'border-success bg-success text-success-fg' : 'border-border bg-surface text-fg-subtle',
                      )}
                    >
                      {done ? <Check className="size-3" strokeWidth={3} /> : index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate type-body">{section.label}</span>
                    {errors > 0 && showErrors ? (
                      <Badge tone="danger" size="sm">
                        {errors}
                      </Badge>
                    ) : rejectedSections.has(section.id) ? (
                      <Badge tone="warning" size="sm">
                        Fix
                      </Badge>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>

        {/* Form */}
        <div className="lg:col-span-6">
          {!wide ? (
            <p className="mb-3 type-caption text-fg-muted">
              Step {activeIndex + 1} of {SECTIONS.length} · {SECTIONS[activeIndex]?.label}
            </p>
          ) : null}

          <Form form={form} onSubmit={onSubmit} className="gap-6">
            {showErrors && allErrors.length > 0 ? (
              <div id="listing-errors" tabIndex={-1}>
                <ErrorSummary errors={allErrors} />
              </div>
            ) : null}

            {visibleSections.map((section) => (
              <section
                key={section.id}
                id={`section-${section.id}`}
                className="flex scroll-mt-20 flex-col gap-4 rounded-card border border-border bg-surface p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 id={`field-${section.id}`} className="type-title text-fg">
                    {section.label}
                  </h2>
                  {rejectedSections.has(section.id) ? <Badge tone="warning">Fix before resubmitting</Badge> : null}
                </div>

                {section.id === 'category' ? (
                  <div className="flex flex-col gap-3">
                    <SearchInput
                      value={categoryQuery}
                      onValueChange={setCategoryQuery}
                      placeholder="Type what you sell, e.g. kurta"
                      aria-label="Search categories"
                      disabled={readOnly}
                    />
                    <FormField<EditorValues> name="categoryId" label="Category" hint="The category sets the fields, commission, return window and default tax.">
                      {({ value, onChange, describedBy }) => {
                        const query = categoryQuery.trim().toLowerCase()
                        const matches = query
                          ? world.leaves.filter((entry) => entry.path.toLowerCase().includes(query)).slice(0, 8)
                          : world.leaves.filter((entry) => entry.category.id === value).slice(0, 1)
                        return (
                          <ul aria-describedby={describedBy} className="flex flex-col gap-1.5">
                            {matches.length === 0 ? (
                              <li className="type-caption text-fg-muted">
                                {/* Before they type there is nothing to have failed to match. */}
                                {categoryQuery.trim()
                                  ? `Nothing matches “${categoryQuery}”. Try a broader word, such as “kurta” or “phone”.`
                                  : 'Start typing what you sell — “kurta”, “phone”, “kadai” — and pick the closest match.'}
                              </li>
                            ) : null}
                            {matches.map((entry) => (
                              <li key={entry.category.id}>
                                <button
                                  type="button"
                                  disabled={readOnly}
                                  onClick={() => {
                                    onChange(entry.category.id)
                                    form.setValue('hsn', entry.category.hsnDefault, { shouldValidate: true, shouldDirty: true })
                                    form.setValue('gstRate', String(entry.category.gstRate) as EditorValues['gstRate'], { shouldDirty: true })
                                    setCategoryQuery('')
                                  }}
                                  className={cn(
                                    'flex w-full items-center justify-between gap-3 rounded-control border px-3 py-2 text-left transition-colors',
                                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                                    value === entry.category.id
                                      ? 'border-primary bg-primary-subtle text-primary-subtle-fg'
                                      : 'border-border bg-surface hover:bg-surface-2',
                                  )}
                                >
                                  <span className="min-w-0 truncate type-body">{entry.path}</span>
                                  {value === entry.category.id ? <Check aria-hidden className="size-4 shrink-0" /> : null}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )
                      }}
                    </FormField>
                    {category ? (
                      <p className="rounded-card border border-border bg-surface-2 p-3 type-caption text-fg-muted">
                        {category.commissionPct}% commission · {category.returnDays}-day returns · GST {category.gstRate}% · HSN{' '}
                        {category.hsnDefault} by default
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {section.id === 'basics' ? (
                  <div className="flex flex-col gap-4">
                    <FormField<EditorValues>
                      name="title"
                      label="Product title"
                      hint={`${String(title ?? '').length}/150 characters. Lead with the brand and the model.`}
                    >
                      {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                        <Input
                          id={id}
                          name={name}
                          ref={ref as (node: HTMLInputElement | null) => void}
                          maxLength={150}
                          disabled={readOnly}
                          value={String(value ?? '')}
                          onChange={onChange}
                          onBlur={onBlur}
                          invalid={invalid}
                          aria-describedby={describedBy}
                        />
                      )}
                    </FormField>

                    <FormField<EditorValues>
                      name="brand"
                      label="Brand"
                      hint="Write Generic if the product is unbranded."
                      labelAction={
                        <Button
                          variant="link"
                          size="sm"
                          disabled={readOnly}
                          onClick={() =>
                            toast.success('Brand request sent', { description: 'The catalogue team replies within two working days.' })
                          }
                        >
                          Request a brand
                        </Button>
                      }
                    >
                      {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                        <Input
                          id={id}
                          name={name}
                          ref={ref as (node: HTMLInputElement | null) => void}
                          disabled={readOnly}
                          value={String(value ?? '')}
                          onChange={onChange}
                          onBlur={onBlur}
                          invalid={invalid}
                          aria-describedby={describedBy}
                        />
                      )}
                    </FormField>

                    <FormField<EditorValues> name="description" label="Description">
                      {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                        <Textarea
                          id={id}
                          name={name}
                          ref={ref as (node: HTMLTextAreaElement | null) => void}
                          rows={5}
                          maxLength={2000}
                          disabled={readOnly}
                          value={String(value ?? '')}
                          onChange={onChange}
                          onBlur={onBlur}
                          invalid={invalid}
                          aria-describedby={describedBy}
                        />
                      )}
                    </FormField>

                    <FormField<EditorValues> name="highlights" label="Highlights" optional hint="Up to five short lines shown above the description.">
                      {({ value, onChange, describedBy }) => {
                        const list = Array.isArray(value) ? (value as string[]) : ['']
                        return (
                          <div aria-describedby={describedBy} className="flex flex-col gap-2">
                            {list.map((entry, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <Input
                                  aria-label={`Highlight ${index + 1}`}
                                  maxLength={120}
                                  disabled={readOnly}
                                  value={entry}
                                  onChange={(event) => {
                                    const next = [...list]
                                    next[index] = event.target.value
                                    onChange(next)
                                  }}
                                  wrapperClassName="flex-1"
                                />
                                <IconButton
                                  label={`Remove highlight ${index + 1}`}
                                  size="sm"
                                  variant="ghost"
                                  disabled={readOnly || list.length === 1}
                                  icon={<Trash2 aria-hidden />}
                                  onClick={() => onChange(list.filter((_, position) => position !== index))}
                                />
                              </div>
                            ))}
                            {list.length < 5 ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={readOnly}
                                leftIcon={<Plus aria-hidden />}
                                onClick={() => onChange([...list, ''])}
                                className="self-start"
                              >
                                Add highlight
                              </Button>
                            ) : null}
                          </div>
                        )
                      }}
                    </FormField>

                    <FormField<EditorValues> name="keywords" label="Search keywords" optional hint="Words shoppers might type that are not in the title, separated by commas.">
                      {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                        <Input
                          id={id}
                          name={name}
                          ref={ref as (node: HTMLInputElement | null) => void}
                          disabled={readOnly}
                          placeholder="cotton kurta, festive, office wear"
                          value={String(value ?? '')}
                          onChange={onChange}
                          onBlur={onBlur}
                          invalid={invalid}
                          aria-describedby={describedBy}
                        />
                      )}
                    </FormField>
                  </div>
                ) : null}

                {section.id === 'images' ? (
                  <div className="flex flex-col gap-4">
                    {product?.media.length ? (
                      <div className="flex flex-col gap-2">
                        <p className="type-label text-fg">Current photos</p>
                        <ul className="flex flex-wrap gap-2">
                          {product.media.map((media, index) => (
                            <li key={index}>
                              <Img image={media} alt={`Photo ${index + 1} of ${product.title}`} ratio="square" width={96} className="size-24 overflow-hidden rounded-card" />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <ImageUploader value={images} onChange={setImages} max={8} minPixels={1000} />

                    {images.length ? (
                      <fieldset className="flex flex-col gap-2">
                        <legend className="type-label text-fg">Alt text</legend>
                        <p className="type-caption text-fg-muted">
                          Describe each photo for shoppers using a screen reader — it also helps search.
                        </p>
                        {images.map((image, index) => (
                          <Input
                            key={image.id}
                            aria-label={`Alt text for image ${index + 1}`}
                            placeholder={index === 0 ? 'Front view on a plain background' : 'Close-up of the fabric'}
                            value={image.alt}
                            disabled={readOnly}
                            onChange={(event) =>
                              setImages(images.map((entry) => (entry.id === image.id ? { ...entry, alt: event.target.value } : entry)))
                            }
                          />
                        ))}
                      </fieldset>
                    ) : null}

                    {/* Errors appear once they have tried to submit, not on a blank form. */}
                    {imageCount === 0 && showErrors ? (
                      <FieldError>Add at least one photo. Listings without a photo cannot go live.</FieldError>
                    ) : (
                      <FieldHint>
                        {formatNumber(imageCount)} of 8 photos. The first one is the cover — use Move up and Move down to reorder.
                      </FieldHint>
                    )}
                    <FieldHint>
                      Uploads are previews for this session only; a saved listing uses a catalogue photo from its category.
                    </FieldHint>
                  </div>
                ) : null}

                {section.id === 'variants' ? (
                  <div className="flex flex-col gap-4">
                    <Switch
                      checked={axes.length > 0}
                      disabled={readOnly}
                      onCheckedChange={(checked) => setAxes(checked ? [{ axis: 'colour', values: [] }] : [])}
                      label="This product comes in more than one option"
                      description="Pick the options and the combination table builds itself."
                    />

                    {axes.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {axes.map((spec, index) => (
                          <div key={spec.axis} className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <Select
                                aria-label={`Option ${index + 1}`}
                                size="sm"
                                value={spec.axis}
                                disabled={readOnly}
                                onValueChange={(value) =>
                                  setAxes(axes.map((entry, position) => (position === index ? { ...entry, axis: value as VariantAxis } : entry)))
                                }
                                options={AXES.filter((axis) => axis.value === spec.axis || !axes.some((entry) => entry.axis === axis.value)).map((axis) => ({
                                  value: axis.value,
                                  label: axis.label,
                                }))}
                                className="w-36"
                              />
                              <Input
                                aria-label={`Values for ${spec.axis}`}
                                placeholder={AXES.find((axis) => axis.value === spec.axis)?.placeholder}
                                disabled={readOnly}
                                value={spec.values.join(', ')}
                                onChange={(event) =>
                                  setAxes(
                                    axes.map((entry, position) =>
                                      position === index
                                        ? { ...entry, values: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) }
                                        : entry,
                                    ),
                                  )
                                }
                                wrapperClassName="flex-1"
                              />
                              <IconButton
                                label={`Remove ${spec.axis}`}
                                size="sm"
                                variant="ghost"
                                disabled={readOnly}
                                icon={<Trash2 aria-hidden />}
                                onClick={() => setAxes(axes.filter((_, position) => position !== index))}
                              />
                            </div>
                          </div>
                        ))}
                        {axes.length < AXES.length ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={readOnly}
                            leftIcon={<Plus aria-hidden />}
                            className="self-start"
                            onClick={() => {
                              const next = AXES.find((axis) => !axes.some((entry) => entry.axis === axis.value))
                              if (next) setAxes([...axes, { axis: next.value, values: [] }])
                            }}
                          >
                            Add another option
                          </Button>
                        ) : null}
                      </div>
                    ) : null}

                    {/* `relative` keeps the absolutely positioned sr-only caption inside the scroller. */}
                    <div className="relative overflow-x-auto">
                      <table className="w-full border-collapse text-left">
                        <caption className="sr-only">Every combination this listing sells</caption>
                        <thead>
                          <tr className="border-b border-border">
                            <th scope="col" className="py-2 pr-3 type-caption font-semibold whitespace-nowrap text-fg-muted">Variant</th>
                            <th scope="col" className="py-2 pr-3 type-caption font-semibold whitespace-nowrap text-fg-muted">SKU</th>
                            <th scope="col" className="py-2 pr-3 text-right type-caption font-semibold whitespace-nowrap text-fg-muted">MRP</th>
                            <th scope="col" className="py-2 pr-3 text-right type-caption font-semibold whitespace-nowrap text-fg-muted">Price</th>
                            <th scope="col" className="py-2 pr-3 text-right type-caption font-semibold whitespace-nowrap text-fg-muted">Stock</th>
                            <th scope="col" className="py-2 type-caption font-semibold whitespace-nowrap text-fg-muted">Active</th>
                          </tr>
                        </thead>
                        <tbody>
                          {combos.map((options) => {
                            const key = keyOf(options)
                            const row = rowFor(options)
                            const priceError = row.price > row.mrp
                            const set = (patch: Partial<RowData>) => setRowData({ ...rowData, [key]: { ...row, ...patch } })
                            return (
                              <tr key={key} className="border-b border-border-subtle last:border-b-0">
                                <td className="py-2 pr-3 type-body text-fg">{labelOf(options)}</td>
                                <td className="py-2 pr-3">
                                  <Input
                                    size="sm"
                                    aria-label={`SKU for ${labelOf(options)}`}
                                    disabled={readOnly}
                                    invalid={!row.sku.trim()}
                                    value={row.sku}
                                    onChange={(event) => set({ sku: event.target.value })}
                                    wrapperClassName="w-32"
                                  />
                                </td>
                                <td className="py-2 pr-3">
                                  <CurrencyInput
                                    size="sm"
                                    aria-label={`MRP for ${labelOf(options)}`}
                                    disabled={readOnly}
                                    value={String(row.mrp)}
                                    onChange={(event) => set({ mrp: Number(event.target.value) || 0 })}
                                    wrapperClassName="w-28"
                                  />
                                </td>
                                <td className="py-2 pr-3">
                                  <CurrencyInput
                                    size="sm"
                                    aria-label={`Selling price for ${labelOf(options)}`}
                                    disabled={readOnly}
                                    invalid={priceError}
                                    value={String(row.price)}
                                    onChange={(event) => set({ price: Number(event.target.value) || 0 })}
                                    wrapperClassName="w-28"
                                  />
                                </td>
                                <td className="py-2 pr-3">
                                  <Input
                                    size="sm"
                                    inputMode="numeric"
                                    aria-label={`Stock for ${labelOf(options)}`}
                                    disabled={readOnly}
                                    value={String(row.stock)}
                                    onChange={(event) => set({ stock: Number(event.target.value) || 0 })}
                                    wrapperClassName="w-20 tabular"
                                  />
                                </td>
                                <td className="py-2">
                                  <Checkbox
                                    aria-label={`${labelOf(options)} is active`}
                                    checked={row.active}
                                    disabled={readOnly}
                                    onCheckedChange={(checked) => set({ active: Boolean(checked) })}
                                  />
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {combos.length > 1 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="type-caption text-fg-muted">Apply the first row to every variant:</span>
                        {(['mrp', 'price', 'stock'] as const).map((column) => (
                          <Button
                            key={column}
                            size="sm"
                            variant="outline"
                            disabled={readOnly}
                            onClick={() => {
                              const source = rowFor(combos[0] ?? {})
                              const next = { ...rowData }
                              for (const options of combos) {
                                const key = keyOf(options)
                                next[key] = { ...rowFor(options), [column]: source[column] }
                              }
                              setRowData(next)
                            }}
                          >
                            {column === 'mrp' ? 'MRP' : column === 'price' ? 'Price' : 'Stock'}
                          </Button>
                        ))}
                      </div>
                    ) : null}

                    {variantErrors > 0 && showErrors ? (
                      <FieldError>Every row needs a SKU, and the selling price cannot be above the MRP.</FieldError>
                    ) : (
                      <FieldHint>
                        {formatNumber(combos.length)} {combos.length === 1 ? 'variant' : 'variants'} will be created.
                      </FieldHint>
                    )}
                  </div>
                ) : null}

                {section.id === 'pricing' ? (
                  <div className="flex flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <NumberField form={form} name="mrp" label="MRP" prefix="₹" disabled={readOnly} />
                      <NumberField form={form} name="price" label="Selling price" prefix="₹" disabled={readOnly} />
                    </div>
                    {Number.isFinite(mrp) && Number.isFinite(price) && price > mrp ? (
                      <FieldError>The selling price cannot be higher than the MRP.</FieldError>
                    ) : Number.isFinite(mrp) && mrp > 0 && price > 0 ? (
                      <p className="rounded-card border border-border bg-surface-2 p-3 type-body text-fg">
                        {discountPercent(mrp, price)}% off · shoppers see {formatINR(price)} with MRP {formatINR(mrp)} struck through.
                      </p>
                    ) : null}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField<EditorValues>
                        name="hsn"
                        label="HSN code"
                        hint={category ? `${category.hsnDefault} is the usual code for ${category.name}.` : 'Four to eight digits.'}
                        labelAction={
                          category ? (
                            <Button
                              variant="link"
                              size="sm"
                              disabled={readOnly}
                              onClick={() => form.setValue('hsn', category.hsnDefault, { shouldValidate: true, shouldDirty: true })}
                            >
                              Use {category.hsnDefault}
                            </Button>
                          ) : null
                        }
                      >
                        {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                          <Input
                            id={id}
                            name={name}
                            ref={ref as (node: HTMLInputElement | null) => void}
                            inputMode="numeric"
                            maxLength={8}
                            disabled={readOnly}
                            value={String(value ?? '')}
                            onChange={onChange}
                            onBlur={onBlur}
                            invalid={invalid}
                            aria-describedby={describedBy}
                            className="tabular"
                          />
                        )}
                      </FormField>

                      <FormField<EditorValues> name="gstRate" label="GST rate">
                        {({ id, value, onChange, describedBy }) => (
                          <Select
                            id={id}
                            aria-describedby={describedBy}
                            disabled={readOnly}
                            value={String(value ?? '18')}
                            onValueChange={onChange}
                            options={[
                              { value: '0', label: '0% — exempt' },
                              { value: '5', label: '5%' },
                              { value: '18', label: '18%' },
                              { value: '40', label: '40%' },
                            ]}
                          />
                        )}
                      </FormField>
                    </div>

                    <p className="type-caption text-fg-muted">
                      Prices include GST. Chowk shows “Inclusive of all taxes” next to every price on the storefront.
                    </p>
                  </div>
                ) : null}

                {section.id === 'shipping' ? (
                  <div className="flex flex-col gap-4">
                    <NumberField form={form} name="weightKg" label="Packed weight" suffix="kg" step="0.01" disabled={readOnly} />
                    <fieldset className="flex flex-col gap-1.5">
                      <legend className="type-label text-fg">Box size</legend>
                      <div className="grid grid-cols-3 gap-2">
                        <NumberField form={form} name="lengthCm" label="Length" suffix="cm" disabled={readOnly} />
                        <NumberField form={form} name="breadthCm" label="Breadth" suffix="cm" disabled={readOnly} />
                        <NumberField form={form} name="heightCm" label="Height" suffix="cm" disabled={readOnly} />
                      </div>
                    </fieldset>
                    <p className="rounded-card border border-border bg-surface-2 p-3 type-caption text-fg-muted">
                      Volumetric weight{' '}
                      <span className="font-semibold text-fg">
                        {Math.round(((values.lengthCm * values.breadthCm * values.heightCm) / 5000) * 100) / 100} kg
                      </span>{' '}
                      (length × breadth × height ÷ 5000). Couriers bill the higher of this and the real weight.
                    </p>
                    <FormField<EditorValues> name="dispatchDays" label="Dispatch within" hint="The deadline shoppers see, and the one your dispatch score is measured against.">
                      {({ id, value, onChange, describedBy }) => (
                        <Select
                          id={id}
                          aria-describedby={describedBy}
                          disabled={readOnly}
                          value={String(value ?? '2')}
                          onValueChange={onChange}
                          options={[
                            { value: '1', label: '1 working day' },
                            { value: '2', label: '2 working days' },
                            { value: '3', label: '3 working days' },
                          ]}
                        />
                      )}
                    </FormField>
                  </div>
                ) : null}

                {section.id === 'compliance' ? (
                  <div className="flex flex-col gap-4">
                    <FormField<EditorValues> name="countryOfOrigin" label="Country of origin">
                      {({ id, value, onChange, describedBy }) => (
                        <Select
                          id={id}
                          aria-describedby={describedBy}
                          disabled={readOnly}
                          value={String(value ?? 'India')}
                          onValueChange={onChange}
                          options={COUNTRIES.map((country) => ({ value: country, label: country }))}
                        />
                      )}
                    </FormField>
                    <FormField<EditorValues> name="manufacturer" label="Manufacturer, packer or importer" hint="The name and address shown on the invoice, as the law requires.">
                      {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                        <Input
                          id={id}
                          name={name}
                          ref={ref as (node: HTMLInputElement | null) => void}
                          disabled={readOnly}
                          value={String(value ?? '')}
                          onChange={onChange}
                          onBlur={onBlur}
                          invalid={invalid}
                          aria-describedby={describedBy}
                        />
                      )}
                    </FormField>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField<EditorValues> name="netQuantity" label="Net quantity" hint="For example “1 unit”, “500 g” or “pack of 3”.">
                        {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                          <Input
                            id={id}
                            name={name}
                            ref={ref as (node: HTMLInputElement | null) => void}
                            disabled={readOnly}
                            value={String(value ?? '')}
                            onChange={onChange}
                            onBlur={onBlur}
                            invalid={invalid}
                            aria-describedby={describedBy}
                          />
                        )}
                      </FormField>
                      <FormField<EditorValues> name="warranty" label="Warranty" optional>
                        {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                          <Input
                            id={id}
                            name={name}
                            ref={ref as (node: HTMLInputElement | null) => void}
                            disabled={readOnly}
                            placeholder="1 year manufacturer warranty"
                            value={String(value ?? '')}
                            onChange={onChange}
                            onBlur={onBlur}
                            invalid={invalid}
                            aria-describedby={describedBy}
                          />
                        )}
                      </FormField>
                    </div>
                  </div>
                ) : null}
              </section>
            ))}

            {!wide ? (
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  leftIcon={<ArrowLeft aria-hidden />}
                  disabled={activeIndex === 0}
                  onClick={() => setActiveSection(SECTIONS[Math.max(0, activeIndex - 1)]?.id ?? 'category')}
                >
                  Back
                </Button>
                <Button
                  variant="outline"
                  rightIcon={<ArrowRight aria-hidden />}
                  disabled={activeIndex === SECTIONS.length - 1}
                  onClick={() => setActiveSection(SECTIONS[Math.min(SECTIONS.length - 1, activeIndex + 1)]?.id ?? 'compliance')}
                >
                  Next
                </Button>
              </div>
            ) : null}

            <FormActions sticky note={savedLabel ? `Draft saved · ${savedLabel}` : 'Not saved yet'}>
              <Button
                type="button"
                variant="ghost"
                disabled={readOnly}
                onClick={() => {
                  form.reset()
                  setImages([])
                  toast.message('Changes discarded')
                }}
              >
                Discard
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={readOnly}
                onClick={() => persist(false, { title: 'Draft saved', description: 'Come back to it from Products › Draft.' })}
              >
                Save draft
              </Button>
              <Button type="submit" disabled={readOnly} onClick={() => setShowErrors(true)}>
                Submit for review
              </Button>
            </FormActions>
          </Form>
        </div>

        {/* Preview */}
        {wide ? <div className="lg:col-span-3">{previewPanel}</div> : null}
      </div>

      <Dialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.()
        }}
      >
        <DialogContent
          title="Leave without saving?"
          description="This listing has changes that have not been saved to your catalogue."
          size="sm"
          footer={
            <>
              <DialogClose asChild>
                <Button variant="outline">Keep editing</Button>
              </DialogClose>
              <Button variant="danger" onClick={() => blocker.proceed?.()}>
                Leave and lose changes
              </Button>
            </>
          }
        >
          <p className="type-body text-fg-muted">
            Save the draft first and you can pick it up from Products › Draft at any time.
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
