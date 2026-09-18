// Ninety days of orders, plus the hand-authored "story" orders the demo walks
// through. One checkout becomes one order split into one shipment per seller —
// the unit every portal shares.

import { COURIER_NAME, DEMO, DEMO_NOW, DEMO_NOW_MS } from '../constants'
import { addDaysIso, atTime, toDayKey, toIsoIst } from '@/lib/date'
import { computeCartSummary, type CartSummaryLine } from '@/lib/pricing'
import { dispatchDeadline, promisedDate } from '../selectors/delivery'
import { variantLabel } from '../seed/products/build'
import { streamFor, type Rng } from './rng'
import type {
  Address,
  CancelledBy,
  Category,
  Coupon,
  Customer,
  ID,
  ISODate,
  Order,
  OrderItem,
  Payment,
  PaymentMethod,
  PaymentStatus,
  PlatformSettings,
  Product,
  ReturnRequest,
  ReturnStatus,
  Seller,
  Shipment,
  ShipmentStatus,
  TimelineEvent,
  Variant,
} from '../types'

export interface OrderWorld {
  products: Product[]
  customers: Customer[]
  sellers: Seller[]
  categories: Category[]
  coupons: Coupon[]
  settings: PlatformSettings
}

export interface GeneratedOrders {
  orders: Order[]
  shipments: Shipment[]
  items: OrderItem[]
  returns: ReturnRequest[]
}

interface LineSpec {
  product: Product
  variant: Variant
  qty: number
}

interface ShipmentSpec {
  sellerId: ID
  lines: LineSpec[]
  status: ShipmentStatus
  cancelledBy?: CancelledBy
  cancelReason?: string
  express?: boolean
  return?: {
    status: ReturnStatus
    reason: string
    details?: string
    escalated?: boolean
    refundTo?: 'source' | 'upi'
  }
  /** Force the dispatch deadline (used by the seeded "work waiting today"). */
  slaDueAt?: ISODate
  awb?: string
}

interface OrderSpec {
  id: string
  customer: Customer
  address?: Address
  placedAt: ISODate
  couponCode?: string
  paymentMethod: PaymentMethod
  paymentFailed?: boolean
  shipments: ShipmentSpec[]
  notes?: { at: ISODate; by: string; text: string }[]
  gstInvoice?: { gstin: string; businessName: string }
}

// ── Copy ──────────────────────────────────────────────────────────────────

const CUSTOMER_CANCEL_REASONS = [
  'Ordered by mistake',
  'Found a better price elsewhere',
  'Delivery date is too late',
  'Changed my mind',
  'Ordered the wrong variant',
]

const SELLER_CANCEL_REASONS = [
  'Item out of stock',
  'Damaged stock found while packing',
  'Cannot dispatch to this PIN code',
]

const RETURN_REASONS = [
  'Size does not fit',
  'Item damaged in transit',
  'Wrong item delivered',
  'Item is not as described',
  'Quality is not as expected',
  'Changed my mind',
]

const HUBS = ['Bengaluru hub', 'Chennai hub', 'Delhi hub', 'Mumbai hub', 'Kolkata hub', 'Nagpur hub']

// ── Small helpers ─────────────────────────────────────────────────────────

function digits(rng: Rng, length: number): string {
  let out = ''
  for (let index = 0; index < length; index += 1) out += String(rng.int(0, 9))
  return out
}

function awbFor(rng: Rng): string {
  return `DS${digits(rng, 10)}`
}

function txnRefFor(method: PaymentMethod, rng: Rng): string {
  switch (method) {
    case 'upi':
      return `UPI/${digits(rng, 12)}`
    case 'card':
      return `CARD/${digits(rng, 10)}`
    case 'emi':
      return `EMI/${digits(rng, 10)}`
    case 'netbanking':
      return `NB/${digits(rng, 10)}`
    case 'wallet':
      return `WLT/${digits(rng, 10)}`
    case 'cod':
      return `COD/${digits(rng, 8)}`
  }
}

