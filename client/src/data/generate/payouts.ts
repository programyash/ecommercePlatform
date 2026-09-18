// Weekly settlements. A delivered shipment becomes payable seven days later and
// is paid out on the next Tuesday; the statement lines come from computeSettlement,
// so the seller's payout page and the admin's finance screens agree to the paisa.

import { DEMO_NOW } from '../constants'
import { addDays, addDaysIso, dayKeyToDate, toDayKey, weekdayIST } from '@/lib/date'
import { computeSettlement, type SettlementShipment } from '@/lib/settlement'
import { streamFor } from './rng'
import type {
  Category,
  DayKey,
  ID,
  Order,
  OrderItem,
  Payout,
  PayoutStatus,
  PlatformSettings,
  Product,
  ReturnRequest,
  Seller,
  Shipment,
} from '../types'

export interface PayoutWorld {
  sellers: Seller[]
  orders: Order[]
  shipments: Shipment[]
  items: OrderItem[]
  products: Product[]
  categories: Category[]
  returns: ReturnRequest[]
  settings: PlatformSettings
}

/** The next Tuesday on or after a day. */
function nextTuesday(day: DayKey): DayKey {
  const weekday = weekdayIST(dayKeyToDate(day))
  const delta = (2 - weekday + 7) % 7
  return addDays(day, delta)
}

export function generatePayouts(world: PayoutWorld): Payout[] {
  const rng = streamFor('payouts')
  const today = toDayKey(DEMO_NOW)
  const categoryById = new Map(world.categories.map((category) => [category.id, category]))
  const productById = new Map(world.products.map((product) => [product.id, product]))
  const orderById = new Map(world.orders.map((order) => [order.id, order]))
  const itemsByShipment = new Map<ID, OrderItem[]>()
  for (const item of world.items) {
    const list = itemsByShipment.get(item.shipmentId) ?? []
    list.push(item)
    itemsByShipment.set(item.shipmentId, list)
  }
  const refundByShipment = new Map<ID, number>()
  for (const entry of world.returns) {
    if (entry.status === 'refunded') refundByShipment.set(entry.shipmentId, entry.refundAmount)
  }

  interface Bucket {
    sellerId: ID
    scheduledFor: DayKey
    shipments: Shipment[]
    lines: SettlementShipment[]
  }
  const buckets = new Map<string, Bucket>()

  for (const shipment of world.shipments) {
    if (shipment.status !== 'delivered' || !shipment.deliveredAt) continue
    const order = orderById.get(shipment.orderId)
    const sellerFunded = order?.couponFundedBy === 'seller'
    const saleAmount = shipment.totals.price - (sellerFunded ? shipment.totals.coupon : 0)
    if (saleAmount <= 0) continue

    const items = itemsByShipment.get(shipment.id) ?? []
    let weightedCommission = 0
    let value = 0
    let dominantGst: 0 | 5 | 18 | 40 = 18
    let dominantValue = 0
    for (const item of items) {
      const product = productById.get(item.productId)
      const category = product ? categoryById.get(product.categoryId) : undefined
      const lineValue = item.price * item.qty
      weightedCommission += lineValue * (category?.commissionPct ?? 10)
      value += lineValue
      if (lineValue > dominantValue) {
        dominantValue = lineValue
        dominantGst = item.gstRate
      }
    }
    const commissionPct = value > 0 ? weightedCommission / value : 10

    const scheduledFor = nextTuesday(toDayKey(addDaysIso(shipment.deliveredAt, world.settings.payoutDelayDays)))
    const key = `${shipment.sellerId}:${scheduledFor}`
    const bucket = buckets.get(key) ?? { sellerId: shipment.sellerId, scheduledFor, shipments: [], lines: [] }
    bucket.shipments.push(shipment)
    bucket.lines.push({
      id: shipment.id,
      saleAmount,
      commissionPct,
      gstRate: dominantGst,
      refund: refundByShipment.get(shipment.id),
    })
    buckets.set(key, bucket)
  }

  const payouts: Payout[] = []
  const sorted = [...buckets.values()].sort((a, b) =>
    a.scheduledFor === b.scheduledFor ? a.sellerId.localeCompare(b.sellerId) : a.scheduledFor.localeCompare(b.scheduledFor),
  )

  sorted.forEach((bucket, index) => {
    const settlement = computeSettlement(bucket.lines, world.settings)
    const id = `PO-${bucket.scheduledFor.replace(/-/g, '').slice(2)}-${bucket.sellerId.replace('sel_', '').toUpperCase().slice(0, 4)}`
    let status: PayoutStatus = 'scheduled'
    if (bucket.scheduledFor < today) status = 'paid'
    else if (bucket.scheduledFor === today) status = 'processing'

    const payout: Payout = {
      id,
      sellerId: bucket.sellerId,
      periodStart: addDays(bucket.scheduledFor, -7),
      periodEnd: addDays(bucket.scheduledFor, -1),
      scheduledFor: bucket.scheduledFor,
      status,
      ...(status === 'paid'
        ? {
            paidAt: `${bucket.scheduledFor}T12:${String(10 + (index % 45)).padStart(2, '0')}:00+05:30`,
            utr: `DEMOUTR${String(rng.int(100000000, 999999999))}`,
          }
        : {}),
      shipmentIds: bucket.shipments.map((shipment) => shipment.id),
      lines: settlement.lines,
      gross: settlement.gross,
      net: settlement.net,
    }
    payouts.push(payout)
    for (const shipment of bucket.shipments) shipment.payoutId = id
  })

  // Exactly one payout is on hold, so the admin panel's count is true.
  const holdCandidate = payouts.find(
    (payout) => payout.status === 'scheduled' && payout.sellerId === 'sel_stride',
  ) ?? payouts.find((payout) => payout.status === 'scheduled')
  if (holdCandidate) {
    holdCandidate.status = 'on_hold'
    holdCandidate.holdReason =
      'Return rate above 12% in the last 30 days. Finance will release this after the returns are settled.'
  }

  return payouts
}
