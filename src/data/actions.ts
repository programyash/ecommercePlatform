// `dbActions` is the only way anything in the demo changes. Every action writes to
// the overlay store and, where it matters, appends the timeline event, the
// notification and the audit entry that the other two portals will read.
//
// Actions run in event handlers, so real timestamps and randomness are fine here
// (unlike render, where `DEMO_NOW` is used instead).

import { COURIER_NAME, DEMO, DEMO_NOW_MS, FAILING_CARD_SUFFIX, FAILING_VPA } from './constants'
import { toIsoIst } from '@/lib/date'
import { buyerDisplayName } from '@/lib/mask'
import { formatINR } from '@/lib/format'
import { canTransition } from '@/lib/status'
import { buildOrder, type OrderWorld } from './generate/orders'
import { streamFor } from './generate/rng'
import { dispatchDeadline } from './selectors/delivery'
import { getView, type View } from './view'
import {
  appendEvents,
  applyOverlay,
  patchKyc,
  patchRecord,
  patchVariant,
  type OverlayData,
} from '@/stores/mock-db'
import type {
  Address,
  AuditEntry,
  CancelledBy,
  Coupon,
  Customer,
  ID,
  ISODate,
  KycKey,
  KycStatus,
  Notification,
  Order,
  Payout,
  PaymentMethod,
  Portal,
  Product,
  ProductStatus,
  ReturnRequest,
  Review,
  ReviewStatus,
  SavedPayment,
  Seller,
  SellerStatus,
  Shipment,
  ShipmentStatus,
  SpecGroup,
  TimelineCode,
  TimelineEvent,
  Variant,
  VariantAxis,
  GstRate,
  PlatformSettings,
} from './types'
import type { MediaRef } from './images'

// ── Small helpers ─────────────────────────────────────────────────────────

/**
 * "Now" on the demo's clock, not the wall clock. Every seeded record is dated against
 * `DEMO_NOW` (today at 10:30 IST), so stamping a live action with the real time would
 * make an order placed this second read "3 hr ago". This starts at `DEMO_NOW` and ticks
 * forward with the session, so actions stay ordered and read as "Just now".
 */
const SESSION_STARTED_AT = Date.now()

function now(): ISODate {
  return toIsoIst(DEMO_NOW_MS + (Date.now() - SESSION_STARTED_AT))
}