function paymentDetail(method: PaymentMethod, customer: Customer, rng: Rng): string {
  const saved = customer.savedPayments.find((payment) => payment.kind === 'upi')
  const handle = customer.name.split(' ')[0]?.toLowerCase() ?? 'shopper'
  switch (method) {
    case 'upi':
      return saved && saved.kind === 'upi' ? saved.vpa : `${handle}@okdemo`
    case 'card': {
      const card = customer.savedPayments.find((payment) => payment.kind === 'card')
      if (card && card.kind === 'card') return `Visa •••• ${card.last4}`
      return `${rng.pick(['Visa', 'Mastercard', 'RuPay'])} •••• ${digits(rng, 4)}`
    }
    case 'emi':
      return `${rng.pick(['3', '6', '9', '12'])} months · Demo Bank credit card`
    case 'netbanking':
      return rng.pick(['Demo Bank', 'Nagara Bank', 'Sagar Bank', 'Trishul Bank'])
    case 'wallet':
      return 'DemoPay wallet'
    case 'cod':
      return 'Cash on delivery'
  }
}

// Category paths are read once per order line, so they are memoised per category list.
const pathCache = new WeakMap<readonly Category[], Map<ID, ID[]>>()

/** Root → leaf category ids, so a coupon scoped to "fashion" matches "kurtas". */
export function categoryPath(categoryId: ID, categories: readonly Category[]): ID[] {
  let paths = pathCache.get(categories)
  if (!paths) {
    const byId = new Map(categories.map((category) => [category.id, category]))
    paths = new Map<ID, ID[]>()
    for (const category of categories) {
      const path: ID[] = []
      let current: Category | undefined = category
      let guard = 0
      while (current && guard < 6) {
        path.unshift(current.id)
        current = current.parentId ? byId.get(current.parentId) : undefined
        guard += 1
      }
      paths.set(category.id, path)
    }
    pathCache.set(categories, paths)
  }
  return paths.get(categoryId) ?? [categoryId]
}

const sellerCache = new WeakMap<readonly Seller[], Map<ID, Seller>>()

function sellersById(sellers: readonly Seller[]): Map<ID, Seller> {
  let map = sellerCache.get(sellers)
  if (!map) {
    map = new Map(sellers.map((seller) => [seller.id, seller]))
    sellerCache.set(sellers, map)
  }
  return map
}

function event(
  id: string,
  at: ISODate,
  code: TimelineEvent['code'],
  label: string,
  actor: TimelineEvent['actor'],
  location?: string,
  note?: string,
): TimelineEvent {
  return { id, at, code, label, actor, ...(location ? { location } : {}), ...(note ? { note } : {}) }
}

const STAGE_ORDER: ShipmentStatus[] = ['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered']

// ── The builder ───────────────────────────────────────────────────────────

/**
 * Turn a specification into one order, its shipments, its items and any return.
 * Money is computed by `computeCartSummary`, so an order total always equals the
 * sum of its shipment totals.
 */
