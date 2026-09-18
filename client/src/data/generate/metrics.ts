// Daily metrics are derived from the order book, never invented — so a chart, a KPI
// tile and a table of orders can never disagree. Visitors are the one modelled
// number: orders divided by a seeded 2.5–3.5% conversion rate.

import { DEMO_NOW } from '../constants'
import { addDaysIso, toDayKey } from '@/lib/date'
import { streamFor } from './rng'
import type { Customer, DailyMetric, DayKey, ID, Order, OrderItem, Shipment } from '../types'

export interface MetricWorld {
  orders: Order[]
  shipments: Shipment[]
  items: OrderItem[]
  customers: Customer[]
}

export const METRIC_DAYS = 90

export function generateMetrics(world: MetricWorld, days = METRIC_DAYS): DailyMetric[] {
  const rng = streamFor('metrics')
  const itemsByShipment = new Map<ID, OrderItem[]>()
  for (const item of world.items) {
    const list = itemsByShipment.get(item.shipmentId) ?? []
    list.push(item)
    itemsByShipment.set(item.shipmentId, list)
  }
  const shipmentsByOrder = new Map<ID, Shipment[]>()
  for (const shipment of world.shipments) {
    const list = shipmentsByOrder.get(shipment.orderId) ?? []
    list.push(shipment)
    shipmentsByOrder.set(shipment.orderId, list)
  }

  const blank = (): Omit<DailyMetric, 'day'> => ({ gmv: 0, orders: 0, units: 0, visitors: 0, refunds: 0, newCustomers: 0 })
  const byDay = new Map<DayKey, Omit<DailyMetric, 'day'>>()
  for (let index = 0; index < days; index += 1) {
    byDay.set(toDayKey(addDaysIso(DEMO_NOW, -index)), blank())
  }

  for (const order of world.orders) {
    const day = toDayKey(order.placedAt)
    const row = byDay.get(day)
    if (!row) continue
    const shipments = shipmentsByOrder.get(order.id) ?? []
    const live = shipments.filter((shipment) => shipment.status !== 'cancelled')
    if (live.length === 0) continue
    row.orders += 1
    for (const shipment of live) {
      row.gmv += shipment.totals.total
      for (const item of itemsByShipment.get(shipment.id) ?? []) row.units += item.qty
    }
    for (const refund of order.payment.refunds) {
      const refundRow = byDay.get(toDayKey(refund.at))
      if (refundRow) refundRow.refunds += refund.amount
    }
  }

  for (const customer of world.customers) {
    const row = byDay.get(toDayKey(customer.joinedAt))
    if (row) row.newCustomers += 1
  }

  const metrics: DailyMetric[] = []
  for (const [day, row] of byDay) {
    const conversion = rng.float(0.025, 0.035)
    metrics.push({ day, ...row, visitors: Math.round(row.orders / conversion) })
  }
  return metrics.sort((a, b) => a.day.localeCompare(b.day))
}
