// The only public entry to the data layer. Pages import from `@/data` — never from
// `seed/`, `generate/`, `db`, `view` or the overlay store directly.
//
//   import { useDemoQuery, getSellerKpis, dbActions, useCart } from '@/data'

// ── Types and images ──────────────────────────────────────────────────────
export type * from './types'
export { IMAGES, imageUrl, imageSrcSet, mediaImageId } from './images'
export type { ImageAsset, ImageId, ImageTint, MediaRef, ImageUrlOptions } from './images'

// ── Constants ─────────────────────────────────────────────────────────────
export {
  DEMO,
  DEMO_NOW,
  DEMO_NOW_MS,
  DEMO_OTP,
  DEFAULT_SETTINGS,
  COURIER_NAME,
  FAILING_CARD_SUFFIX,
  FAILING_VPA,
  MAX_QTY_PER_LINE,
  KNOWN_PINS,
  PIN_TABLE,
  SEED,
  STATES,
  lookupPin,
  stateByCode,
  stateNameByCode,
  stateDistance,
} from './constants'
export type { IndianState, PinInfo } from './constants'

// ── Reading ───────────────────────────────────────────────────────────────
export { useDb, useDemoQuery, useDemoParam, useView } from './hooks'
export type { DemoQuery, QueryStatus } from './hooks'
export { getView } from './view'
export type { View } from './view'
export * from './selectors'

// ── Writing ───────────────────────────────────────────────────────────────
export { dbActions } from './actions'
export type {
  ActionResult,
  CheckoutInput,
  CheckoutLine,
  DbActions,
  PlaceOrderResult,
  ProductInput,
  SellerRegistrationInput,
} from './actions'

// ── Stores ────────────────────────────────────────────────────────────────
export { useCart, cartCount, checkoutLines } from '@/stores/cart'
export type { CartLine, CartState, CheckoutDraft, DeliverySpeed } from '@/stores/cart'
export { useWishlist, isWishlisted } from '@/stores/wishlist'
export { useRecent } from '@/stores/recent'
export { useSession, getSession } from '@/stores/session'
export type { SessionState } from '@/stores/session'
export { useDemo, currentLatencyMs, LATENCY_MS } from '@/stores/demo'
export type { ForcedState, Latency } from '@/stores/demo'
export { useMockDb } from '@/stores/mock-db'
export { resetDemo, demoStorageKeys } from '@/stores/reset'
export { initCrossTabSync } from '@/stores/sync'