export function buildOrder(spec: OrderSpec, world: OrderWorld, rng: Rng): GeneratedOrders {
  const { settings } = world
  const sellerById = sellersById(world.sellers)
  const address = spec.address ??
    spec.customer.addresses[0] ?? {
      id: `${spec.customer.id}_addr1`,
      name: spec.customer.name,
      phone: spec.customer.phone,
      line1: 'Address on file',
      line2: '',
      city: 'India',
      state: 'India',
      stateCode: '00',
      pin: '110001',
      type: 'home' as const,
    }

  // 1. Money.
  const summaryLines: CartSummaryLine[] = []
  for (const shipment of spec.shipments) {
    for (const line of shipment.lines) {
      summaryLines.push({
        lineId: `${shipment.sellerId}:${line.variant.id}`,
        productId: line.product.id,
        variantId: line.variant.id,
        sellerId: shipment.sellerId,
        categoryPath: categoryPath(line.product.categoryId, world.categories),
        qty: line.qty,
        mrp: line.variant.mrp,
        price: line.variant.price,
        gstRate: line.product.gstRate,
        cod: line.product.cod,
      })
    }
  }
  const coupon = spec.couponCode ? world.coupons.find((entry) => entry.code === spec.couponCode) : undefined
  const speedBySeller: Record<ID, 'standard' | 'express'> = {}
  for (const shipment of spec.shipments) if (shipment.express) speedBySeller[shipment.sellerId] = 'express'

  const summary = computeCartSummary({
    lines: summaryLines,
    settings,
    coupon: coupon ?? null,
    couponContext: { isFirstOrder: true, now: spec.placedAt },
    speedBySeller,
    paymentMethod: spec.paymentMethod,
  })

  // 2. Shipments, items and timelines.
  const items: OrderItem[] = []
  const shipments: Shipment[] = []
  const returns: ReturnRequest[] = []
  let anyDelivered = false
  let anyRefunded = false

  spec.shipments.forEach((shipmentSpec, index) => {
    const shipmentId = `${spec.id}-${index + 1}`
    const seller = sellerById.get(shipmentSpec.sellerId)
    const fromStateCode = seller?.stateCode ?? '29'
    const dispatchDays = Math.max(...shipmentSpec.lines.map((line) => line.product.dispatchDays), 1)
    const group = summary.groups.find((entry) => entry.sellerId === shipmentSpec.sellerId)

    const itemIds: ID[] = []
    shipmentSpec.lines.forEach((line, lineIndex) => {
      const itemId = `${shipmentId}-i${lineIndex + 1}`
      itemIds.push(itemId)
      items.push({
        id: itemId,
        orderId: spec.id,
        shipmentId,
        sellerId: shipmentSpec.sellerId,
        productId: line.product.id,
        variantId: line.variant.id,
        title: line.product.title,
        variantLabel: variantLabel(line.variant),
        image: line.variant.media?.[0] ?? line.product.media[0] ?? 'phone-noir',
        qty: line.qty,
        mrp: line.variant.mrp,
        price: line.variant.price,
        gstRate: line.product.gstRate,
        hsn: line.product.hsn,
      })
    })

    const slaDueAt = shipmentSpec.slaDueAt ?? dispatchDeadline(spec.placedAt, dispatchDays)
    const promisedBy = promisedDate(spec.placedAt, fromStateCode, address.pin, dispatchDays, shipmentSpec.express)

    // Timeline: each stage lands a believable interval after the previous one.
    const events: TimelineEvent[] = [
      event(`${shipmentId}-e1`, spec.placedAt, 'placed', 'Order placed', 'customer'),
    ]
    const placedMs = new Date(spec.placedAt).getTime()
    let cursorMs = placedMs
    /** Advance the clock, never past "now", and return the timestamp. */
    const step = (hours: number): ISODate => {
      cursorMs = Math.min(cursorMs + hours * 3_600_000, DEMO_NOW_MS - 60_000)
      return toIsoIst(cursorMs)
    }
    let deliveredAt: ISODate | undefined
    const finalIndex = STAGE_ORDER.indexOf(shipmentSpec.status)
    const stages = shipmentSpec.status === 'cancelled' ? [] : STAGE_ORDER.slice(1, finalIndex + 1)

    for (const stage of stages) {
      switch (stage) {
        case 'confirmed':
          events.push(event(`${shipmentId}-e${events.length + 1}`, step(rng.int(2, 9)), 'confirmed', 'Order confirmed by the seller', 'seller', seller?.city))
          break
        case 'packed':
          events.push(event(`${shipmentId}-e${events.length + 1}`, step(rng.int(3, 14)), 'packed', 'Packed and ready for pickup', 'seller', seller?.city))
          break
        case 'shipped':
          events.push(event(`${shipmentId}-e${events.length + 1}`, step(rng.int(2, 12)), 'shipped', `Handed over to ${COURIER_NAME}`, 'seller', seller?.city))
          break
        case 'out_for_delivery':
          events.push(event(`${shipmentId}-e${events.length + 1}`, step(rng.int(20, 54)), 'out_for_delivery', 'Out for delivery', 'courier', rng.pick(HUBS)))
          break
        case 'delivered':
          deliveredAt = step(rng.int(2, 9))
          events.push(event(`${shipmentId}-e${events.length + 1}`, deliveredAt, 'delivered', 'Delivered', 'courier', address.city))
          break
        default:
          break
      }
    }

    let returnId: string | undefined
    if (shipmentSpec.status === 'cancelled') {
      const by = shipmentSpec.cancelledBy ?? 'customer'
      cursorMs = placedMs
      const cancelledAt = step(rng.int(3, 40))
      events.push(
        event(
          `${shipmentId}-e${events.length + 1}`,
          cancelledAt,
          'cancelled',
          by === 'platform' ? 'Cancelled by Chowk' : by === 'seller' ? 'Cancelled by the seller' : 'Cancelled by the shopper',
          by === 'platform' ? 'system' : by,
          undefined,
          shipmentSpec.cancelReason,
        ),
      )
    }

    if (shipmentSpec.return && deliveredAt) {
      const requestedAt = step(rng.int(6, 60))
      const returnStatus = shipmentSpec.return.status
      const refundAmount = group?.total ?? 0
      returnId = `RET-${spec.id.slice(4)}${index + 1}`
      events.push(event(`${shipmentId}-e${events.length + 1}`, requestedAt, 'return_requested', 'Return requested', 'customer', undefined, shipmentSpec.return.reason))

      let decidedAt: ISODate | undefined
      let pickedUpAt: ISODate | undefined
      let refundedAt: ISODate | undefined
      if (returnStatus !== 'requested') {
        decidedAt = step(rng.int(4, 30))
        if (returnStatus === 'rejected') {
          events.push(event(`${shipmentId}-e${events.length + 1}`, decidedAt, 'return_rejected', 'Return rejected', 'seller', undefined, 'The item shows signs of use beyond inspection.'))
        } else {
          events.push(event(`${shipmentId}-e${events.length + 1}`, decidedAt, 'return_approved', 'Return approved', 'seller'))
        }
      }
      if (returnStatus === 'picked_up' || returnStatus === 'refunded') {
        pickedUpAt = step(rng.int(20, 60))
        events.push(event(`${shipmentId}-e${events.length + 1}`, pickedUpAt, 'return_picked_up', 'Return picked up', 'courier', address.city))
      }
      if (returnStatus === 'refunded') {
        refundedAt = step(rng.int(18, 70))
        anyRefunded = true
        events.push(event(`${shipmentId}-e${events.length + 1}`, refundedAt, 'refunded', 'Refund completed', 'system', undefined, 'Refunded to the original payment method.'))
      }

      returns.push({
        id: returnId,
        orderId: spec.id,
        shipmentId,
        itemIds,
        reason: shipmentSpec.return.reason,
        details: shipmentSpec.return.details,
        status: returnStatus,
        requestedAt,
        decidedAt,
        pickedUpAt,
        refundedAt,
        refundAmount,
        refundTo: shipmentSpec.return.refundTo ?? (spec.paymentMethod === 'cod' ? 'upi' : 'source'),
        rejectionReason: returnStatus === 'rejected' ? 'The item shows signs of use beyond inspection.' : undefined,
        escalated: shipmentSpec.return.escalated,
      })
    }

    if (deliveredAt) anyDelivered = true
    const shipped = STAGE_ORDER.indexOf(shipmentSpec.status) >= STAGE_ORDER.indexOf('shipped')

    shipments.push({
      id: shipmentId,
      orderId: spec.id,
      sellerId: shipmentSpec.sellerId,
      itemIds,
      status: shipmentSpec.status,
      ...(shipmentSpec.cancelledBy ? { cancelledBy: shipmentSpec.cancelledBy } : {}),
      ...(shipmentSpec.cancelReason ? { cancelReason: shipmentSpec.cancelReason } : {}),
      slaDueAt,
      promisedBy,
      ...(deliveredAt ? { deliveredAt } : {}),
      ...(shipped ? { courier: COURIER_NAME, awb: shipmentSpec.awb ?? awbFor(rng) } : {}),
      ...(STAGE_ORDER.indexOf(shipmentSpec.status) >= STAGE_ORDER.indexOf('packed')
        ? {
            package: {
              weightKg: Math.round(shipmentSpec.lines.reduce((sum, line) => sum + line.product.weightKg * line.qty, 0.2) * 100) / 100,
              dimensionsCm: shipmentSpec.lines[0]?.product.dimensionsCm ?? [20, 15, 8],
            },
          }
        : {}),
      events,
      totals: {
        mrp: group?.mrpTotal ?? 0,
        price: group?.itemsTotal ?? 0,
        shipping: group?.shipping ?? 0,
        coupon: group?.couponShare ?? 0,
        total: group?.total ?? 0,
      },
      ...(returnId ? { returnId } : {}),
    })
  })

  // 3. Payment.
  const allCancelled = spec.shipments.every((shipment) => shipment.status === 'cancelled')
  const someCancelled = spec.shipments.some((shipment) => shipment.status === 'cancelled')
  const prepaid = spec.paymentMethod !== 'cod'
  let status: PaymentStatus
  if (spec.paymentFailed) status = 'failed'
  else if (allCancelled && prepaid) {
    const cancelledLongAgo = DEMO_NOW_MS - new Date(spec.placedAt).getTime() > 5 * 86_400_000
    status = cancelledLongAgo ? 'refunded' : 'refund_initiated'
  } else if (anyRefunded) status = spec.shipments.length > 1 ? 'partially_refunded' : 'refunded'
  else if (!prepaid) status = anyDelivered ? 'collected' : 'cod_pending'
  else if (someCancelled) status = 'partially_refunded'
  else status = 'paid'

  const refunds: Payment['refunds'] = []
  for (const entry of returns) {
    if (entry.status === 'refunded' && entry.refundedAt) {
      refunds.push({ id: `${entry.id}-rf`, amount: entry.refundAmount, at: entry.refundedAt, status: 'processed', reason: 'Return refunded' })
    }
  }
  for (const shipment of shipments) {
    if (shipment.status === 'cancelled' && prepaid && !spec.paymentFailed) {
      const cancelledEvent = shipment.events.find((entry) => entry.code === 'cancelled')
      refunds.push({
        id: `${shipment.id}-rf`,
        amount: shipment.totals.total,
        at: cancelledEvent?.at ?? spec.placedAt,
        status: status === 'refunded' ? 'processed' : 'initiated',
        reason: 'Order cancelled',
      })
    }
  }

  const payment: Payment = {
    id: `pay_${spec.id.slice(4).toLowerCase()}`,
    method: spec.paymentMethod,
    status,
    amount: summary.total,
    txnRef: txnRefFor(spec.paymentMethod, rng),
    detail: paymentDetail(spec.paymentMethod, spec.customer, rng),
    ...(status === 'paid' || status === 'collected' || status === 'partially_refunded' || status === 'refunded'
      ? { paidAt: spec.paymentMethod === 'cod' ? shipments.find((entry) => entry.deliveredAt)?.deliveredAt : spec.placedAt }
      : {}),
    ...(spec.paymentFailed ? { failureReason: 'The bank did not approve this payment.' } : {}),
    refunds,
  }

  const order: Order = {
    id: spec.id,
    customerId: spec.customer.id,
    placedAt: spec.placedAt,
    shipTo: address,
    ...(spec.gstInvoice ? { billing: spec.gstInvoice } : {}),
    payment,
    ...(summary.couponCode ? { couponCode: summary.couponCode, couponFundedBy: coupon?.fundedBy ?? 'platform' } : {}),
    shipmentIds: shipments.map((shipment) => shipment.id),
    totals: {
      mrp: summary.mrpTotal,
      discount: summary.discount,
      coupon: summary.couponDiscount,
      shipping: summary.delivery,
      codFee: summary.codFee,
      total: summary.total,
    },
    notes: (spec.notes ?? []).map((note, index) => ({ id: `${spec.id}-n${index + 1}`, ...note })),
  }

  return { orders: [order], shipments, items, returns }
}

