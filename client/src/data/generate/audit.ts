// The admin activity log: about sixty entries built from records that exist, so
// clicking through from the log always lands on something real.

import { DEMO_NOW } from '../constants'
import { addHours } from '@/lib/date'
import { formatINR } from '@/lib/format'
import { SEED_ADMINS } from '../seed/admin'
import { streamFor } from './rng'
import type { AuditEntry, Coupon, Order, Payout, Product, Review, Seller, Shipment } from '../types'

export interface AuditWorld {
  sellers: Seller[]
  products: Product[]
  orders: Order[]
  shipments: Shipment[]
  reviews: Review[]
  payouts: Payout[]
  coupons: Coupon[]
}

export function generateAudit(world: AuditWorld): AuditEntry[] {
  const rng = streamFor('audit')
  const entries: AuditEntry[] = []
  const admins = SEED_ADMINS.filter((admin) => admin.status === 'active')
  let sequence = 0

  const push = (
    hoursAgo: number,
    action: string,
    targetType: AuditEntry['targetType'],
    targetId: string,
    summary: string,
    actorId?: string,
  ): void => {
    sequence += 1
    const admin = actorId ? admins.find((entry) => entry.id === actorId) : rng.pick(admins)
    entries.push({
      id: `aud_${String(sequence).padStart(4, '0')}`,
      at: addHours(DEMO_NOW, -hoursAgo),
      actor: 'admin',
      actorName: admin?.name ?? 'Chowk team',
      action,
      targetType,
      targetId,
      summary,
    })
  }

  let hours = 2

  // Recent moderation decisions.
  for (const product of world.products.filter((entry) => entry.status === 'live').slice(0, 14)) {
    push(hours, 'product.approved', 'product', product.id, `Approved "${product.title}" for ${sellerName(world, product.sellerId)}.`)
    hours += rng.int(3, 11)
  }
  for (const product of world.products.filter((entry) => entry.status === 'rejected')) {
    push(hours, 'product.rejected', 'product', product.id, `Rejected "${product.title}": ${product.moderation?.reason ?? 'changes requested'}`)
    hours += rng.int(4, 12)
  }
  for (const product of world.products.filter((entry) => entry.status === 'blocked')) {
    push(hours, 'product.blocked', 'product', product.id, `Blocked "${product.title}": ${product.moderation?.reason ?? 'policy breach'}`)
    hours += rng.int(6, 18)
  }

  // Seller decisions.
  for (const seller of world.sellers.filter((entry) => entry.status === 'active').slice(0, 8)) {
    push(hours, 'seller.approved', 'seller', seller.id, `Approved ${seller.displayName} (${seller.city}) after KYC verification.`)
    hours += rng.int(8, 26)
  }
  const suspended = world.sellers.find((seller) => seller.status === 'suspended')
  if (suspended) push(hours, 'seller.suspended', 'seller', suspended.id, `Suspended ${suspended.displayName}: ${suspended.statusReason ?? ''}`)
  hours += 9
  const actionRequired = world.sellers.find((seller) => seller.status === 'action_required')
  if (actionRequired) push(hours, 'seller.changes_requested', 'seller', actionRequired.id, `Asked ${actionRequired.displayName} to fix the GSTIN state code mismatch.`)
  hours += 7
  const rejectedSeller = world.sellers.find((seller) => seller.status === 'rejected')
  if (rejectedSeller) push(hours, 'seller.rejected', 'seller', rejectedSeller.id, `Rejected ${rejectedSeller.displayName}: ${rejectedSeller.statusReason ?? ''}`)
  hours += 11

  // Finance.
  for (const payout of world.payouts.filter((entry) => entry.status === 'paid').slice(0, 10)) {
    push(hours, 'payout.paid', 'payout', payout.id, `Paid ${formatINR(payout.net, { decimals: 2 })} to ${sellerName(world, payout.sellerId)} (UTR ${payout.utr ?? '—'}).`, 'adm_fin1')
    hours += rng.int(5, 14)
  }
  const held = world.payouts.find((payout) => payout.status === 'on_hold')
  if (held) push(hours, 'payout.held', 'payout', held.id, `Put ${held.id} on hold: ${held.holdReason ?? ''}`, 'adm_fin1')
  hours += 6

  // Orders and refunds.
  const refunded = world.orders.filter((order) => order.payment.refunds.length > 0).slice(0, 8)
  for (const order of refunded) {
    const refund = order.payment.refunds[0]
    push(hours, 'order.refund_initiated', 'order', order.id, `Initiated a refund of ${formatINR(refund?.amount ?? 0)} for ${order.id}.`, 'adm_sup1')
    hours += rng.int(4, 13)
  }
  const overridden = world.shipments.find((shipment) => shipment.status === 'out_for_delivery')
  if (overridden) {
    push(hours, 'shipment.status_override', 'shipment', overridden.id, `Moved ${overridden.id} to "Out for delivery" after the courier confirmed by phone.`, 'adm_ops1')
    hours += 8
  }

  // Trust and safety.
  for (const review of world.reviews.filter((entry) => entry.status === 'removed')) {
    push(hours, 'review.removed', 'review', review.id, `Removed a review on ${review.productId}: ${review.flagReason ?? 'policy breach'}`, 'adm_cat1')
    hours += rng.int(7, 20)
  }

  // Coupons and settings.
  for (const coupon of world.coupons.slice(0, 4)) {
    push(hours, 'coupon.created', 'coupon', coupon.code, `Created ${coupon.code}: ${coupon.title}.`, 'adm_fin1')
    hours += rng.int(10, 30)
  }
  push(hours, 'settings.updated', 'settings', 'tax', 'Set TCS to 0.5% and TDS to 0.1% for the new financial year.', 'adm_super')
  hours += 14
  push(hours, 'settings.updated', 'settings', 'shipping', 'Raised the free delivery threshold from ₹399 to ₹499.', 'adm_super')

  return entries.sort((a, b) => (a.at < b.at ? 1 : -1))
}

function sellerName(world: AuditWorld, sellerId: string): string {
  return world.sellers.find((seller) => seller.id === sellerId)?.displayName ?? sellerId
}
