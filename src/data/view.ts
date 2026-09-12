// Seed data ⊕ the overlay of demo changes = the world every selector reads.
//
// The merge is cached on the overlay object itself, so as long as nothing has
// changed, selectors keep reading the same `View` (and React keeps skipping
// renders). A change produces a new overlay object, and therefore a new view.

import { getDb, getDbCore, indexDb, type Db, type DbCore } from './db'
import { EMPTY_OVERLAY, getOverlay, type OverlayData } from '@/stores/mock-db'
import type { ID, KycItem, Notification, Product, Seller, Shipment, Variant } from './types'

export type View = Db & { overlay: OverlayData }

/** Records created during the demo come first; patches apply to both. */
function combine<T>(added: readonly T[], seed: readonly T[]): T[] {
  return added.length > 0 ? [...added, ...seed] : (seed as T[])
}

function patched<T extends { id: ID }>(seed: readonly T[], patches: Record<ID, Partial<T>>): T[] {
  if (Object.keys(patches).length === 0) return seed as T[]
  return seed.map((item) => {
    const patch = patches[item.id]
    return patch ? { ...item, ...patch } : item
  })
}

function mergeProducts(seed: readonly Product[], overlay: OverlayData): Product[] {
  const all = combine(overlay.products, seed)
  const hasPatches = Object.keys(overlay.productPatches).length > 0 || Object.keys(overlay.variantPatches).length > 0
  if (!hasPatches) return all
  return all.map((product) => {
    const patch = overlay.productPatches[product.id]
    const variantPatch = overlay.variantPatches[product.id]
    if (!patch && !variantPatch) return product
    const next: Product = patch ? { ...product, ...patch } : { ...product }
    if (variantPatch) {
      next.variants = next.variants.map((variant: Variant) => {
        const change = variantPatch[variant.id]
        return change ? { ...variant, ...change } : variant
      })
    }
    return next
  })
}

function mergeShipments(seed: readonly Shipment[], overlay: OverlayData): Shipment[] {
  const all = combine(overlay.shipments, seed)
  const hasPatches = Object.keys(overlay.shipmentPatches).length > 0 || Object.keys(overlay.shipmentEvents).length > 0
  if (!hasPatches) return all
  return all.map((shipment) => {
    const patch = overlay.shipmentPatches[shipment.id]
    const events = overlay.shipmentEvents[shipment.id]
    if (!patch && !events) return shipment
    const next: Shipment = patch ? { ...shipment, ...patch } : { ...shipment }
    if (events && events.length > 0) next.events = [...next.events, ...events]
    return next
  })
}

function mergeSellers(seed: readonly Seller[], overlay: OverlayData): Seller[] {
  const all = combine(overlay.sellers, seed)
  const hasPatches = Object.keys(overlay.sellerPatches).length > 0 || Object.keys(overlay.kycPatches).length > 0
  if (!hasPatches) return all
  return all.map((seller) => {
    const patch = overlay.sellerPatches[seller.id]
    const kycPatch = overlay.kycPatches[seller.id]
    if (!patch && !kycPatch) return seller
    const next: Seller = patch ? { ...seller, ...patch } : { ...seller }
    if (kycPatch) {
      next.kyc = next.kyc.map((item: KycItem) => {
        const change = kycPatch[item.key]
        return change ? { ...item, status: change.status, ...(change.note ? { note: change.note } : {}) } : item
      })
    }
    return next
  })
}

function mergeNotifications(seed: readonly Notification[], overlay: OverlayData): Notification[] {
  const all = combine(overlay.notifications, seed)
  const read = new Set(overlay.readNotifications)
  if (read.size === 0) return all
  return all.map((notification) => (read.has(notification.id) ? { ...notification, read: true } : notification))
}

function mergeCore(core: DbCore, overlay: OverlayData): DbCore {
  const coupons = Object.keys(overlay.couponUpserts).length
    ? (() => {
        const merged = core.coupons.map((coupon) => overlay.couponUpserts[coupon.code] ?? coupon)
        const codes = new Set(merged.map((coupon) => coupon.code))
        for (const [code, coupon] of Object.entries(overlay.couponUpserts)) {
          if (!codes.has(code)) merged.unshift(coupon)
        }
        return merged
      })()
    : core.coupons

  return {
    settings: Object.keys(overlay.settingsPatch).length ? { ...core.settings, ...overlay.settingsPatch } : core.settings,
    categories: core.categories,
    products: mergeProducts(core.products, overlay),
    sellers: mergeSellers(core.sellers, overlay),
    customers: patched(combine(overlay.customers, core.customers), overlay.customerPatches),
    orders: patched(combine(overlay.orders, core.orders), overlay.orderPatches),
    shipments: mergeShipments(core.shipments, overlay),
    items: overlay.items.length ? [...core.items, ...overlay.items] : core.items,
    returns: patched(combine(overlay.returns, core.returns), overlay.returnPatches),
    reviews: patched(combine(overlay.reviews, core.reviews), overlay.reviewPatches),
    payouts: patched(core.payouts, overlay.payoutPatches),
    coupons,
    notifications: mergeNotifications(core.notifications, overlay),
    audit: overlay.audit.length ? [...overlay.audit, ...core.audit] : core.audit,
    metrics: core.metrics,
    roles: core.roles,
    admins: core.admins,
  }
}

const cache = new WeakMap<OverlayData, View>()
let baseView: View | null = null

/** The merged world. Cached per overlay object, so repeated reads are free. */
export function getView(overlay: OverlayData = getOverlay()): View {
  if (overlay === EMPTY_OVERLAY || overlay.revision === 0) {
    if (!baseView) baseView = { ...getDb(), overlay }
    return baseView
  }
  const hit = cache.get(overlay)
  if (hit) return hit
  const view: View = { ...indexDb(mergeCore(getDbCore(), overlay)), overlay }
  cache.set(overlay, view)
  return view
}