// ── Random 90-day history ─────────────────────────────────────────────────

const PAYMENT_MIX: readonly (readonly [PaymentMethod, number])[] = [
  ['upi', 55], ['cod', 20], ['card', 12], ['emi', 3], ['netbanking', 5], ['wallet', 5],
]

const SELLER_WEIGHTS: Readonly<Record<string, number>> = {
  sel_orbit: 26, sel_urbanloom: 12, sel_decibel: 11, sel_rangrez: 11, sel_rasoi: 10,
  sel_stride: 8, sel_annapurna: 6, sel_vanya: 6, sel_pitch: 5, sel_pustak: 4, sel_khel: 3,
}

/** Orders per day: a growing marketplace, quiet Mondays, festival spikes. */
function dailyVolume(dayKey: DayKeyLike, index: number, total: number, rng: Rng): number {
  const growth = 0.7 + (0.75 * index) / Math.max(1, total - 1)
  const weekday = new Date(`${dayKey}T12:00:00+05:30`).getUTCDay()
  const weekdayFactor = weekday === 0 ? 1.15 : weekday === 6 ? 1.1 : weekday === 1 ? 0.9 : 1
  const monthDay = dayKey.slice(5)
  let festive = 1
  if (monthDay === '08-15') festive = 2.3
  else if (monthDay >= '08-26' && monthDay <= '08-30') festive = 1.55
  else if (monthDay >= '08-12' && monthDay <= '08-16') festive = 1.35
  return Math.max(3, Math.round(13.6 * growth * weekdayFactor * festive * rng.float(0.82, 1.18)))
}