function uid(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`
}

function makeEvent(code: TimelineCode, label: string, actor: TimelineEvent['actor'], note?: string, location?: string): TimelineEvent {
  return { id: uid('evt_'), at: now(), code, label, actor, ...(note ? { note } : {}), ...(location ? { location } : {}) }
}

function notification(
  portal: Portal,
  audienceId: ID,
  kind: Notification['kind'],
  title: string,
  body: string,
  href?: string,
): Notification {
  return { id: uid('ntf_'), portal, audienceId, kind, title, body, at: now(), ...(href ? { href } : {}), read: false }
}

function audit(
  action: string,
  targetType: AuditEntry['targetType'],
  targetId: ID,
  summary: string,
  actorName = 'Ishaan Verma',
): AuditEntry {
  return { id: uid('aud_'), at: now(), actor: 'admin', actorName, action, targetType, targetId, summary }
}

function withNotifications(overlay: OverlayData, items: Notification[]): OverlayData {
  return items.length === 0 ? overlay : { ...overlay, notifications: [...items, ...overlay.notifications] }
}

function withAudit(overlay: OverlayData, entries: AuditEntry[]): OverlayData {
  return entries.length === 0 ? overlay : { ...overlay, audit: [...entries, ...overlay.audit] }
}

interface ShipmentContext {
  shipment: Shipment
  order: Order | undefined
  seller: Seller | undefined
  customer: Customer | undefined
}

/** Shipment + its order + its seller, or null. */
function context(view: View, shipmentId: ID): ShipmentContext | null {
  const shipment = view.shipmentById.get(shipmentId)
  if (!shipment) return null
  const order = view.orderById.get(shipment.orderId)
  const seller = view.sellerById.get(shipment.sellerId)
  const customer = order ? view.customerById.get(order.customerId) : undefined
  return { shipment, order, seller, customer }
}

function orderHref(orderId: ID): string {
  return `/account/orders/${orderId}`
}

// ── Results ───────────────────────────────────────────────────────────────

export type ActionResult = { ok: true } | { ok: false; error: string }

export type PlaceOrderResult =
  | { ok: true; orderId: ID; shipmentIds: ID[] }
  | { ok: false; error: string; orderId?: ID; paymentFailed?: boolean }

export interface CheckoutLine {
  productId: ID
  variantId: ID
  qty: number
}

export interface CheckoutInput {
  customerId: ID
  /** An existing address id, or a new address to ship to. */
  addressId?: ID
  address?: Address
  lines: CheckoutLine[]
  couponCode?: string
  paymentMethod: PaymentMethod
  /** UPI id typed at checkout; `fail@demo` always fails. */
  upiVpa?: string
  /** Last four digits of the card; `0002` always fails. */
  cardLast4?: string
  deliverySpeed?: Record<ID, 'standard' | 'express'>
  gstInvoice?: { gstin: string; businessName: string }
}

export interface ProductInput {
  id?: ID
  sellerId: ID
  title: string
  brand: string
  categoryId: ID
  description: string
  highlights: string[]
  media: MediaRef[]
  specs?: SpecGroup[]
  axes?: VariantAxis[]
  variants: { id?: ID; sku: string; options: Partial<Record<VariantAxis, string>>; mrp: number; price: number; stock: number; lowStockAt?: number; active?: boolean }[]
  hsn: string
  gstRate: GstRate
  dispatchDays: number
  weightKg: number
  dimensionsCm: [number, number, number]
  countryOfOrigin: string
  manufacturer: string
  warranty?: string
  keywords?: string[]
  returnDays?: number
  cod?: boolean
  /** 'draft' saves quietly; 'pending' submits for review. */
  submit?: boolean
}

export interface SellerRegistrationInput {
  displayName: string
  legalName: string
  ownerName: string
  email: string
  phone: string
  gstin: string | null
  pan: string
  pickupAddress: Address
  categoryIds: ID[]
  tagline?: string
  about?: string
  bank: { accountName: string; bankName: string; ifsc: string; last4: string }
}

// ── Orders ────────────────────────────────────────────────────────────────

function nextOrderId(view: View): ID {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const id = `ORD-${String(Math.floor(100000 + Math.random() * 899999))}`
    if (!view.orderById.has(id)) return id
  }
  return `ORD-${String(Date.now()).slice(-6)}`
}

function worldFrom(view: View): OrderWorld {
  return {
    products: view.products,
    customers: view.customers,
    sellers: view.sellers,
    categories: view.categories,
    coupons: view.coupons,
    settings: view.settings,
  }
}

/**
 * Turn a checkout into one order, one shipment per seller, stock decrements and
 * the first notification each portal sees.
 */
function placeOrder(input: CheckoutInput): PlaceOrderResult {
  const view = getView()
  const customer = view.customerById.get(input.customerId)
  if (!customer) return { ok: false, error: 'We could not find your account. Sign in and try again.' }
  if (customer.status === 'blocked') {
    return { ok: false, error: 'This account cannot place new orders. Contact support for help.' }
  }
  if (input.lines.length === 0) return { ok: false, error: 'Your cart is empty.' }

  const address =
    input.address ??
    customer.addresses.find((entry) => entry.id === input.addressId) ??
    customer.addresses[0]
  if (!address) return { ok: false, error: 'Add a delivery address to continue.' }

  // Resolve every line and check stock.
  const bySeller = new Map<ID, { product: Product; variant: Variant; qty: number }[]>()
  for (const line of input.lines) {
    const product = view.productById.get(line.productId)
    const variant = product?.variants.find((entry) => entry.id === line.variantId)
    if (!product || !variant) return { ok: false, error: 'One of the items is no longer available.' }
    if (variant.stock < line.qty) {
      return { ok: false, error: `${product.title} is out of stock. Remove it to continue.` }
    }
    const list = bySeller.get(product.sellerId) ?? []
    list.push({ product, variant, qty: line.qty })
    bySeller.set(product.sellerId, list)
  }

  const paymentFailed =
    (input.paymentMethod === 'upi' && input.upiVpa?.trim().toLowerCase() === FAILING_VPA) ||
    ((input.paymentMethod === 'card' || input.paymentMethod === 'emi') &&
      (input.cardLast4 ?? '').endsWith(FAILING_CARD_SUFFIX))

  const orderId = nextOrderId(view)
  const rng = streamFor(`place:${orderId}`)
  const placedAt = now()
  const built = buildOrder(
    {
      id: orderId,
      customer,
      address,
      placedAt,
      couponCode: input.couponCode,
      paymentMethod: input.paymentMethod,
      paymentFailed,
      gstInvoice: input.gstInvoice,
      shipments: [...bySeller.entries()].map(([sellerId, lines]) => ({
        sellerId,
        lines,
        status: paymentFailed ? ('cancelled' as const) : ('placed' as const),
        ...(paymentFailed ? { cancelledBy: 'platform' as const, cancelReason: 'Payment not completed' } : {}),
        express: input.deliverySpeed?.[sellerId] === 'express',
      })),
    },
    worldFrom(view),
    rng,
  )

  const order = built.orders[0]
  if (!order) return { ok: false, error: 'Something went wrong placing this order.' }

  // The instrument the shopper actually used at checkout.
  if (input.paymentMethod === 'upi' && input.upiVpa) order.payment.detail = input.upiVpa
  if ((input.paymentMethod === 'card' || input.paymentMethod === 'emi') && input.cardLast4) {
    order.payment.detail = `Card •••• ${input.cardLast4}`
  }

  const notifications: Notification[] = []
  if (paymentFailed) {
    notifications.push(
      notification('customer', customer.id, 'order', 'Payment could not be completed', `We could not confirm the payment for ${orderId}. Your items are held for 15 minutes.`, orderHref(orderId)),
    )
  } else {
    for (const shipment of built.shipments) {
      const seller = view.sellerById.get(shipment.sellerId)
      notifications.push(
        notification(
          'seller',
          shipment.sellerId,
          'order',
          'New order to confirm',
          `${shipment.id} from ${buyerDisplayName(customer.name, address.city)} · ${formatINR(shipment.totals.total)}. Dispatch by 2:00 PM.`,
          `/seller/orders/${shipment.id}`,
        ),
      )
      void seller
    }
    notifications.push(
      notification('customer', customer.id, 'order', 'Order placed', `${orderId} will arrive in ${built.shipments.length} ${built.shipments.length === 1 ? 'shipment' : 'shipments'}.`, orderHref(orderId)),
    )
  }

  applyOverlay((overlay) => {
    let variantPatches = overlay.variantPatches
    if (!paymentFailed) {
      for (const [, lines] of bySeller) {
        for (const line of lines) {
          const current = variantPatches[line.product.id]?.[line.variant.id]?.stock ?? line.variant.stock
          variantPatches = patchVariant(variantPatches, line.product.id, line.variant.id, {
            stock: Math.max(0, current - line.qty),
          })
        }
      }
    }
    return withNotifications(
      {
        ...overlay,
        orders: [...built.orders, ...overlay.orders],
        shipments: [...built.shipments, ...overlay.shipments],
        items: [...overlay.items, ...built.items],
        returns: [...built.returns, ...overlay.returns],
        variantPatches,
      },
      notifications,
    )
  })

  if (paymentFailed) {
    return {
      ok: false,
      error: 'Your bank did not approve this payment. If money was deducted, it will be refunded within 5 to 7 working days. Your items are held for 15 minutes.',
      orderId,
      paymentFailed: true,
    }
  }
  return { ok: true, orderId, shipmentIds: built.shipments.map((shipment) => shipment.id) }
}

/** Move a shipment along, writing the timeline event every portal reads. */
function moveShipment(
  shipmentId: ID,
  to: ShipmentStatus,
  actor: TimelineEvent['actor'],
  options: {
    label: string
    code?: TimelineCode
    note?: string
    location?: string
    patch?: Partial<Shipment>
    notify?: (found: ShipmentContext) => Notification[]
    audit?: (found: ShipmentContext) => AuditEntry[]
    force?: boolean
  },
): ActionResult {
  const view = getView()
  const found = context(view, shipmentId)
  if (!found) return { ok: false, error: 'We could not find that shipment.' }
  const actorForCheck = actor === 'courier' || actor === 'system' ? 'system' : actor
  if (!options.force && !canTransition('shipment', found.shipment.status, to, actorForCheck)) {
    return { ok: false, error: `A ${found.shipment.status} shipment cannot move to ${to}.` }
  }

  const event = makeEvent(options.code ?? to, options.label, actor, options.note, options.location)
  const notifications = options.notify?.(found) ?? []
  const entries = options.audit?.(found) ?? []

  applyOverlay((overlay) =>
    withAudit(
      withNotifications(
        {
          ...overlay,
          shipmentPatches: patchRecord(overlay.shipmentPatches, shipmentId, { status: to, ...options.patch }),
          shipmentEvents: appendEvents(overlay.shipmentEvents, shipmentId, [event]),
        },
        notifications,
      ),
      entries,
    ),
  )
  return { ok: true }
}

function confirmShipment(shipmentId: ID): ActionResult {
  return moveShipment(shipmentId, 'confirmed', 'seller', {
    label: 'Order confirmed by the seller',
    notify: ({ shipment, order }) =>
      order
        ? [notification('customer', order.customerId, 'shipment', 'Order confirmed', `${shipment.id} has been confirmed by the seller.`, orderHref(order.id))]
        : [],
  })
}

function packShipment(shipmentId: ID, pack: { weightKg: number; dimensionsCm: [number, number, number] }): ActionResult {
  return moveShipment(shipmentId, 'packed', 'seller', {
    label: 'Packed and ready for pickup',
    patch: { package: pack },
    notify: ({ shipment, order }) =>
      order
        ? [notification('customer', order.customerId, 'shipment', 'Packed', `${shipment.id} has been packed and is waiting for the courier.`, orderHref(order.id))]
        : [],
  })
}

function handOverShipment(shipmentId: ID): ActionResult {
  const awb = `DS${String(Math.floor(1000000000 + Math.random() * 8999999999))}`
  return moveShipment(shipmentId, 'shipped', 'seller', {
    label: `Handed over to ${COURIER_NAME}`,
    note: `AWB ${awb}`,
    patch: { courier: COURIER_NAME, awb },
    notify: ({ shipment, order }) =>
      order
        ? [notification('customer', order.customerId, 'shipment', 'Your order has shipped', `${shipment.id} is on its way with ${COURIER_NAME}. AWB ${awb}.`, orderHref(order.id))]
        : [],
  })
}

/** The Demo tab's "Advance courier status": one step for one shipment, or for every one in transit. */
function advanceCourier(shipmentId?: ID): ActionResult {
  const view = getView()
  const targets = shipmentId
    ? [view.shipmentById.get(shipmentId)].filter((shipment): shipment is Shipment => Boolean(shipment))
    : view.shipments.filter((shipment) => shipment.status === 'shipped' || shipment.status === 'out_for_delivery')
  if (targets.length === 0) return { ok: false, error: 'Nothing is in transit right now.' }

  let moved = 0
  for (const shipment of targets) {
    if (shipment.status === 'shipped') {
      moveShipment(shipment.id, 'out_for_delivery', 'courier', {
        label: 'Out for delivery',
        location: 'Local delivery hub',
        notify: ({ order }) =>
          order
            ? [notification('customer', order.customerId, 'shipment', 'Out for delivery today', `${shipment.id} is with the delivery partner.`, orderHref(order.id))]
            : [],
      })
      moved += 1
    } else if (shipment.status === 'out_for_delivery') {
      const order = view.orderById.get(shipment.orderId)
      const collectsCash = order?.payment.method === 'cod'
      moveShipment(shipment.id, 'delivered', 'courier', {
        label: 'Delivered',
        patch: { deliveredAt: now() },
        notify: ({ order: parent }) =>
          parent
            ? [notification('customer', parent.customerId, 'shipment', 'Delivered', `${shipment.id} was delivered. Tell other shoppers what you think.`, orderHref(parent.id))]
            : [],
      })
      if (order) {
        applyOverlay((overlay) => ({
          ...overlay,
          orderPatches: patchRecord(overlay.orderPatches, order.id, {
            payment: { ...order.payment, status: collectsCash ? 'collected' : order.payment.status, paidAt: order.payment.paidAt ?? now() },
          }),
        }))
      }
      moved += 1
    }
  }
  return moved > 0 ? { ok: true } : { ok: false, error: 'Nothing is in transit right now.' }
}

function cancelShipment(shipmentId: ID, options: { by: CancelledBy; reason: string }): ActionResult {
  const view = getView()
  const found = context(view, shipmentId)
  if (!found) return { ok: false, error: 'We could not find that shipment.' }
  const actor = options.by === 'platform' ? 'system' : options.by
  if (!canTransition('shipment', found.shipment.status, 'cancelled', actor)) {
    return { ok: false, error: 'This shipment has gone too far to be cancelled. Ask for a return instead.' }
  }

  const order = found.order
  const prepaid = order ? order.payment.method !== 'cod' : false
  const result = moveShipment(shipmentId, 'cancelled', actor, {
    label: options.by === 'platform' ? 'Cancelled by Chowk' : options.by === 'seller' ? 'Cancelled by the seller' : 'Cancelled by the shopper',
    note: options.reason,
    patch: { cancelledBy: options.by, cancelReason: options.reason },
    force: true,
    notify: ({ shipment, order: parent }) => {
      const list: Notification[] = []
      if (parent) {
        list.push(
          notification('customer', parent.customerId, 'order', 'Order cancelled', prepaid ? `${shipment.id} was cancelled. Your refund of ${formatINR(shipment.totals.total)} is on its way.` : `${shipment.id} was cancelled. Nothing was charged.`, orderHref(parent.id)),
        )
      }
      if (options.by !== 'seller') {
        list.push(notification('seller', shipment.sellerId, 'order', 'Order cancelled', `${shipment.id} was cancelled: ${options.reason}`, `/seller/orders/${shipment.id}`))
      }
      return list
    },
  })
  if (!result.ok) return result

  // Put the stock back and record the refund.
  applyOverlay((overlay) => {
    let variantPatches = overlay.variantPatches
    for (const itemId of found.shipment.itemIds) {
      const item = view.itemById.get(itemId)
      if (!item) continue
      const product = view.productById.get(item.productId)
      const variant = product?.variants.find((entry) => entry.id === item.variantId)
      if (!product || !variant) continue
      const current = variantPatches[product.id]?.[variant.id]?.stock ?? variant.stock
      variantPatches = patchVariant(variantPatches, product.id, variant.id, { stock: current + item.qty })
    }
    let orderPatches = overlay.orderPatches
    if (order && prepaid) {
      orderPatches = patchRecord(orderPatches, order.id, {
        payment: {
          ...order.payment,
          status: 'refund_initiated',
          refunds: [
            ...order.payment.refunds,
            { id: uid('rf_'), amount: found.shipment.totals.total, at: now(), status: 'initiated', reason: 'Order cancelled' },
          ],
        },
      })
    }
    return { ...overlay, variantPatches, orderPatches }
  })
  return { ok: true }
}

function addOrderNote(orderId: ID, text: string, by = 'Chowk support'): ActionResult {
  const view = getView()
  const order = view.orderById.get(orderId)
  if (!order) return { ok: false, error: 'We could not find that order.' }
  const note = { id: uid('note_'), at: now(), by, text }
  applyOverlay((overlay) =>
    withAudit({ ...overlay, orderPatches: patchRecord(overlay.orderPatches, orderId, { notes: [...order.notes, note] }) }, [
      audit('order.note_added', 'order', orderId, `Added an internal note to ${orderId}.`),
    ]),
  )
  return { ok: true }
}

/** Admin override: any status, with a note that lands on the timeline. */
function overrideShipmentStatus(shipmentId: ID, status: ShipmentStatus, note: string): ActionResult {
  return moveShipment(shipmentId, status, 'admin', {
    label: `Status set to ${status.replace(/_/g, ' ')} by the marketplace team`,
    note,
    force: true,
    patch: status === 'delivered' ? { deliveredAt: now() } : {},
    audit: ({ shipment }) => [audit('shipment.status_override', 'shipment', shipment.id, `Set ${shipment.id} to "${status}": ${note}`)],
    notify: ({ shipment, order }) =>
      order ? [notification('customer', order.customerId, 'shipment', 'Order updated', `${shipment.id} is now "${status.replace(/_/g, ' ')}".`, orderHref(order.id))] : [],
  })
}

// ── Returns ───────────────────────────────────────────────────────────────

interface ReturnInput {
  shipmentId: ID
  itemIds?: ID[]
  reason: string
  details?: string
  refundTo?: 'source' | 'upi'
}

function requestReturn(input: ReturnInput): ActionResult {
  const view = getView()
  const found = context(view, input.shipmentId)
  if (!found) return { ok: false, error: 'We could not find that shipment.' }
  if (found.shipment.status !== 'delivered') return { ok: false, error: 'You can ask for a return once the item is delivered.' }
  if (found.shipment.returnId) return { ok: false, error: 'A return has already been raised for this shipment.' }

  const itemIds = input.itemIds?.length ? input.itemIds : found.shipment.itemIds
  const amount = itemIds.reduce((sum, itemId) => {
    const item = view.itemById.get(itemId)
    return sum + (item ? item.price * item.qty : 0)
  }, 0)
  const request: ReturnRequest = {
    id: uid('RET-').toUpperCase(),
    orderId: found.shipment.orderId,
    shipmentId: found.shipment.id,
    itemIds,
    reason: input.reason,
    details: input.details,
    status: 'requested',
    requestedAt: now(),
    refundAmount: amount,
    refundTo: input.refundTo ?? (found.order?.payment.method === 'cod' ? 'upi' : 'source'),
  }

  applyOverlay((overlay) =>
    withNotifications(
      {
        ...overlay,
        returns: [request, ...overlay.returns],
        shipmentPatches: patchRecord(overlay.shipmentPatches, found.shipment.id, { returnId: request.id }),
        shipmentEvents: appendEvents(overlay.shipmentEvents, found.shipment.id, [
          makeEvent('return_requested', 'Return requested', 'customer', input.reason),
        ]),
      },
      [
        notification('seller', found.shipment.sellerId, 'order', 'Return requested', `${found.shipment.id}: ${input.reason}. Approve or reject within 48 hours.`, `/seller/orders/${found.shipment.id}`),
      ],
    ),
  )
  return { ok: true }
}

function updateReturn(returnId: ID, patch: Partial<ReturnRequest>, event: TimelineEvent, notifications: Notification[] = []): ActionResult {
  const view = getView()
  const request = view.returnById.get(returnId)
  if (!request) return { ok: false, error: 'We could not find that return.' }
  applyOverlay((overlay) =>
    withNotifications(
      {
        ...overlay,
        returnPatches: patchRecord(overlay.returnPatches, returnId, patch),
        shipmentEvents: appendEvents(overlay.shipmentEvents, request.shipmentId, [event]),
      },
      notifications,
    ),
  )
  return { ok: true }
}

function decideReturn(returnId: ID, approve: boolean, reason?: string): ActionResult {
  const view = getView()
  const request = view.returnById.get(returnId)
  if (!request) return { ok: false, error: 'We could not find that return.' }
  const order = view.orderById.get(request.orderId)
  const label = approve ? 'Return approved' : 'Return rejected'
  return updateReturn(
    returnId,
    {
      status: approve ? 'approved' : 'rejected',
      decidedAt: now(),
      ...(approve ? {} : { rejectionReason: reason ?? 'The item does not meet the return policy.' }),
    },
    makeEvent(approve ? 'return_approved' : 'return_rejected', label, 'seller', reason),
    order
      ? [
          notification('customer', order.customerId, 'order', label, approve ? `Your return for ${request.shipmentId} was approved. Pickup will be scheduled.` : `Your return for ${request.shipmentId} was rejected. ${reason ?? ''}`.trim(), orderHref(order.id)),
        ]
      : [],
  )
}

function pickUpReturn(returnId: ID): ActionResult {
  const view = getView()
  const request = view.returnById.get(returnId)
  if (!request) return { ok: false, error: 'We could not find that return.' }
  const order = view.orderById.get(request.orderId)
  return updateReturn(
    returnId,
    { status: 'picked_up', pickedUpAt: now() },
    makeEvent('return_picked_up', 'Return picked up', 'courier'),
    order ? [notification('customer', order.customerId, 'order', 'Return picked up', `We have collected the item from ${request.shipmentId}. The refund follows the quality check.`, orderHref(order.id))] : [],
  )
}

function refundReturn(returnId: ID): ActionResult {
  const view = getView()
  const request = view.returnById.get(returnId)
  if (!request) return { ok: false, error: 'We could not find that return.' }
  const order = view.orderById.get(request.orderId)
  const result = updateReturn(
    returnId,
    { status: 'refunded', refundedAt: now() },
    makeEvent('refunded', 'Refund completed', 'system', `Refunded ${formatINR(request.refundAmount)} to the original payment method.`),
    order ? [notification('customer', order.customerId, 'order', 'Refund completed', `${formatINR(request.refundAmount)} has been refunded for ${request.shipmentId}.`, orderHref(order.id))] : [],
  )
  if (!result.ok || !order) return result
  const shipmentCount = order.shipmentIds.length
  applyOverlay((overlay) => ({
    ...overlay,
    orderPatches: patchRecord(overlay.orderPatches, order.id, {
      payment: {
        ...order.payment,
        status: shipmentCount > 1 ? 'partially_refunded' : 'refunded',
        refunds: [...order.payment.refunds, { id: uid('rf_'), amount: request.refundAmount, at: now(), status: 'processed', reason: 'Return refunded' }],
      },
    }),
  }))
  return { ok: true }
}

// ── Sellers ───────────────────────────────────────────────────────────────

const SELLER_STATUS_TITLE: Record<SellerStatus, string> = {
  draft: 'Application saved',
  under_review: 'Application submitted',
  action_required: 'Action required on your account',
  active: 'Your store is live',
  suspended: 'Your account has been suspended',
  rejected: 'Your application was not approved',
}

function setSellerStatus(sellerId: ID, status: SellerStatus, message?: string): ActionResult {
  const view = getView()
  const seller = view.sellerById.get(sellerId)
  if (!seller) return { ok: false, error: 'We could not find that seller.' }
  applyOverlay((overlay) =>
    withAudit(
      withNotifications(
        {
          ...overlay,
          sellerPatches: patchRecord(overlay.sellerPatches, sellerId, {
            status,
            ...(message ? { statusReason: message } : status === 'active' ? { statusReason: undefined } : {}),
          }),
        },
        [notification('seller', sellerId, 'kyc', SELLER_STATUS_TITLE[status], message ?? `Your account status is now "${status.replace(/_/g, ' ')}".`, '/seller/profile')],
      ),
      [audit(`seller.${status}`, 'seller', sellerId, `${seller.displayName} set to "${status}"${message ? `: ${message}` : '.'}`)],
    ),
  )
  return { ok: true }
}

function setKycItem(sellerId: ID, key: KycKey, status: KycStatus, note?: string): ActionResult {
  const view = getView()
  const seller = view.sellerById.get(sellerId)
  if (!seller) return { ok: false, error: 'We could not find that seller.' }
  applyOverlay((overlay) =>
    withAudit({ ...overlay, kycPatches: patchKyc(overlay.kycPatches, sellerId, key, { status, note }) }, [
      audit('seller.kyc_updated', 'seller', sellerId, `${seller.displayName}: ${key.toUpperCase()} marked "${status.replace(/_/g, ' ')}".`),
    ]),
  )
  return { ok: true }
}

function registerSeller(input: SellerRegistrationInput): { ok: true; sellerId: ID } | { ok: false; error: string } {
  const view = getView()
  const slug = input.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  if (view.sellerBySlug.has(slug)) return { ok: false, error: 'A store with this name already exists. Try another name.' }
  const sellerId = uid('sel_')
  const seller = {
    id: sellerId,
    slug,
    displayName: input.displayName,
    legalName: input.legalName,
    ownerName: input.ownerName,
    email: input.email,
    phone: input.phone,
    gstin: input.gstin,
    pan: input.pan,
    city: input.pickupAddress.city,
    state: input.pickupAddress.state,
    stateCode: input.pickupAddress.stateCode,
    pickupAddress: input.pickupAddress,
    joinedAt: now(),
    status: 'under_review' as const,
    submittedAt: now(),
    kyc: [
      { key: 'pan' as const, label: 'PAN card', status: 'submitted' as const, required: true, document: 'pan-card.pdf' },
      { key: 'gstin' as const, label: 'GSTIN', status: input.gstin ? ('submitted' as const) : ('not_submitted' as const), required: Boolean(input.gstin), ...(input.gstin ? { document: 'gst-certificate.pdf' } : {}) },
      { key: 'bank' as const, label: 'Bank account', status: 'submitted' as const, required: true, note: '₹1 test deposit sent, waiting for the name match.', document: 'bank-statement.pdf' },
      { key: 'address' as const, label: 'Address proof', status: 'submitted' as const, required: true, document: 'electricity-bill.pdf' },
      { key: 'signature' as const, label: 'Signature', status: 'submitted' as const, required: true, document: 'signature.png' },
      { key: 'cheque' as const, label: 'Cancelled cheque', status: 'not_submitted' as const, required: true },
    ],
    rating: null,
    ratingCount: 0,
    categoryIds: input.categoryIds,
    tier: 'bronze' as const,
    bank: { ...input.bank, verified: false },
    tagline: input.tagline ?? 'New on Chowk',
    about: input.about ?? `${input.displayName} has just applied to sell on Chowk.`,
    policies: {
      returns: 'Returns accepted within 7 days of delivery if the item is unused and in its original packaging.',
      shipping: 'Dispatched within 1 to 2 working days.',
    },
  }

  applyOverlay((overlay) =>
    withAudit(
      withNotifications({ ...overlay, sellers: [seller, ...overlay.sellers] }, [
        notification('admin', DEMO.adminId, 'kyc', 'Seller application waiting', `${input.displayName} (${input.pickupAddress.city}) submitted an application. KYC is partly verified.`, `/admin/sellers/${sellerId}`),
        notification('seller', sellerId, 'kyc', 'Application submitted', 'We are checking your details. Most applications are reviewed within two working days.', '/seller'),
      ]),
      [audit('seller.applied', 'seller', sellerId, `${input.displayName} submitted an application.`, input.ownerName)],
    ),
  )
  return { ok: true, sellerId }
}

// ── Catalogue ─────────────────────────────────────────────────────────────

function upsertProduct(input: ProductInput): { ok: true; productId: ID } | { ok: false; error: string } {
  const view = getView()
  const status: ProductStatus = input.submit ? 'pending' : 'draft'
  const slugBase = input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)

  if (input.id) {
    const existing = view.productById.get(input.id)
    if (!existing) return { ok: false, error: 'We could not find that listing.' }
    const changes: string[] = []
    if (existing.title !== input.title) changes.push('Title changed')
    if (existing.description !== input.description) changes.push('Description changed')
    if (existing.media.length !== input.media.length) changes.push('Images changed')
    if (existing.variants.length !== input.variants.length) changes.push('Variants changed')
    const variants: Variant[] = input.variants.map((variant, index) => ({
      id: variant.id ?? `${existing.id}_v${index + 1}`,
      sku: variant.sku,
      options: variant.options,
      mrp: variant.mrp,
      price: variant.price,
      stock: variant.stock,
      lowStockAt: variant.lowStockAt ?? 5,
      active: variant.active ?? true,
    }))
    applyOverlay((overlay) =>
      withNotifications(
        {
          ...overlay,
          productPatches: patchRecord(overlay.productPatches, existing.id, {
            title: input.title,
            brand: input.brand,
            categoryId: input.categoryId,
            description: input.description,
            highlights: input.highlights,
            media: input.media,
            ...(input.specs ? { specs: input.specs } : {}),
            ...(input.axes ? { axes: input.axes } : {}),
            variants,
            hsn: input.hsn,
            gstRate: input.gstRate,
            dispatchDays: input.dispatchDays,
            weightKg: input.weightKg,
            dimensionsCm: input.dimensionsCm,
            countryOfOrigin: input.countryOfOrigin,
            manufacturer: input.manufacturer,
            ...(input.warranty ? { warranty: input.warranty } : {}),
            ...(input.keywords ? { keywords: input.keywords } : {}),
            updatedAt: now(),
            status: input.submit ? 'pending' : existing.status === 'live' ? 'live' : status,
            ...(input.submit
              ? { moderation: { ...existing.moderation, submittedAt: now(), changes: changes.length ? changes : ['Details updated'] } }
              : {}),
          }),
        },
        input.submit
          ? [notification('admin', DEMO.adminId, 'listing', 'Listing waiting for review', `${input.title} was resubmitted by ${view.sellerById.get(input.sellerId)?.displayName ?? 'a seller'}.`, '/admin/products?tab=moderation')]
          : [],
      ),
    )
    return { ok: true, productId: existing.id }
  }

  const productId = uid('prd_')
  const category = view.categoryById.get(input.categoryId)
  const product: Product = {
    id: productId,
    slug: view.productBySlug.has(slugBase) ? `${slugBase}-${productId.slice(-4)}` : slugBase,
    title: input.title,
    brand: input.brand,
    categoryId: input.categoryId,
    sellerId: input.sellerId,
    otherOffers: [],
    description: input.description,
    highlights: input.highlights,
    specs: input.specs ?? [],
    media: input.media,
    axes: input.axes ?? [],
    variants: input.variants.map((variant, index) => ({
      id: variant.id ?? `${productId}_v${index + 1}`,
      sku: variant.sku,
      options: variant.options,
      mrp: variant.mrp,
      price: variant.price,
      stock: variant.stock,
      lowStockAt: variant.lowStockAt ?? 5,
      active: variant.active ?? true,
    })),
    rating: { avg: 0, count: 0, dist: [0, 0, 0, 0, 0] },
    tags: [],
    returnDays: input.returnDays ?? category?.returnDays ?? 7,
    cod: input.cod ?? true,
    status,
    hsn: input.hsn,
    gstRate: input.gstRate,
    dispatchDays: input.dispatchDays,
    weightKg: input.weightKg,
    dimensionsCm: input.dimensionsCm,
    countryOfOrigin: input.countryOfOrigin,
    manufacturer: input.manufacturer,
    ...(input.warranty ? { warranty: input.warranty } : {}),
    keywords: input.keywords ?? [],
    createdAt: now(),
    updatedAt: now(),
    ...(input.submit ? { moderation: { submittedAt: now(), changes: ['New listing'] } } : {}),
  }

  applyOverlay((overlay) =>
    withNotifications({ ...overlay, products: [product, ...overlay.products] }, input.submit
      ? [notification('admin', DEMO.adminId, 'listing', 'New listing waiting for review', `${input.title} from ${view.sellerById.get(input.sellerId)?.displayName ?? 'a seller'}.`, '/admin/products?tab=moderation')]
      : []),
  )
  return { ok: true, productId }
}

function setProductActive(productId: ID, active: boolean): ActionResult {
  const view = getView()
  const product = view.productById.get(productId)
  if (!product) return { ok: false, error: 'We could not find that listing.' }
  if (product.status !== 'live' && product.status !== 'inactive') {
    return { ok: false, error: 'Only live listings can be paused.' }
  }
  applyOverlay((overlay) => ({
    ...overlay,
    productPatches: patchRecord(overlay.productPatches, productId, { status: active ? 'live' : 'inactive', updatedAt: now() }),
  }))
  return { ok: true }
}

function moderateProduct(productId: ID, decision: 'approve' | 'reject' | 'block', reason?: string): ActionResult {
  const view = getView()
  const product = view.productById.get(productId)
  if (!product) return { ok: false, error: 'We could not find that listing.' }
  const status: ProductStatus = decision === 'approve' ? 'live' : decision === 'reject' ? 'rejected' : 'blocked'
  const tags = decision === 'approve' && !product.tags.includes('new') ? [...product.tags, 'new' as const] : product.tags

  applyOverlay((overlay) =>
    withAudit(
      withNotifications(
        {
          ...overlay,
          productPatches: patchRecord(overlay.productPatches, productId, {
            status,
            tags,
            updatedAt: now(),
            moderation: { ...product.moderation, reviewedAt: now(), reviewerId: DEMO.adminId, ...(reason ? { reason } : {}) },
          }),
        },
        [
          notification(
            'seller',
            product.sellerId,
            'listing',
            decision === 'approve' ? 'Listing approved' : decision === 'reject' ? 'Listing needs changes' : 'Listing blocked',
            decision === 'approve' ? `${product.title} is live on Chowk.` : reason ?? 'The catalogue team asked for changes.',
            decision === 'approve' ? `/p/${product.slug}` : `/seller/products/${product.id}/edit`,
          ),
        ],
      ),
      [audit(`product.${decision}ed`, 'product', productId, `${decision === 'approve' ? 'Approved' : decision === 'reject' ? 'Rejected' : 'Blocked'} "${product.title}"${reason ? `: ${reason}` : '.'}`)],
    ),
  )
  return { ok: true }
}

function updateVariant(productId: ID, variantId: ID, patch: { stock?: number; price?: number; mrp?: number; active?: boolean; lowStockAt?: number }): ActionResult {
  const view = getView()
  const product = view.productById.get(productId)
  const variant = product?.variants.find((entry) => entry.id === variantId)
  if (!product || !variant) return { ok: false, error: 'We could not find that variant.' }
  if (patch.price !== undefined && patch.mrp !== undefined && patch.price > patch.mrp) {
    return { ok: false, error: 'The selling price cannot be higher than the MRP.' }
  }
  applyOverlay((overlay) => ({ ...overlay, variantPatches: patchVariant(overlay.variantPatches, productId, variantId, patch) }))
  return { ok: true }
}

// ── Reviews ───────────────────────────────────────────────────────────────

function replyToReview(reviewId: ID, body: string): ActionResult {
  const view = getView()
  const review = view.reviewById.get(reviewId)
  if (!review) return { ok: false, error: 'We could not find that review.' }
  applyOverlay((overlay) => ({
    ...overlay,
    reviewPatches: patchRecord(overlay.reviewPatches, reviewId, { sellerReply: { body, at: now() } }),
  }))
  return { ok: true }
}

function setReviewStatus(reviewId: ID, status: ReviewStatus, reason?: string): ActionResult {
  const view = getView()
  const review = view.reviewById.get(reviewId)
  if (!review) return { ok: false, error: 'We could not find that review.' }
  applyOverlay((overlay) =>
    withAudit(
      { ...overlay, reviewPatches: patchRecord(overlay.reviewPatches, reviewId, { status, ...(reason ? { flagReason: reason } : {}) }) },
      [audit(`review.${status}`, 'review', reviewId, `Review on ${review.productId} marked "${status}"${reason ? `: ${reason}` : '.'}`)],
    ),
  )
  return { ok: true }
}

function voteHelpful(reviewId: ID): ActionResult {
  const view = getView()
  const review = view.reviewById.get(reviewId)
  if (!review) return { ok: false, error: 'We could not find that review.' }
  applyOverlay((overlay) => ({
    ...overlay,
    reviewPatches: patchRecord(overlay.reviewPatches, reviewId, { helpful: review.helpful + 1 }),
  }))
  return { ok: true }
}

interface ReviewInput {
  productId: ID
  customerId: ID
  rating: 1 | 2 | 3 | 4 | 5
  title: string
  body: string
  photos?: Review['photos']
}

function submitReview(input: ReviewInput): ActionResult {
  const view = getView()
  const product = view.productById.get(input.productId)
  if (!product) return { ok: false, error: 'We could not find that product.' }
  const review: Review = {
    id: uid('rev_'),
    productId: input.productId,
    customerId: input.customerId,
    sellerId: product.sellerId,
    rating: input.rating,
    title: input.title,
    body: input.body,
    createdAt: now(),
    verified: true,
    helpful: 0,
    photos: input.photos ?? [],
    status: 'published',
  }
  applyOverlay((overlay) =>
    withNotifications({ ...overlay, reviews: [review, ...overlay.reviews] }, [
      notification('seller', product.sellerId, 'review', 'New review to reply to', `${input.rating}★ "${input.title}" on ${product.title}.`, '/seller/reviews'),
    ]),
  )
  return { ok: true }
}

// ── Money and platform ────────────────────────────────────────────────────

function upsertCoupon(coupon: Coupon): ActionResult {
  applyOverlay((overlay) =>
    withAudit({ ...overlay, couponUpserts: { ...overlay.couponUpserts, [coupon.code]: coupon } }, [
      audit('coupon.saved', 'coupon', coupon.code, `Saved coupon ${coupon.code}: ${coupon.title}.`),
    ]),
  )
  return { ok: true }
}

function setCouponPaused(code: string, paused: boolean): ActionResult {
  const view = getView()
  const coupon = view.couponByCode.get(code)
  if (!coupon) return { ok: false, error: 'We could not find that coupon.' }
  return upsertCoupon({ ...coupon, paused })
}

function patchPayout(payoutId: ID, patch: Partial<Payout>, summary: string): ActionResult {
  const view = getView()
  const payout = view.payoutById.get(payoutId)
  if (!payout) return { ok: false, error: 'We could not find that payout.' }
  applyOverlay((overlay) =>
    withAudit({ ...overlay, payoutPatches: patchRecord(overlay.payoutPatches, payoutId, patch) }, [
      audit('payout.updated', 'payout', payoutId, summary),
    ]),
  )
  return { ok: true }
}

function holdPayout(payoutId: ID, reason: string): ActionResult {
  return patchPayout(payoutId, { status: 'on_hold', holdReason: reason }, `Put ${payoutId} on hold: ${reason}`)
}

function releasePayout(payoutId: ID): ActionResult {
  return patchPayout(payoutId, { status: 'scheduled', holdReason: undefined }, `Released ${payoutId} back into the next payout run.`)
}

function markPayoutPaid(payoutId: ID): ActionResult {
  const utr = `DEMOUTR${String(Math.floor(100000000 + Math.random() * 899999999))}`
  return patchPayout(payoutId, { status: 'paid', paidAt: now(), utr }, `Marked ${payoutId} as paid (UTR ${utr}).`)
}

function setCustomerStatus(customerId: ID, status: Customer['status'], reason?: string): ActionResult {
  const view = getView()
  const customer = view.customerById.get(customerId)
  if (!customer) return { ok: false, error: 'We could not find that shopper.' }
  applyOverlay((overlay) =>
    withAudit(
      { ...overlay, customerPatches: patchRecord(overlay.customerPatches, customerId, { status, ...(reason ? { statusReason: reason } : {}) }) },
      [audit(`customer.${status}`, 'customer', customerId, `${customer.name} marked "${status}"${reason ? `: ${reason}` : '.'}`)],
    ),
  )
  return { ok: true }
}

/** Admin nudging a seller — low stock, a listing to fix, a dispatch running late. */
function notifySeller(
  sellerId: ID,
  input: { kind: Notification['kind']; title: string; body: string; href?: string },
): ActionResult {
  const view = getView()
  const seller = view.sellerById.get(sellerId)
  if (!seller) return { ok: false, error: 'We could not find that seller.' }
  applyOverlay((overlay) =>
    withAudit(
      withNotifications(overlay, [
        notification('seller', sellerId, input.kind, input.title, input.body, input.href),
      ]),
      [audit('seller.notified', 'seller', sellerId, `Notified ${seller.displayName}: ${input.title}`)],
    ),
  )
  return { ok: true }
}

/**
 * A seller editing their own store: contact details, bank account, pickup addresses,
 * store page and holiday mode. Status, KYC and commission belong to admin and are
 * refused here, so a seller can never approve or reinstate themselves.
 */
function updateSeller(sellerId: ID, patch: Partial<Omit<Seller, 'id' | 'status' | 'kyc' | 'commissionPct'>>): ActionResult {
  const view = getView()
  if (!view.sellerById.get(sellerId)) return { ok: false, error: 'We could not find your seller account.' }
  applyOverlay((overlay) => ({ ...overlay, sellerPatches: patchRecord(overlay.sellerPatches, sellerId, patch) }))
  return { ok: true }
}

// ── A shopper editing their own account ───────────────────────────────────
// No audit entry: the audit log records what staff did, not what a shopper did
// to their own profile.

function patchCustomer(customerId: ID, patch: Partial<Customer>): void {
  applyOverlay((overlay) => ({ ...overlay, customerPatches: patchRecord(overlay.customerPatches, customerId, patch) }))
}

function readCustomer(customerId: ID): Customer | undefined {
  return getView().customerById.get(customerId)
}

const NO_CUSTOMER: ActionResult = { ok: false, error: 'We could not find your account. Sign in and try again.' }

/** A fresh id for an address or saved payment the shopper just created. */
function newAccountId(prefix: string): ID {
  return uid(prefix)
}

/** Add a new address or replace an existing one, optionally making it the default. */
function saveAddress(customerId: ID, address: Address, makeDefault = false): ActionResult {
  const customer = readCustomer(customerId)
  if (!customer) return NO_CUSTOMER
  const exists = customer.addresses.some((entry) => entry.id === address.id)
  const addresses = exists
    ? customer.addresses.map((entry) => (entry.id === address.id ? address : entry))
    : [...customer.addresses, address]
  patchCustomer(customerId, {
    addresses,
    defaultAddressId: makeDefault || !customer.defaultAddressId ? address.id : customer.defaultAddressId,
  })
  return { ok: true }
}

function removeAddress(customerId: ID, addressId: ID): ActionResult {
  const customer = readCustomer(customerId)
  if (!customer) return NO_CUSTOMER
  if (customer.addresses.length <= 1) {
    return { ok: false, error: 'Keep at least one address so we know where to deliver.' }
  }
  const addresses = customer.addresses.filter((entry) => entry.id !== addressId)
  patchCustomer(customerId, {
    addresses,
    defaultAddressId: customer.defaultAddressId === addressId ? (addresses[0]?.id ?? null) : customer.defaultAddressId,
  })
  return { ok: true }
}

function setDefaultAddress(customerId: ID, addressId: ID): ActionResult {
  const customer = readCustomer(customerId)
  if (!customer) return NO_CUSTOMER
  patchCustomer(customerId, { defaultAddressId: addressId })
  return { ok: true }
}

/** Add or replace a saved UPI id or tokenised card. Exactly one stays the default. */
function savePayment(customerId: ID, payment: SavedPayment): ActionResult {
  const customer = readCustomer(customerId)
  if (!customer) return NO_CUSTOMER
  if (payment.kind === 'upi' && customer.savedPayments.some((entry) => entry.kind === 'upi' && entry.vpa === payment.vpa)) {
    return { ok: false, error: 'That UPI ID is already saved.' }
  }
  const exists = customer.savedPayments.some((entry) => entry.id === payment.id)
  const merged = exists
    ? customer.savedPayments.map((entry) => (entry.id === payment.id ? payment : entry))
    : [...customer.savedPayments, payment]
  const onlyOne = merged.length === 1
  patchCustomer(customerId, {
    savedPayments: merged.map((entry) => ({
      ...entry,
      isDefault: onlyOne ? true : entry.id === payment.id ? payment.isDefault : payment.isDefault ? false : entry.isDefault,
    })),
  })
  return { ok: true }
}

function removePayment(customerId: ID, paymentId: ID): ActionResult {
  const customer = readCustomer(customerId)
  if (!customer) return NO_CUSTOMER
  const remaining = customer.savedPayments.filter((entry) => entry.id !== paymentId)
  const wasDefault = customer.savedPayments.find((entry) => entry.id === paymentId)?.isDefault
  patchCustomer(customerId, {
    savedPayments:
      wasDefault && remaining.length > 0
        ? remaining.map((entry, index) => ({ ...entry, isDefault: index === 0 }))
        : remaining,
  })
  return { ok: true }
}

function setDefaultPayment(customerId: ID, paymentId: ID): ActionResult {
  const customer = readCustomer(customerId)
  if (!customer) return NO_CUSTOMER
  patchCustomer(customerId, {
    savedPayments: customer.savedPayments.map((entry) => ({ ...entry, isDefault: entry.id === paymentId })),
  })
  return { ok: true }
}

/** Name, email and mobile on the shopper's own profile. */
function updateCustomerProfile(customerId: ID, patch: { name?: string; email?: string; phone?: string }): ActionResult {
  const customer = readCustomer(customerId)
  if (!customer) return NO_CUSTOMER
  patchCustomer(customerId, patch)
  return { ok: true }
}

function updateSettings(patch: Partial<PlatformSettings>): ActionResult {
  applyOverlay((overlay) =>
    withAudit({ ...overlay, settingsPatch: { ...overlay.settingsPatch, ...patch } }, [
      audit('settings.updated', 'settings', 'general', `Updated ${Object.keys(patch).join(', ')}.`),
    ]),
  )
  return { ok: true }
}

function markNotificationsRead(portal: Portal, audienceId: ID): ActionResult {
  const view = getView()
  const ids = view.notifications
    .filter((entry) => entry.portal === portal && entry.audienceId === audienceId && !entry.read)
    .map((entry) => entry.id)
  if (ids.length === 0) return { ok: true }
  applyOverlay((overlay) => ({ ...overlay, readNotifications: [...overlay.readNotifications, ...ids] }))
  return { ok: true }
}

/** The Demo tab's "New order arrives": a believable order lands for this seller. */
function simulateNewOrder(sellerId: ID): PlaceOrderResult {
  const view = getView()
  const catalogue = view.products.filter(
    (product) => product.sellerId === sellerId && product.status === 'live' && product.variants.some((variant) => variant.active && variant.stock > 0),
  )
  if (catalogue.length === 0) return { ok: false, error: 'This seller has nothing in stock to sell.' }
  const rng = streamFor(`simulate:${Date.now()}`)
  const product = rng.pick(catalogue)
  const variant = rng.pick(product.variants.filter((entry) => entry.active && entry.stock > 0))
  const shoppers = view.customers.filter((customer) => customer.status === 'active' && customer.addresses.length > 0)
  const customer = rng.pick(shoppers)

  return placeOrder({
    customerId: customer.id,
    lines: [{ productId: product.id, variantId: variant.id, qty: rng.weighted([[1, 80], [2, 18], [3, 2]]) }],
    paymentMethod: rng.weighted([['upi', 55], ['cod', 20], ['card', 15], ['netbanking', 5], ['wallet', 5]]),
  })
}

/** Dispatch deadline for a shipment placed now — exported for the seller's pack dialog. */
function slaFor(dispatchDays: number): ISODate {
  return dispatchDeadline(now(), dispatchDays)
}

export const dbActions = {
  placeOrder,
  confirmShipment,
  packShipment,
  handOverShipment,
  advanceCourier,
  cancelShipment,
  addOrderNote,
  overrideShipmentStatus,
  requestReturn,
  decideReturn,
  pickUpReturn,
  refundReturn,
  setSellerStatus,
  setKycItem,
  updateSeller,
  notifySeller,
  registerSeller,
  upsertProduct,
  setProductActive,
  moderateProduct,
  updateVariant,
  replyToReview,
  setReviewStatus,
  voteHelpful,
  submitReview,
  upsertCoupon,
  setCouponPaused,
  holdPayout,
  releasePayout,
  markPayoutPaid,
  setCustomerStatus,
  newAccountId,
  saveAddress,
  removeAddress,
  setDefaultAddress,
  savePayment,
  removePayment,
  setDefaultPayment,
  updateCustomerProfile,
  updateSettings,
  markNotificationsRead,
  simulateNewOrder,
  slaFor,
}

export type DbActions = typeof dbActions
