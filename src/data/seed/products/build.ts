// A small factory so 85 hand-authored listings stay readable. It fills in the
// boring fields (ids, SKUs, HSN, GST, rating distribution, spec groups) from the
// category and a few inputs, and leaves the interesting ones to the catalogue files.

import { DEMO_NOW } from '../../constants'
import { SEED_CATEGORIES } from '../categories'
import { addDaysIso } from '@/lib/date'
import type { MediaRef } from '../../images'
import type {
  BookCover,
  ColourSwatch,
  GstRate,
  ModerationInfo,
  Product,
  ProductOffer,
  ProductStatus,
  ProductTag,
  Rating,
  SpecGroup,
  Variant,
  VariantAxis,
} from '../../types'

const CATEGORY_BY_ID = new Map(SEED_CATEGORIES.map((category) => [category.id, category]))

/** Nested plain object → SpecGroup[], keeping the authored order. */
export type SpecInput = Record<string, Record<string, string>>

export interface VariantInput {
  options?: Partial<Record<VariantAxis, string>>
  mrp?: number
  price?: number
  stock: number
  lowStockAt?: number
  active?: boolean
  media?: MediaRef[]
}

export interface ProductInput {
  /** URL slug; the id is derived from it. */
  slug: string
  title: string
  brand: string
  categoryId: string
  sellerId: string
  /** Single-SKU products give a price here instead of variants. */
  mrp?: number
  price?: number
  stock?: number
  lowStockAt?: number
  axes?: VariantAxis[]
  variants?: VariantInput[]
  swatches?: ColourSwatch[]
  media?: MediaRef[]
  cover?: BookCover
  description: string
  highlights: string[]
  specs?: SpecInput
  keywords?: string[]
  /** [average, number of ratings] */
  rating: [number, number]
  tags?: ProductTag[]
  /** Days from now until the deal ends (deals only). */
  dealEndsInHours?: number
  returnDays?: number
  cod?: boolean
  status?: ProductStatus
  moderation?: ModerationInfo
  hsn?: string
  gstRate?: GstRate
  dispatchDays?: number
  weightKg?: number
  dimensionsCm?: [number, number, number]
  countryOfOrigin?: string
  manufacturer?: string
  warranty?: string
  /** Days before "now" that the listing went live. */
  ageDays?: number
  otherOffers?: ProductOffer[]
  netQuantity?: string
}

const RATING_SHAPES: readonly { min: number; weights: [number, number, number, number, number] }[] = [
  { min: 4.6, weights: [0.74, 0.17, 0.04, 0.02, 0.03] },
  { min: 4.4, weights: [0.64, 0.21, 0.07, 0.03, 0.05] },
  { min: 4.2, weights: [0.56, 0.24, 0.09, 0.05, 0.06] },
  { min: 4.0, weights: [0.48, 0.26, 0.12, 0.06, 0.08] },
  { min: 3.7, weights: [0.4, 0.25, 0.16, 0.09, 0.1] },
  { min: 0, weights: [0.3, 0.22, 0.2, 0.13, 0.15] },
]

/** A believable star breakdown for an average and a count; always sums to the count. */
export function ratingDist(avg: number, count: number): Rating['dist'] {
  const shape = RATING_SHAPES.find((row) => avg >= row.min) ?? RATING_SHAPES[RATING_SHAPES.length - 1]
  const weights = shape?.weights ?? [0.5, 0.25, 0.1, 0.05, 0.1]
  const dist: [number, number, number, number, number] = [0, 0, 0, 0, 0]
  let assigned = 0
  for (let index = 1; index < 5; index += 1) {
    const value = Math.round((weights[index] ?? 0) * count)
    dist[index] = value
    assigned += value
  }
  dist[0] = Math.max(0, count - assigned)
  return dist
}

function skuBase(slug: string): string {
  return slug.replace(/-/g, '').slice(0, 10).toUpperCase()
}

function variantLabelOf(options: Partial<Record<VariantAxis, string>>): string {
  return Object.values(options).filter(Boolean).join(' · ')
}

function toSpecGroups(specs: SpecInput | undefined, extra: Record<string, string>): SpecGroup[] {
  const groups: SpecGroup[] = []
  for (const [group, items] of Object.entries(specs ?? {})) {
    groups.push({ group, items: Object.entries(items).map(([label, value]) => ({ label, value })) })
  }
  const manufacturing = Object.entries(extra).map(([label, value]) => ({ label, value }))
  if (manufacturing.length > 0) groups.push({ group: 'Manufacturing & packing', items: manufacturing })
  return groups
}