type DayKeyLike = string

function pickSellableProducts(world: OrderWorld): Map<ID, Product[]> {
  const bySeller = new Map<ID, Product[]>()
  for (const product of world.products) {
    if (product.status !== 'live') continue
    if (!product.variants.some((variant) => variant.active)) continue
    const list = bySeller.get(product.sellerId) ?? []
    list.push(product)
    bySeller.set(product.sellerId, list)
  }
  return bySeller
}

/**
 * Cheap things sell far more often than expensive ones. Without this the average
 * order value of a catalogue that contains both earbuds and foldables comes out
 * absurdly high.
 */
function priceWeight(price: number): number {
  if (price < 300) return 18
  if (price < 700) return 14
  if (price < 1500) return 10
  if (price < 3000) return 5
  if (price < 8000) return 1.6
  if (price < 20000) return 0.4
  if (price < 50000) return 0.1
  return 0.03
}

function cheapestPrice(product: Product): number {
  return Math.min(...product.variants.filter((variant) => variant.active).map((variant) => variant.price))
}

function weightProducts(products: readonly Product[]): (readonly [Product, number])[] {
  return products.map((product) => [product, priceWeight(cheapestPrice(product))] as const)
}

function stageForAge(age: number, rng: Rng): ShipmentStatus {
  if (age <= 0) return rng.weighted([['placed', 70], ['confirmed', 30]])
  if (age === 1) return rng.weighted([['confirmed', 40], ['packed', 40], ['shipped', 20]])
  if (age === 2) return rng.weighted([['packed', 20], ['shipped', 50], ['out_for_delivery', 30]])
  if (age === 3) return rng.weighted([['shipped', 25], ['out_for_delivery', 35], ['delivered', 40]])
  if (age === 4) return rng.weighted([['out_for_delivery', 25], ['delivered', 75]])
  return 'delivered'
}

