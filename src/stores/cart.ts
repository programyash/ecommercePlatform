// The cart, saved-for-later, the delivery PIN, the applied coupon and the
// checkout draft. Quantities are clamped to five per line (and to whatever stock
// the caller passes), which is why `add` and `setQty` take the available stock.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { persisted } from './create-persisted'
import { MAX_QTY_PER_LINE } from '@/data/constants'
import type { ID, PaymentMethod } from '@/data/types'

export interface CartLine {
  /** Stable per product+variant, so the same variant never appears twice. */
  lineId: string
  productId: ID
  variantId: ID
  sellerId: ID
  qty: number
}

export type DeliverySpeed = 'standard' | 'express'

export interface CheckoutDraft {
  addressId?: ID
  /** Per seller (that is, per shipment). */
  deliverySpeed: Record<ID, DeliverySpeed>
  gstInvoice?: { gstin: string; businessName: string }
  paymentMethod?: PaymentMethod
}

export interface AddLineInput {
  productId: ID
  variantId: ID
  sellerId: ID
  qty?: number
  /** Units available; the line is capped at this (and at five). */
  stock?: number
}

export interface CartState {
  lines: CartLine[]
  saved: CartLine[]
  couponCode: string | null
  /** Delivery PIN, remembered across the whole storefront. */
  pin: string | null
  /** "Buy now" checks out a single line without touching the cart. */
  buyNow: CartLine | null
  checkout: CheckoutDraft
  add: (input: AddLineInput) => void
  setQty: (lineId: string, qty: number, stock?: number) => void
  remove: (lineId: string) => void
  saveForLater: (lineId: string) => void
  moveToCart: (lineId: string) => void
  removeSaved: (lineId: string) => void
  clear: () => void
  setCoupon: (code: string | null) => void
  setPin: (pin: string | null) => void
  setBuyNow: (line: AddLineInput | null) => void
  setCheckout: (patch: Partial<CheckoutDraft>) => void
  setDeliverySpeed: (sellerId: ID, speed: DeliverySpeed) => void
  resetCheckout: () => void
}

const EMPTY_CHECKOUT: CheckoutDraft = { deliverySpeed: {} }

function lineIdFor(input: { productId: ID; variantId: ID }): string {
  return `${input.productId}:${input.variantId}`
}

function clamp(qty: number, stock?: number): number {
  const ceiling = Math.min(MAX_QTY_PER_LINE, stock ?? MAX_QTY_PER_LINE)
  return Math.max(1, Math.min(qty, Math.max(1, ceiling)))
}

/**
 * The demo opens with a bag already packed, the way the rest of the marketplace opens
 * with 90 days of orders behind it. Cart and checkout are two of the five hero screens;
 * an empty bag would hide the per-seller grouping, the coupon panel, the price
 * breakdown and every payment method from anyone who just follows the link. Emptying
 * the bag still works, and "Reset demo data" puts this back.
 */
