// One definition of GMV, orders, units and take rate, used by both the seller and
// the admin screens — which is why the numbers agree across portals:
//
//   platform GMV = Σ seller GMV = Σ (non-cancelled) shipment totals in the range.

import { eachDay, isDayWithin, previousRange, toDayKey } from '@/lib/date'
import type { View } from '../view'
import type { DateRange, DayKey, ID, Kpi, KpiFormat, Order, SeriesPoint, Shipment } from '../types'

export interface ShipmentFact {
  shipment: Shipment
  order: Order
  day: DayKey
  /** Cancelled shipments earn nothing and are excluded from GMV. */
  live: boolean
  revenue: number
  units: number
  commission: number
  fees: number
}

/** Every shipment placed inside a range, with the numbers each portal needs. */
export function shipmentFacts(view: View, range: DateRange, sellerId?: ID): ShipmentFact[] {
  const facts: ShipmentFact[] = []
  const source = sellerId ? (view.shipmentsBySeller.get(sellerId) ?? []) : view.shipments
  for (const shipment of source) {
    const order = view.orderById.get(shipment.orderId)
    if (!order) continue
    const day = toDayKey(order.placedAt)
    if (!isDayWithin(day, range)) continue
    const live = shipment.status !== 'cancelled'
    let units = 0
    let commission = 0
    for (const item of view.itemsByShipment.get(shipment.id) ?? []) {
      units += item.qty
      const product = view.productById.get(item.productId)
      const category = product ? view.categoryById.get(product.categoryId) : undefined
      commission += (item.price * item.qty * (category?.commissionPct ?? 10)) / 100
    }
    facts.push({
      shipment,
      order,
      day,
      live,
      revenue: live ? shipment.totals.total : 0,
      units: live ? units : 0,
      commission: live ? commission : 0,
      fees: live ? view.settings.fixedFee + view.settings.shippingFeePerShipment : 0,
    })
  }
  return facts
}

export interface Totals {
  gmv: number
  orders: number
  shipments: number
  units: number
  aov: number
  /** Commission + fixed and shipping fees — what the marketplace keeps. */
  netRevenue: number
  cancelled: number
  delivered: number
  returns: number
  refunds: number
}

export function totalsOf(facts: readonly ShipmentFact[], view: View): Totals {
  const orderIds = new Set<ID>()
  let gmv = 0
  let units = 0
  let netRevenue = 0
  let cancelled = 0
  let delivered = 0
  let returns = 0
  let refunds = 0
  for (const fact of facts) {
    if (fact.live) orderIds.add(fact.order.id)
    gmv += fact.revenue
    units += fact.units
    netRevenue += fact.commission + fact.fees
    if (fact.shipment.status === 'cancelled') cancelled += 1
    if (fact.shipment.status === 'delivered') delivered += 1
    if (fact.shipment.returnId) {
      returns += 1
      const request = view.returnById.get(fact.shipment.returnId)
      if (request?.status === 'refunded') refunds += request.refundAmount
    }
  }
  const orders = orderIds.size
  return {
    gmv: Math.round(gmv),
    orders,
    shipments: facts.length,
    units,
    aov: orders > 0 ? Math.round(gmv / orders) : 0,
    netRevenue: Math.round(netRevenue),
    cancelled,
    delivered,
    returns,
    refunds: Math.round(refunds),
  }
}

export function kpi(
  key: string,
  label: string,
  value: number,
  previous: number,
  format: KpiFormat,
  options: { positiveIsGood?: boolean; href?: string; sparkline?: number[] } = {},
): Kpi {
  return {
    key,
    label,
    value,
    previous,
    format,
    positiveIsGood: options.positiveIsGood ?? true,
    ...(options.href ? { href: options.href } : {}),
    ...(options.sparkline ? { sparkline: options.sparkline } : {}),
  }
}

/** Percentage change, or null when there is nothing to compare against. */
export function delta(value: number, previous: number): number | null {
  if (previous === 0) return value === 0 ? 0 : null
  return (value - previous) / previous
}

export interface SeriesOptions {
  sellerId?: ID
  /** Add the previous period's values as `previousGmv` / `previousOrders`. */
  compare?: boolean
}

/** Daily GMV, orders and units — the shape the charts take. */
export function buildSeries(view: View, range: DateRange, options: SeriesOptions = {}): SeriesPoint[] {
  const facts = shipmentFacts(view, range, options.sellerId)
  const byDay = new Map<DayKey, { gmv: number; orders: Set<ID>; units: number }>()
  for (const day of eachDay(range)) byDay.set(day, { gmv: 0, orders: new Set(), units: 0 })
  for (const fact of facts) {
    const row = byDay.get(fact.day)
    if (!row) continue
    row.gmv += fact.revenue
    row.units += fact.units
    if (fact.live) row.orders.add(fact.order.id)
  }

  let previousByIndex: { gmv: number; orders: number }[] = []
  if (options.compare) {
    const earlier = previousRange(range)
    const earlierFacts = shipmentFacts(view, earlier, options.sellerId)
    const earlierDays = eachDay(earlier)
    const earlierMap = new Map<DayKey, { gmv: number; orders: Set<ID> }>()
    for (const day of earlierDays) earlierMap.set(day, { gmv: 0, orders: new Set() })
    for (const fact of earlierFacts) {
      const row = earlierMap.get(fact.day)
      if (!row) continue
      row.gmv += fact.revenue
      if (fact.live) row.orders.add(fact.order.id)
    }
    previousByIndex = earlierDays.map((day) => {
      const row = earlierMap.get(day)
      return { gmv: Math.round(row?.gmv ?? 0), orders: row?.orders.size ?? 0 }
    })
  }

  return eachDay(range).map((day, index) => {
    const row = byDay.get(day)
    const point: SeriesPoint = {
      day,
      gmv: Math.round(row?.gmv ?? 0),
      orders: row?.orders.size ?? 0,
      units: row?.units ?? 0,
      visitors: view.metricByDay.get(day)?.visitors ?? 0,
    }
    if (options.compare) {
      point.previousGmv = previousByIndex[index]?.gmv ?? 0
      point.previousOrders = previousByIndex[index]?.orders ?? 0
    }
    return point
  })
}

/** Totals for a range and for the equally long range before it. */
export function totalsWithPrevious(view: View, range: DateRange, sellerId?: ID): { current: Totals; previous: Totals } {
  return {
    current: totalsOf(shipmentFacts(view, range, sellerId), view),
    previous: totalsOf(shipmentFacts(view, previousRange(range), sellerId), view),
  }
}
