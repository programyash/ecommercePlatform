// Variant choice lives in the URL (?colour=Midnight+Teal&storage=256+GB), so a
// shared product link opens on exactly the variant the shopper was looking at.

import { useCallback, useMemo } from 'react'
import type { Product, Variant, VariantAxis } from '@/data'
import { defaultVariant } from '@/components/commerce/product-card'
import { useUrlParams } from '@/lib/use-url-state'

export type Selection = Partial<Record<VariantAxis, string>>

export const AXIS_LABEL: Record<VariantAxis, string> = {
  colour: 'Colour',
  size: 'Size',
  storage: 'Storage',
  pack: 'Pack',
}

export interface AxisChoice {
  value: string
  /** Not sold in combination with the other axes the shopper has chosen. */
  unavailable?: boolean
  /** Exists, but every matching variant is out of stock. */
  outOfStock?: boolean
}

function sellableVariants(product: Product): Variant[] {
  const active = product.variants.filter((variant) => variant.active)
  return active.length > 0 ? active : product.variants
}

function matches(variant: Variant, selection: Selection): boolean {
  return Object.entries(selection).every(([axis, value]) => !value || variant.options[axis as VariantAxis] === value)
}

/** The variant for a selection, falling back to the closest sellable one. */
export function variantFor(product: Product, selection: Selection): Variant {
  const variants = sellableVariants(product)
  const exact = variants.find((variant) => matches(variant, selection))
  if (exact) return exact
  return defaultVariant(product)
}

export function axisValues(product: Product, axis: VariantAxis): string[] {
  const values: string[] = []
  for (const variant of sellableVariants(product)) {
    const value = variant.options[axis]
    if (value && !values.includes(value)) values.push(value)
  }
  return values
}

/** Every value on one axis, marked against what the shopper has already chosen. */
export function axisChoices(product: Product, axis: VariantAxis, selection: Selection): AxisChoice[] {
  const others: Selection = { ...selection }
  delete others[axis]
  return axisValues(product, axis).map((value) => {
    const candidates = sellableVariants(product).filter(
      (variant) => variant.options[axis] === value && matches(variant, others),
    )
    if (candidates.length === 0) return { value, unavailable: true }
    if (candidates.every((variant) => variant.stock <= 0)) return { value, outOfStock: true }
    return { value }
  })
}

/** The other axes the shopper has chosen, worded for the "not sold with …" hint. */
export function otherAxisSummary(product: Product, axis: VariantAxis, selection: Selection): string {
  return product.axes
    .filter((entry) => entry !== axis && selection[entry])
    .map((entry) => selection[entry])
    .filter((value): value is string => Boolean(value))
    .join(' · ')
}

export interface VariantSelection {
  selection: Selection
  variant: Variant
  setAxis: (axis: VariantAxis, value: string) => void
}

export function useVariantSelection(product: Product): VariantSelection {
  const { params, setParams } = useUrlParams()

  const selection = useMemo<Selection>(() => {
    const fallback = defaultVariant(product)
    const next: Selection = {}
    for (const axis of product.axes) {
      const fromUrl = params.get(axis)
      const known = fromUrl ? axisValues(product, axis).includes(fromUrl) : false
      const value = known && fromUrl ? fromUrl : fallback.options[axis]
      if (value) next[axis] = value
    }
    return next
  }, [product, params])

  const variant = variantFor(product, selection)

  const setAxis = useCallback(
    (axis: VariantAxis, value: string) => {
      // Changing one axis can strand the others (no "Frost Silver · 512 GB"), so the
      // whole selection is repaired from the best variant that carries the new value.
      const wanted: Selection = { ...selection, [axis]: value }
      const variants = sellableVariants(product)
      const exact = variants.find((entry) => matches(entry, wanted))
      const repaired =
        exact ??
        variants
          .filter((entry) => entry.options[axis] === value)
          .sort((a, b) => (b.stock > 0 ? 1 : 0) - (a.stock > 0 ? 1 : 0) || a.price - b.price)[0]
      const next: Record<string, string | null> = {}
      for (const entry of product.axes) next[entry] = repaired?.options[entry] ?? null
      setParams(next)
    },
    [product, selection, setParams],
  )

  return { selection, variant, setAxis }
}