function returnStatusForAge(age: number, rng: Rng): ReturnStatus {
  if (age < 9) return rng.weighted([['requested', 60], ['approved', 40]])
  if (age < 14) return rng.weighted([['approved', 35], ['picked_up', 40], ['rejected', 10], ['refunded', 15]])
  return rng.weighted([['refunded', 80], ['rejected', 20]])
}

/** The whole synthetic order book: 90 days of history, then the story orders. */
export function generateOrders(world: OrderWorld): GeneratedOrders {
  const rng = streamFor('orders')
  const sellableBySeller = pickSellableProducts(world)
  const weightedBySeller = new Map([...sellableBySeller].map(([id, list]) => [id, weightProducts(list)]))
  const sellerIds = Object.keys(SELLER_WEIGHTS).filter((id) => (sellableBySeller.get(id)?.length ?? 0) > 0)
  const sellerWeights = sellerIds.map((id) => [id, SELLER_WEIGHTS[id] ?? 1] as const)
  const namedCustomers = world.customers.filter((customer) => !customer.id.startsWith('cus_g'))
  const generatedCustomers = world.customers.filter((customer) => customer.id.startsWith('cus_g'))
  const blockedIds = new Set(world.customers.filter((customer) => customer.status === 'blocked').map((c) => c.id))

  const result: GeneratedOrders = { orders: [], shipments: [], items: [], returns: [] }
  const usedIds = new Set<string>([DEMO.orderId])
  let sequence = 100_137

  const nextOrderId = (): string => {
    let id: string
    do {
      sequence = (sequence + rng.int(137, 941)) % 900_000
      id = `ORD-${String(100_000 + sequence).slice(0, 6)}`
    } while (usedIds.has(id))
    usedIds.add(id)
    return id
  }

  const days = 90
  const today = toDayKey(DEMO_NOW)
  for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
    const age = days - 1 - dayIndex
    const dayKey = toDayKey(addDaysIso(DEMO_NOW, -age))
    const volume = dailyVolume(dayKey, dayIndex, days, rng)

    for (let orderIndex = 0; orderIndex < volume; orderIndex += 1) {
      // Time of day: a bump at lunchtime and a bigger one in the evening.
      const hour = rng.weighted([
        [9, 6], [10, 8], [11, 9], [12, 10], [13, 9], [14, 7], [15, 7], [16, 8],
        [17, 9], [18, 11], [19, 13], [20, 14], [21, 12], [22, 8], [23, 4], [8, 3],
      ])
      const placedAt = dayKey === today && hour > 10 ? atTime(dayKey, rng.int(6, 10), rng.int(0, 59)) : atTime(dayKey, hour, rng.int(0, 59))
      if (new Date(placedAt).getTime() > DEMO_NOW_MS) continue

      const customer = rng.chance(0.22) ? rng.pick(namedCustomers) : rng.pick(generatedCustomers)
      if (blockedIds.has(customer.id) && rng.chance(0.7)) continue

      const sellerCount = rng.weighted([[1, 80], [2, 18], [3, 2]])
      const chosenSellers: string[] = []
      for (let attempt = 0; attempt < sellerCount * 3 && chosenSellers.length < sellerCount; attempt += 1) {
        const sellerId = rng.weighted(sellerWeights)
        if (!chosenSellers.includes(sellerId)) chosenSellers.push(sellerId)
      }

      const shipmentSpecs: ShipmentSpec[] = []
      for (const sellerId of chosenSellers) {
        const catalogue = weightedBySeller.get(sellerId) ?? []
        if (catalogue.length === 0) continue
        const lineCount = rng.weighted([[1, 78], [2, 19], [3, 3]])
        const lines: LineSpec[] = []
        for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
          const product = rng.weighted(catalogue)
          const variant = rng.weighted(
            product.variants.filter((entry) => entry.active).map((entry) => [entry, priceWeight(entry.price)] as const),
          )
          if (lines.some((line) => line.variant.id === variant.id)) continue
          lines.push({ product, variant, qty: rng.weighted([[1, 84], [2, 13], [3, 3]]) })
        }
        if (lines.length === 0) continue
        shipmentSpecs.push({ sellerId, lines, status: 'placed' })
      }
      if (shipmentSpecs.length === 0) continue

      // Journey.
      const roll = rng.next()
      const paymentMethod = rng.weighted(PAYMENT_MIX)
      let paymentFailed = false

      if (roll < 0.02) {
        paymentFailed = true
        for (const shipment of shipmentSpecs) {
          shipment.status = 'cancelled'
          shipment.cancelledBy = 'platform'
          shipment.cancelReason = 'Payment not completed'
        }
      } else if (roll < 0.11) {
        const by: CancelledBy = rng.chance(0.68) ? 'customer' : 'seller'
        for (const shipment of shipmentSpecs) {
          if (shipmentSpecs.length > 1 && rng.chance(0.35)) {
            shipment.status = stageForAge(age, rng)
            continue
          }
          shipment.status = 'cancelled'
          shipment.cancelledBy = by
          shipment.cancelReason = by === 'customer' ? rng.pick(CUSTOMER_CANCEL_REASONS) : rng.pick(SELLER_CANCEL_REASONS)
        }
      } else if (roll < 0.2 && age >= 7) {
        for (const shipment of shipmentSpecs) shipment.status = 'delivered'
        const target = shipmentSpecs[rng.int(0, shipmentSpecs.length - 1)]
        if (target) {
          // Escalations are seeded by hand so the admin panel shows exactly three,
          // and the demo seller's two open return requests are seeded too.
          const status = returnStatusForAge(age, rng)
          target.return = {
            status: target.sellerId === DEMO.sellerId && status === 'requested' ? 'approved' : status,
            reason: rng.pick(RETURN_REASONS),
          }
        }
      } else {
        const base = stageForAge(age, rng)
        for (const shipment of shipmentSpecs) {
          // Shipments of the same order can lag one step behind — but only while
          // the order is still young, or old orders would sit in transit forever.
          const index = STAGE_ORDER.indexOf(base)
          const laggy = age <= 4 && index > 0 && rng.chance(0.25)
          shipment.status = laggy ? (STAGE_ORDER[index - 1] ?? base) : base
          // The demo seller's open work is seeded by hand (see story-orders.ts),
          // so generated history never adds to its "to confirm" and "to pack" tabs.
          if (shipment.sellerId === DEMO.sellerId && STAGE_ORDER.indexOf(shipment.status) < STAGE_ORDER.indexOf('shipped')) {
            shipment.status = 'shipped'
          }
        }
      }

      // A coupon on roughly a fifth of orders.
      const couponCode = rng.chance(0.2)
        ? rng.weighted([['WELCOME100', 30], ['FESTIVE20', 34], ['PREPAID50', 26], ['BOOKWORM10', 10]])
        : undefined

      const built = buildOrder(
        {
          id: nextOrderId(),
          customer,
          placedAt,
          couponCode: couponCode && paymentMethod !== 'cod' ? couponCode : couponCode === 'PREPAID50' ? undefined : couponCode,
          paymentMethod,
          paymentFailed,
          shipments: shipmentSpecs,
        },
        world,
        rng,
      )
      // Only the five hand-seeded shipments are allowed to be past their deadline,
      // so the admin "missed dispatch deadlines" count stays truthful.
      for (const shipment of built.shipments) {
        const open = STAGE_ORDER.indexOf(shipment.status) < STAGE_ORDER.indexOf('shipped')
        if (open && shipment.status !== 'cancelled' && new Date(shipment.slaDueAt).getTime() <= DEMO_NOW_MS) {
          shipment.slaDueAt = nextCutoff()
        }
      }

      result.orders.push(...built.orders)
      result.shipments.push(...built.shipments)
      result.items.push(...built.items)
      result.returns.push(...built.returns)
    }
  }

  return result
}

/** The next 2 PM dispatch cutoff that is still in the future. */
function nextCutoff(): ISODate {
  const today = toDayKey(DEMO_NOW)
  const todayCutoff = atTime(today, 14, 0)
  return new Date(todayCutoff).getTime() > DEMO_NOW_MS ? todayCutoff : atTime(toDayKey(addDaysIso(DEMO_NOW, 1)), 14, 0)
}
