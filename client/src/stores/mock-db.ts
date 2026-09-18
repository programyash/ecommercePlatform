// The overlay: everything the demo has changed on top of the seed database.
// Nothing else may write here — `dbActions` in `@/data` is the only door — and the
// merge back into a readable world happens in `data/view.ts`.
//
// It is persisted, so a shopper's order survives a reload and shows up in the
// Seller Hub in another tab.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { persisted } from './create-persisted'
import type {
  AuditEntry,
  Coupon,
  Customer,
  ID,
  KycKey,
  KycStatus,
  Notification,
  Order,
  OrderItem,
  Payout,
  PlatformSettings,
  Product,
  ReturnRequest,
  Review,
  Seller,
  Shipment,
  TimelineEvent,
  Variant,
} from '@/data/types'

export interface KycPatch {
  status: KycStatus
  note?: string
}

/** Everything the demo has added or changed. Patches are shallow-merged onto seed records. */
export interface OverlayData {
  /** Records created during the demo. */
  orders: Order[]
  shipments: Shipment[]
  items: OrderItem[]
  returns: ReturnRequest[]
  products: Product[]
  sellers: Seller[]
  reviews: Review[]
  customers: Customer[]
  notifications: Notification[]
  audit: AuditEntry[]

  /** Shallow patches applied to seed records, by id. */
  orderPatches: Record<ID, Partial<Order>>
  shipmentPatches: Record<ID, Partial<Shipment>>
  /** Events appended to a shipment's timeline. */
  shipmentEvents: Record<ID, TimelineEvent[]>
  returnPatches: Record<ID, Partial<ReturnRequest>>
  productPatches: Record<ID, Partial<Product>>
  /** productId → variantId → patch. */
  variantPatches: Record<ID, Record<ID, Partial<Variant>>>
  sellerPatches: Record<ID, Partial<Seller>>
  kycPatches: Record<ID, Partial<Record<KycKey, KycPatch>>>
  reviewPatches: Record<ID, Partial<Review>>
  payoutPatches: Record<ID, Partial<Payout>>
  customerPatches: Record<ID, Partial<Customer>>
  couponUpserts: Record<string, Coupon>
  settingsPatch: Partial<PlatformSettings>
  /** Notification ids marked read. */
  readNotifications: ID[]
  /** Bumped on every write so selectors can cheaply detect a change. */
  revision: number
}

export const EMPTY_OVERLAY: OverlayData = {
  orders: [],
  shipments: [],
  items: [],
  returns: [],
  products: [],
  sellers: [],
  reviews: [],
  customers: [],
  notifications: [],
  audit: [],
  orderPatches: {},
  shipmentPatches: {},
  shipmentEvents: {},
  returnPatches: {},
  productPatches: {},
  variantPatches: {},
  sellerPatches: {},
  kycPatches: {},
  reviewPatches: {},
  payoutPatches: {},
  customerPatches: {},
  couponUpserts: {},
  settingsPatch: {},
  readNotifications: [],
  revision: 0,
}

export interface MockDbState {
  overlay: OverlayData
  /** Replace the overlay with the result of `mutate`. Used only by `dbActions`. */
  apply: (mutate: (overlay: OverlayData) => OverlayData) => void
  /** Back to the seed data. */
  resetOverlay: () => void
}

export const useMockDb = create<MockDbState>()(
  persist(
    (set) => ({
      overlay: EMPTY_OVERLAY,
      apply: (mutate) =>
        set((state) => {
          const next = mutate(state.overlay)
          return { overlay: { ...next, revision: state.overlay.revision + 1 } }
        }),
      resetOverlay: () => set({ overlay: { ...EMPTY_OVERLAY } }),
    }),
    persisted<MockDbState, { overlay: OverlayData }>('mock-db', 3, (state) => ({ overlay: state.overlay })),
  ),
)

/** Read the overlay outside React (actions, tests). */
export function getOverlay(): OverlayData {
  return useMockDb.getState().overlay
}

/** Apply a change to the overlay outside React. */
export function applyOverlay(mutate: (overlay: OverlayData) => OverlayData): void {
  useMockDb.getState().apply(mutate)
}

// ── Small immutable helpers used by dbActions ─────────────────────────────

export function patchRecord<T>(map: Record<ID, Partial<T>>, id: ID, patch: Partial<T>): Record<ID, Partial<T>> {
  return { ...map, [id]: { ...map[id], ...patch } }
}

export function appendEvents(
  map: Record<ID, TimelineEvent[]>,
  id: ID,
  events: TimelineEvent[],
): Record<ID, TimelineEvent[]> {
  return { ...map, [id]: [...(map[id] ?? []), ...events] }
}

export function patchVariant(
  map: Record<ID, Record<ID, Partial<Variant>>>,
  productId: ID,
  variantId: ID,
  patch: Partial<Variant>,
): Record<ID, Record<ID, Partial<Variant>>> {
  const forProduct = map[productId] ?? {}
  return { ...map, [productId]: { ...forProduct, [variantId]: { ...forProduct[variantId], ...patch } } }
}

export function patchKyc(
  map: Record<ID, Partial<Record<KycKey, KycPatch>>>,
  sellerId: ID,
  key: KycKey,
  patch: KycPatch,
): Record<ID, Partial<Record<KycKey, KycPatch>>> {
  return { ...map, [sellerId]: { ...map[sellerId], [key]: patch } }
}