/** The human label for a variant, e.g. "Midnight Teal · 128 GB". */
export function variantLabel(variant: Pick<Variant, 'options'>): string {
  return variantLabelOf(variant.options)
}

export function buildProduct(input: ProductInput): Product {
  const category = CATEGORY_BY_ID.get(input.categoryId)
  if (!category) throw new Error(`Unknown category ${input.categoryId} for ${input.slug}`)

  const id = `prd_${input.slug.replace(/-/g, '_')}`
  const base = skuBase(input.slug)
  const variantInputs: VariantInput[] =
    input.variants && input.variants.length > 0
      ? input.variants
      : [{ options: {}, stock: input.stock ?? 24, lowStockAt: input.lowStockAt }]

  const variants: Variant[] = variantInputs.map((variant, index) => ({
    id: `${id}_v${index + 1}`,
    sku: `${base}-${String(index + 1).padStart(2, '0')}`,
    options: variant.options ?? {},
    mrp: variant.mrp ?? input.mrp ?? input.price ?? 0,
    price: variant.price ?? input.price ?? variant.mrp ?? input.mrp ?? 0,
    stock: variant.stock,
    lowStockAt: variant.lowStockAt ?? 5,
    active: variant.active ?? true,
    ...(variant.media ? { media: variant.media } : {}),
  }))

  const [avg, count] = input.rating
  const ageDays = input.ageDays ?? 120

  return {
    id,
    slug: input.slug,
    title: input.title,
    brand: input.brand,
    categoryId: input.categoryId,
    sellerId: input.sellerId,
    otherOffers: input.otherOffers ?? [],
    description: input.description,
    highlights: input.highlights,
    specs: toSpecGroups(input.specs, {
      'Country of origin': input.countryOfOrigin ?? 'India',
      Manufacturer: input.manufacturer ?? 'Marketed by the seller',
      ...(input.netQuantity ? { 'Net quantity': input.netQuantity } : {}),
      ...(input.warranty ? { Warranty: input.warranty } : {}),
    }),
    media: input.media ?? [],
    ...(input.cover ? { cover: input.cover } : {}),
    axes: input.axes ?? [],
    variants,
    ...(input.swatches ? { swatches: input.swatches } : {}),
    rating: { avg, count, dist: ratingDist(avg, count) },
    tags: input.tags ?? [],
    ...(input.dealEndsInHours !== undefined
      ? { dealEndsAt: addDaysIso(DEMO_NOW, input.dealEndsInHours / 24) }
      : {}),
    returnDays: input.returnDays ?? category.returnDays,
    cod: input.cod ?? true,
    status: input.status ?? 'live',
    hsn: input.hsn ?? category.hsnDefault,
    gstRate: input.gstRate ?? category.gstRate,
    dispatchDays: input.dispatchDays ?? 1,
    weightKg: input.weightKg ?? 0.5,
    dimensionsCm: input.dimensionsCm ?? [20, 15, 8],
    countryOfOrigin: input.countryOfOrigin ?? 'India',
    manufacturer: input.manufacturer ?? 'Marketed by the seller',
    ...(input.warranty ? { warranty: input.warranty } : {}),
    keywords: input.keywords ?? [],
    createdAt: addDaysIso(DEMO_NOW, -ageDays),
    updatedAt: addDaysIso(DEMO_NOW, -Math.min(ageDays, 9)),
    ...(input.moderation ? { moderation: input.moderation } : {}),
  }
}

export function buildProducts(inputs: ProductInput[]): Product[] {
  return inputs.map(buildProduct)
}

/** Terse helper for clothing and footwear: one variant per size. */
export function sizeVariants(
  sizes: readonly string[],
  mrp: number,
  price: number,
  stocks: readonly number[] = [],
): VariantInput[] {
  return sizes.map((size, index) => ({
    options: { size },
    mrp,
    price,
    stock: stocks[index] ?? 12,
  }))
}

/** One variant per colour, each with its own photo. */
export function colourVariants(
  colours: readonly { name: string; media?: MediaRef[]; stock?: number }[],
  mrp: number,
  price: number,
): VariantInput[] {
  return colours.map((colour) => ({
    options: { colour: colour.name },
    mrp,
    price,
    stock: colour.stock ?? 16,
    ...(colour.media ? { media: colour.media } : {}),
  }))
}