const SEEDED_LINES: CartLine[] = [
  { lineId: 'prd_voltix_nova_5g:prd_voltix_nova_5g_v1', productId: 'prd_voltix_nova_5g', variantId: 'prd_voltix_nova_5g_v1', sellerId: 'sel_orbit', qty: 1 },
  {
    lineId: 'prd_armorlite_rugged_case_voltix_nova:prd_armorlite_rugged_case_voltix_nova_v1',
    productId: 'prd_armorlite_rugged_case_voltix_nova',
    variantId: 'prd_armorlite_rugged_case_voltix_nova_v1',
    sellerId: 'sel_orbit',
    qty: 1,
  },
  {
    lineId: 'prd_kaira_embroidered_cotton_kurta_set:prd_kaira_embroidered_cotton_kurta_set_v2',
    productId: 'prd_kaira_embroidered_cotton_kurta_set',
    variantId: 'prd_kaira_embroidered_cotton_kurta_set_v2',
    sellerId: 'sel_rangrez',
    qty: 1,
  },
]

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: SEEDED_LINES,
      saved: [],
      couponCode: null,
      // Priya's default address, so delivery dates are on every card from the first paint.
      pin: '682020',
      buyNow: null,
      checkout: EMPTY_CHECKOUT,

      add: (input) =>
        set((state) => {
          const lineId = lineIdFor(input)
          const existing = state.lines.find((line) => line.lineId === lineId)
          const qty = clamp((existing?.qty ?? 0) + (input.qty ?? 1), input.stock)
          if (existing) {
            return { lines: state.lines.map((line) => (line.lineId === lineId ? { ...line, qty } : line)) }
          }
          return {
            lines: [
              ...state.lines,
              { lineId, productId: input.productId, variantId: input.variantId, sellerId: input.sellerId, qty },
            ],
          }
        }),

      setQty: (lineId, qty, stock) =>
        set((state) => ({
          lines: state.lines.map((line) => (line.lineId === lineId ? { ...line, qty: clamp(qty, stock) } : line)),
        })),

      remove: (lineId) => set((state) => ({ lines: state.lines.filter((line) => line.lineId !== lineId) })),

      saveForLater: (lineId) =>
        set((state) => {
          const line = state.lines.find((entry) => entry.lineId === lineId)
          if (!line) return state
          return {
            lines: state.lines.filter((entry) => entry.lineId !== lineId),
            saved: state.saved.some((entry) => entry.lineId === lineId) ? state.saved : [line, ...state.saved],
          }
        }),

      moveToCart: (lineId) =>
        set((state) => {
          const line = state.saved.find((entry) => entry.lineId === lineId)
          if (!line) return state
          const existing = state.lines.find((entry) => entry.lineId === lineId)
          return {
            saved: state.saved.filter((entry) => entry.lineId !== lineId),
            lines: existing
              ? state.lines.map((entry) => (entry.lineId === lineId ? { ...entry, qty: clamp(entry.qty + line.qty) } : entry))
              : [...state.lines, line],
          }
        }),

      removeSaved: (lineId) => set((state) => ({ saved: state.saved.filter((line) => line.lineId !== lineId) })),

      clear: () => set({ lines: [], couponCode: null, buyNow: null, checkout: EMPTY_CHECKOUT }),

      setCoupon: (couponCode) => set({ couponCode }),
      setPin: (pin) => set({ pin }),

      setBuyNow: (line) =>
        set({
          buyNow: line
            ? {
                lineId: lineIdFor(line),
                productId: line.productId,
                variantId: line.variantId,
                sellerId: line.sellerId,
                qty: clamp(line.qty ?? 1, line.stock),
              }
            : null,
        }),

      setCheckout: (patch) => set((state) => ({ checkout: { ...state.checkout, ...patch } })),
      setDeliverySpeed: (sellerId, speed) =>
        set((state) => ({
          checkout: { ...state.checkout, deliverySpeed: { ...state.checkout.deliverySpeed, [sellerId]: speed } },
        })),
      resetCheckout: () => set({ checkout: EMPTY_CHECKOUT }),
    }),
    persisted<CartState, Pick<CartState, 'lines' | 'saved' | 'couponCode' | 'pin' | 'buyNow' | 'checkout'>>(
      'cart',
      // Bumped when the bag started arriving pre-filled, so existing visitors get it too.
      3,
      (state) => ({
        lines: state.lines,
        saved: state.saved,
        couponCode: state.couponCode,
        pin: state.pin,
        buyNow: state.buyNow,
        checkout: state.checkout,
      }),
    ),
  ),
)

/** Units in the cart, for the header badge. */
export function cartCount(state: CartState): number {
  return state.lines.reduce((sum, line) => sum + line.qty, 0)
}

/** The lines a checkout should use: the buy-now line if there is one. */
export function checkoutLines(state: CartState): CartLine[] {
  return state.buyNow ? [state.buyNow] : state.lines
}
