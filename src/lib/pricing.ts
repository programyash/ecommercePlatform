// Cart arithmetic: what the shopper sees in "Price details", split per seller so
// each shipment carries its own share of the coupon and the delivery fee.
//
// Rules of the house:
//   • Prices include GST. MRP − price is the item discount.
//   • Delivery is free at ₹499 and above, otherwise ₹40 for the whole order.
//   • Express delivery is ₹99 per shipment that chooses it.
//   • COD is off above ₹50,000, for items that do not allow it, and for PINs that do not.
//   • A coupon only ever discounts the lines it applies to.

import { formatINR, formatDate } from './format'
import type {
  Coupon,
  CouponStatus,
  GstRate,
  ID,
  ISODate,
  PaymentMethod,
  PlatformSettings,
} from '@/data/types'

// ── Small helpers ─────────────────────────────────────────────────────────

/** "22" for ₹22,999 → ₹17,999. Rounded, because shoppers read "22% off". */
export function discountPercent(mrp: number, price: number): number {
  if (mrp <= 0 || price >= mrp) return 0
  return Math.round(((mrp - price) / mrp) * 100)
}

/** "fashion, footwear and home" */
export function listToSentence(items: readonly string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/**
 * Split `amount` across weights so the parts always add back up to `amount`.
 * Used for the coupon share and the delivery fee across shipments.
 */
export function allocate(amount: number, weights: readonly number[]): number[] {
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  if (weights.length === 0) return []
  if (total <= 0) {
    const parts = weights.map(() => 0)
    parts[0] = amount
    return parts
  }
  const parts = weights.map((weight) => Math.floor((amount * weight) / total))
  let remainder = amount - parts.reduce((sum, part) => sum + part, 0)
  // Hand the rounding remainder to the largest weights first.
  const order = weights.map((weight, index) => ({ weight, index })).sort((a, b) => b.weight - a.weight)
  let cursor = 0
  while (remainder > 0 && order.length > 0) {
    const target = order[cursor % order.length]
    if (target) {
      parts[target.index] = (parts[target.index] ?? 0) + 1
      remainder -= 1
    }
    cursor += 1
  }
  return parts
}

// ── Coupons ───────────────────────────────────────────────────────────────

export interface CouponLine {
  lineId: string
  sellerId: ID
  /** Root → leaf category ids, so a coupon scoped to "fashion" matches "kurtas". */
  categoryPath: ID[]
  /** price × qty for this line. */
  value: number
}

export interface CouponContext {
  lines: readonly CouponLine[]
  /** Cart value before the coupon (price × qty across every line). */
  cartTotal: number
  paymentMethod?: PaymentMethod
  /** Priya's first order unlocks WELCOME100. */
  isFirstOrder?: boolean
  /** Display names of the coupon's categories, for the "applies to …" message. */
  categoryNames?: string[]
  /** Seller display name, for seller-funded coupons. */
  sellerName?: string
  now?: ISODate
}

export type CouponResult =
  | { ok: true; discount: number; eligibleLineIds: string[] }
  | { ok: false; reason: string }

/** Live status of a coupon at a point in time (drives the admin coupons table). */
export function couponStatus(coupon: Coupon, now: ISODate): CouponStatus {
  if (coupon.paused) return 'paused'
  if (now < coupon.startsAt) return 'scheduled'
  if (now > coupon.endsAt) return 'expired'
  return 'active'
}

function eligibleLines(coupon: Coupon, lines: readonly CouponLine[]): CouponLine[] {
  return lines.filter((line) => {
    if (coupon.sellerId && line.sellerId !== coupon.sellerId) return false
    if (coupon.categoryIds && coupon.categoryIds.length > 0) {
      return line.categoryPath.some((id) => coupon.categoryIds?.includes(id))
    }
    return true
  })
}

/**
 * Can this coupon be used on this cart, and for how much?
 * The refusal reasons are the exact strings the cart and checkout show.
 */
export function evaluateCoupon(coupon: Coupon, context: CouponContext): CouponResult {
  const now = context.now ?? new Date().toISOString()
  const code = coupon.code

  if (coupon.paused) return { ok: false, reason: `${code} is not available right now.` }
  if (now < coupon.startsAt) return { ok: false, reason: `${code} starts on ${formatDate(coupon.startsAt)}.` }
  if (now > coupon.endsAt) return { ok: false, reason: `${code} expired on ${formatDate(coupon.endsAt)}.` }
  if (coupon.usageLimit !== undefined && coupon.used >= coupon.usageLimit) {
    return { ok: false, reason: `${code} has been fully claimed.` }
  }
  if (coupon.firstOrderOnly && context.isFirstOrder === false) {
    return { ok: false, reason: `${code} is valid on your first order only.` }
  }
  if (coupon.prepaidOnly && context.paymentMethod === 'cod') {
    return { ok: false, reason: `${code} is for prepaid orders only.` }
  }

  const lines = eligibleLines(coupon, context.lines)
  if (lines.length === 0) {
    if (coupon.sellerId && context.sellerName) {
      return { ok: false, reason: `${code} applies to products from ${context.sellerName} only.` }
    }
    const names = context.categoryNames ?? []
    if (names.length > 0) return { ok: false, reason: `${code} applies to ${listToSentence(names)} only.` }
    return { ok: false, reason: `${code} does not apply to anything in your cart.` }
  }

  const eligibleTotal = lines.reduce((sum, line) => sum + line.value, 0)
  const base = coupon.categoryIds || coupon.sellerId ? eligibleTotal : context.cartTotal
  if (base < coupon.minOrder) {
    return { ok: false, reason: `Add ${formatINR(coupon.minOrder - base)} more to use ${code}.` }
  }

  const raw = coupon.kind === 'flat' ? coupon.value : (eligibleTotal * coupon.value) / 100
  const capped = coupon.maxDiscount !== undefined ? Math.min(raw, coupon.maxDiscount) : raw
  const discount = Math.min(Math.round(capped), eligibleTotal)
  if (discount <= 0) return { ok: false, reason: `${code} does not apply to anything in your cart.` }
  return { ok: true, discount, eligibleLineIds: lines.map((line) => line.lineId) }
}

// ── Cart summary ──────────────────────────────────────────────────────────

export type DeliverySpeed = 'standard' | 'express'

export interface CartSummaryLine {
  lineId: string
  productId: ID
  variantId: ID
  sellerId: ID
  categoryPath: ID[]
  qty: number
  mrp: number
  price: number
  gstRate?: GstRate
  /** Units available; a line above this is capped and flagged. */
  stock?: number
  /** Does this product allow cash on delivery? */
  cod?: boolean
}

export interface CartSummaryInput {
  lines: readonly CartSummaryLine[]
  settings: PlatformSettings
  coupon?: Coupon | null
  /** Extra context the coupon rules need (first order, payment method, category names). */
  couponContext?: Omit<CouponContext, 'lines' | 'cartTotal'>
  /** Delivery speed per seller; anything missing is standard. */
  speedBySeller?: Readonly<Record<ID, DeliverySpeed>>
  paymentMethod?: PaymentMethod
  /** false when the chosen PIN does not accept cash on delivery. */
  codPinEligible?: boolean
  pin?: string | null
}

export interface CartSellerGroup {
  sellerId: ID
  lineIds: string[]
  units: number
  mrpTotal: number
  itemsTotal: number
  discount: number
  couponShare: number
  shipping: number
  express: boolean
  /** itemsTotal − couponShare + shipping — this becomes the shipment total. */
  total: number
}

export interface CartSummary {
  groups: CartSellerGroup[]
  lineCount: number
  units: number
  mrpTotal: number
  itemsTotal: number
  /** MRP − price across the cart. */
  discount: number
  couponCode?: string
  couponDiscount: number
  /** Set when a coupon was supplied but could not be applied. */
  couponError?: string
  deliveryBase: number
  expressTotal: number
  delivery: number
  freeDelivery: boolean
  /** How much more to spend for free delivery; 0 once it is free. */
  freeDeliveryGap: number
  codFee: number
  codAvailable: boolean
  codReason?: string
  total: number
  /** Item discount + coupon + delivery saved, the "You will save …" line. */
  youSave: number
}

/** The one place the cart, the checkout summary and `placeOrder` agree on money. */
export function computeCartSummary(input: CartSummaryInput): CartSummary {
  const { lines, settings } = input
  const sellerIds: ID[] = []
  for (const line of lines) if (!sellerIds.includes(line.sellerId)) sellerIds.push(line.sellerId)

  const lineValue = new Map<string, number>()
  let mrpTotal = 0
  let itemsTotal = 0
  let units = 0
  for (const line of lines) {
    const value = line.price * line.qty
    lineValue.set(line.lineId, value)
    mrpTotal += line.mrp * line.qty
    itemsTotal += value
    units += line.qty
  }

  // Coupon
  let couponDiscount = 0
  let couponError: string | undefined
  let eligibleLineIds: string[] = []
  if (input.coupon) {
    const result = evaluateCoupon(input.coupon, {
      ...input.couponContext,
      lines: lines.map((line) => ({
        lineId: line.lineId,
        sellerId: line.sellerId,
        categoryPath: line.categoryPath,
        value: lineValue.get(line.lineId) ?? 0,
      })),
      cartTotal: itemsTotal,
      paymentMethod: input.paymentMethod ?? input.couponContext?.paymentMethod,
    })
    if (result.ok) {
      couponDiscount = result.discount
      eligibleLineIds = result.eligibleLineIds
    } else {
      couponError = result.reason
    }
  }

  // Coupon share per line, so every shipment carries its own part.
  const couponByLine = new Map<string, number>()
  if (couponDiscount > 0) {
    const weights = eligibleLineIds.map((id) => lineValue.get(id) ?? 0)
    const shares = allocate(couponDiscount, weights)
    eligibleLineIds.forEach((id, index) => couponByLine.set(id, shares[index] ?? 0))
  }

  // Delivery
  const freeDelivery = itemsTotal >= settings.freeDeliveryThreshold
  const deliveryBase = lines.length === 0 || freeDelivery ? 0 : settings.deliveryFee
  const expressSellers = sellerIds.filter((id) => input.speedBySeller?.[id] === 'express')
  const expressTotal = expressSellers.length * settings.expressFee

  const groups: CartSellerGroup[] = sellerIds.map((sellerId) => {
    const groupLines = lines.filter((line) => line.sellerId === sellerId)
    const group: CartSellerGroup = {
      sellerId,
      lineIds: groupLines.map((line) => line.lineId),
      units: groupLines.reduce((sum, line) => sum + line.qty, 0),
      mrpTotal: groupLines.reduce((sum, line) => sum + line.mrp * line.qty, 0),
      itemsTotal: groupLines.reduce((sum, line) => sum + line.price * line.qty, 0),
      discount: 0,
      couponShare: groupLines.reduce((sum, line) => sum + (couponByLine.get(line.lineId) ?? 0), 0),
      shipping: input.speedBySeller?.[sellerId] === 'express' ? settings.expressFee : 0,
      express: input.speedBySeller?.[sellerId] === 'express',
      total: 0,
    }
    group.discount = group.mrpTotal - group.itemsTotal
    return group
  })

  // The base delivery fee belongs to the order; split it so shipment totals still add up.
  if (deliveryBase > 0 && groups.length > 0) {
    const shares = allocate(deliveryBase, groups.map((group) => group.itemsTotal))
    groups.forEach((group, index) => {
      group.shipping += shares[index] ?? 0
    })
  }
  for (const group of groups) group.total = group.itemsTotal - group.couponShare + group.shipping

  const delivery = deliveryBase + expressTotal
  const subTotal = itemsTotal - couponDiscount + delivery

  // Cash on delivery
  let codAvailable = lines.length > 0
  let codReason: string | undefined
  if (codAvailable && subTotal > settings.codLimit) {
    codAvailable = false
    codReason = `Cash on delivery is not available on orders above ${formatINR(settings.codLimit)}.`
  }
  if (codAvailable && lines.some((line) => line.cod === false)) {
    codAvailable = false
    codReason = 'Cash on delivery is not available for some items in your cart.'
  }
  if (codAvailable && input.codPinEligible === false) {
    codAvailable = false
    codReason = input.pin
      ? `Cash on delivery is not available for PIN code ${input.pin}.`
      : 'Cash on delivery is not available for this address.'
  }

  const codFee = input.paymentMethod === 'cod' ? settings.codFee : 0
  const total = subTotal + codFee
  const discount = mrpTotal - itemsTotal

  return {
    groups,
    lineCount: lines.length,
    units,
    mrpTotal,
    itemsTotal,
    discount,
    couponCode: couponDiscount > 0 ? input.coupon?.code : undefined,
    couponDiscount,
    couponError,
    deliveryBase,
    expressTotal,
    delivery,
    freeDelivery,
    freeDeliveryGap: freeDelivery ? 0 : Math.max(0, settings.freeDeliveryThreshold - itemsTotal),
    codFee,
    codAvailable,
    codReason,
    total,
    youSave: discount + couponDiscount,
  }
}

/** "Add ₹212 more for free delivery." — shown under the price details. */
export function freeDeliveryHint(summary: CartSummary): string | null {
  if (summary.freeDelivery || summary.lineCount === 0) return null
  return `Add ${formatINR(summary.freeDeliveryGap)} more for free delivery.`
}
