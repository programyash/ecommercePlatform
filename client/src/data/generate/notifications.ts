// The bell menu in each portal. Notifications are built from records that actually
// exist, so every one of them deep-links somewhere real.

import { DEMO, DEMO_NOW } from '../constants'
import { addHours } from '@/lib/date'
import { formatINR } from '@/lib/format'
import { buyerDisplayName } from '@/lib/mask'
import { streamFor } from './rng'
import type {
  Customer,
  ID,
  Notification,
  Order,
  Payout,
  Product,
  Review,
  Seller,
  Shipment,
  ReturnRequest,
} from '../types'

export interface NotificationWorld {
  orders: Order[]
  shipments: Shipment[]
  customers: Customer[]
  sellers: Seller[]
  products: Product[]
  reviews: Review[]
  payouts: Payout[]
  returns: ReturnRequest[]
}

export function generateNotifications(world: NotificationWorld): Notification[] {
  const rng = streamFor('notifications')
  const notifications: Notification[] = []
  const customerById = new Map(world.customers.map((customer) => [customer.id, customer]))
  let sequence = 0

  const push = (
    portal: Notification['portal'],
    audienceId: ID,
    kind: Notification['kind'],
    title: string,
    body: string,
    hoursAgo: number,
    href?: string,
  ): void => {
    sequence += 1
    notifications.push({
      id: `ntf_${String(sequence).padStart(4, '0')}`,
      portal,
      audienceId,
      kind,
      title,
      body,
      at: addHours(DEMO_NOW, -hoursAgo),
      ...(href ? { href } : {}),
      read: hoursAgo > 30 ? true : rng.chance(0.2),
    })
  }

  // ── Shopper: Priya ──────────────────────────────────────────────────────
  const priyaOrders = world.orders
    .filter((order) => order.customerId === DEMO.customerId)
    .sort((a, b) => (a.placedAt < b.placedAt ? 1 : -1))

  let hours = 2
  for (const order of priyaOrders) {
    const shipments = world.shipments.filter((shipment) => shipment.orderId === order.id)
    for (const shipment of shipments) {
      const href = `/account/orders/${order.id}`
      switch (shipment.status) {
        case 'out_for_delivery':
          push('customer', DEMO.customerId, 'shipment', 'Out for delivery today', `${shipment.id} is with the delivery partner. Keep ${formatINR(shipment.totals.total)} ready if you are paying cash.`, hours, href)
          break
        case 'shipped':
          push('customer', DEMO.customerId, 'shipment', 'Your order has shipped', `${shipment.id} is on its way with DemoShip. Track it with AWB ${shipment.awb ?? ''}.`, hours, href)
          break
        case 'packed':
          push('customer', DEMO.customerId, 'shipment', 'Packed and ready', `${shipment.id} has been packed and will be handed over today.`, hours, href)
          break
        case 'delivered':
          push('customer', DEMO.customerId, 'shipment', 'Delivered', `${shipment.id} was delivered. Tell other shoppers what you think.`, hours, href)
          break
        case 'cancelled':
          push('customer', DEMO.customerId, 'order', 'Order cancelled', `${shipment.id} was cancelled. ${order.payment.method === 'cod' ? 'Nothing was charged.' : 'Your refund is on its way.'}`, hours, href)
          break
        default:
          push('customer', DEMO.customerId, 'order', 'Order placed', `We have told the seller about ${shipment.id}.`, hours, href)
      }
      hours += rng.int(5, 20)
    }
  }
  push('customer', DEMO.customerId, 'promo', 'FESTIVE20 ends this month', '20% off up to ₹750 on fashion, footwear and home. Minimum order ₹1,499.', 26, '/deals')
  push('customer', DEMO.customerId, 'stock', 'Back in stock', 'Kiro Lumen 12 Mini is available again in your saved list.', 52, '/p/kiro-lumen-12-mini')
  push('customer', DEMO.customerId, 'promo', 'Price dropped on a saved item', 'Boomr Pods Air ANC is now ₹1,799, down from ₹2,299.', 74, '/account/wishlist')

  // ── Seller: Orbit Mobiles Hub ───────────────────────────────────────────
  const orbitShipments = world.shipments
    .filter((shipment) => shipment.sellerId === DEMO.sellerId)
    .sort((a, b) => (a.slaDueAt < b.slaDueAt ? 1 : -1))
  const orderById = new Map(world.orders.map((order) => [order.id, order]))

  let sellerHours = 1
  for (const shipment of orbitShipments.filter((entry) => entry.status === 'placed').slice(0, 3)) {
    const order = orderById.get(shipment.orderId)
    const customer = order ? customerById.get(order.customerId) : undefined
    push(
      'seller',
      DEMO.sellerId,
      'order',
      'New order to confirm',
      `${shipment.id} from ${customer ? buyerDisplayName(customer.name, order?.shipTo.city) : 'a shopper'} · ${formatINR(shipment.totals.total)}. Dispatch by 2:00 PM today.`,
      sellerHours,
      `/seller/orders/${shipment.id}`,
    )
    sellerHours += rng.int(2, 6)
  }
  for (const entry of world.returns.filter((item) => item.status === 'requested').slice(0, 2)) {
    const shipment = world.shipments.find((item) => item.id === entry.shipmentId)
    if (!shipment || shipment.sellerId !== DEMO.sellerId) continue
    push('seller', DEMO.sellerId, 'order', 'Return requested', `${entry.shipmentId}: ${entry.reason}. Approve or reject within 48 hours.`, sellerHours, `/seller/orders/${entry.shipmentId}`)
    sellerHours += 4
  }
  const lowStock = world.products
    .filter((product) => product.sellerId === DEMO.sellerId && product.variants.some((variant) => variant.stock > 0 && variant.stock <= variant.lowStockAt))
    .slice(0, 3)
  for (const product of lowStock) {
    push('seller', DEMO.sellerId, 'stock', 'Low stock', `${product.title} is running low. Update the quantity before it sells out.`, sellerHours, '/seller/inventory?low=1')
    sellerHours += 6
  }
  const rejected = world.products.find((product) => product.sellerId === DEMO.sellerId && product.status === 'rejected')
  if (rejected) {
    push('seller', DEMO.sellerId, 'listing', 'Listing needs changes', rejected.moderation?.reason ?? 'The catalogue team asked for changes.', 30, `/seller/products/${rejected.id}/edit`)
  }
  const nextPayout = world.payouts
    .filter((payout) => payout.sellerId === DEMO.sellerId && payout.status !== 'paid')
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))[0]
  if (nextPayout) {
    push('seller', DEMO.sellerId, 'payout', 'Payout scheduled', `${formatINR(nextPayout.net, { decimals: 0 })} will be sent to your account ending ${'••'}${'••'} on ${nextPayout.scheduledFor}.`, 20, '/seller/payouts')
  }
  const orbitReview = world.reviews.find((review) => review.sellerId === DEMO.sellerId && !review.sellerReply)
  if (orbitReview) {
    push('seller', DEMO.sellerId, 'review', 'New review to reply to', `${orbitReview.rating}★ "${orbitReview.title}" — a reply from you shows on the product page.`, 12, '/seller/reviews')
  }

  // ── Admin ───────────────────────────────────────────────────────────────
  let adminHours = 1
  for (const seller of world.sellers.filter((entry) => entry.status === 'under_review')) {
    push('admin', DEMO.adminId, 'kyc', 'Seller application waiting', `${seller.displayName} (${seller.city}) submitted an application. KYC is partly verified.`, adminHours, `/admin/sellers/${seller.id}`)
    adminHours += rng.int(3, 9)
  }
  const pendingCount = world.products.filter((product) => product.status === 'pending').length
  push('admin', DEMO.adminId, 'listing', 'Listings waiting for review', `${pendingCount} listings are in the moderation queue, the oldest for three days.`, adminHours, '/admin/products?tab=moderation')
  adminHours += 4
  const escalated = world.returns.filter((entry) => entry.escalated).length
  push('admin', DEMO.adminId, 'order', 'Returns escalated', `${escalated} returns have been escalated by shoppers and need a decision.`, adminHours, '/admin/orders?view=returns')
  adminHours += 5
  const held = world.payouts.find((payout) => payout.status === 'on_hold')
  if (held) {
    push('admin', DEMO.adminId, 'payout', 'Payout on hold', `${held.id} for ${formatINR(held.net, { decimals: 0 })} is on hold. Finance flagged the return rate.`, adminHours, '/admin/payouts')
    adminHours += 6
  }
  push('admin', DEMO.adminId, 'system', 'Missed dispatch deadlines', 'Five shipments passed their 2:00 PM cutoff today across four sellers.', adminHours, '/admin/orders?view=attention')
  adminHours += 7
  const flagged = world.reviews.filter((review) => review.status === 'flagged').length
  push('admin', DEMO.adminId, 'review', 'Reviews flagged', `${flagged} reviews were reported and are waiting for a decision.`, adminHours, '/admin/reviews?tab=flagged')
  adminHours += 8
  push('admin', DEMO.adminId, 'system', 'Weekly payout run finished', 'Last week’s payouts were sent to 11 sellers.', adminHours, '/admin/payouts')

  return notifications.sort((a, b) => (a.at < b.at ? 1 : -1))
}
