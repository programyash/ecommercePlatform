// The single status registry. Every badge, filter, tab, timeline and legend in the
// three portals reads its label, tone and icon from here — so "Out for delivery"
// is worded and coloured identically for the shopper, the seller and the admin.
//
// Icon keys are lucide names; the UI maps a key to a component (this file must stay
// free of React and of lucide-react so it can run in plain Node).

import type {
  Actor,
  CouponStatus,
  CustomerStatus,
  KycStatus,
  PaymentMethod,
  PaymentStatus,
  PayoutStatus,
  ProductStatus,
  ReturnStatus,
  ReviewStatus,
  SellerStatus,
  ShipmentStatus,
  TimelineCode,
} from '@/data/types'

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

/** Lucide icon names the UI maps to components. Keep this list and the map in step. */
export type StatusIconKey =
  | 'circle-dot' | 'circle-check' | 'package' | 'truck' | 'map-pin' | 'package-check'
  | 'circle-x' | 'rotate-ccw' | 'hourglass' | 'shield-check' | 'shield-alert' | 'ban'
  | 'badge-check' | 'pause' | 'clock' | 'wallet' | 'flag' | 'eye-off' | 'triangle-alert'
  | 'file-pen' | 'calendar-clock' | 'archive' | 'check' | 'x'

export interface StatusMeta {
  label: string
  tone: StatusTone
  icon: StatusIconKey
  /** One line explaining what the status means, for tooltips and legends. */
  description?: string
}

/** Stock is derived from the variant, not stored — but it is badged like a status. */
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

/** Which status union belongs to which domain. */
export interface StatusDomains {
  shipment: ShipmentStatus
  return: ReturnStatus
  payment: PaymentStatus
  seller: SellerStatus
  kyc: KycStatus
  listing: ProductStatus
  stock: StockStatus
  payout: PayoutStatus
  coupon: CouponStatus
  review: ReviewStatus
  customer: CustomerStatus
}

export type StatusDomain = keyof StatusDomains

type MetaMap = { [D in StatusDomain]: Record<StatusDomains[D], StatusMeta> }

export const STATUS_META: MetaMap = {
  shipment: {
    placed: { label: 'Placed', tone: 'neutral', icon: 'circle-dot', description: 'Waiting for the seller to confirm.' },
    confirmed: { label: 'Confirmed', tone: 'info', icon: 'circle-check', description: 'The seller has accepted the order.' },
    packed: { label: 'Packed', tone: 'info', icon: 'package', description: 'Packed and waiting for the courier.' },
    shipped: { label: 'Shipped', tone: 'info', icon: 'truck', description: 'Handed over to the courier.' },
    out_for_delivery: { label: 'Out for delivery', tone: 'info', icon: 'map-pin', description: 'With the delivery partner today.' },
    delivered: { label: 'Delivered', tone: 'success', icon: 'package-check', description: 'Delivered to the shipping address.' },
    cancelled: { label: 'Cancelled', tone: 'danger', icon: 'circle-x', description: 'Cancelled before delivery.' },
  },
  return: {
    requested: { label: 'Return requested', tone: 'warning', icon: 'rotate-ccw', description: 'Waiting for the seller to decide.' },
    approved: { label: 'Approved', tone: 'info', icon: 'circle-check', description: 'Pickup is being scheduled.' },
    rejected: { label: 'Rejected', tone: 'danger', icon: 'circle-x', description: 'The return request was declined.' },
    picked_up: { label: 'Picked up', tone: 'info', icon: 'truck', description: 'Collected and on its way back.' },
    refunded: { label: 'Refunded', tone: 'success', icon: 'circle-check', description: 'Money sent back to the shopper.' },
  },
  payment: {
    pending: { label: 'Pending', tone: 'warning', icon: 'hourglass', description: 'Waiting for the payment to go through.' },
    paid: { label: 'Paid', tone: 'success', icon: 'circle-check', description: 'Payment received in full.' },
    failed: { label: 'Failed', tone: 'danger', icon: 'circle-x', description: 'The bank did not approve this payment.' },
    cod_pending: { label: 'Pay on delivery', tone: 'neutral', icon: 'wallet', description: 'To be collected in cash on delivery.' },
    collected: { label: 'Collected', tone: 'success', icon: 'circle-check', description: 'Cash collected by the delivery partner.' },
    refund_initiated: { label: 'Refund initiated', tone: 'warning', icon: 'hourglass', description: 'Refund sent to the bank, 5 to 7 working days.' },
    refunded: { label: 'Refunded', tone: 'success', icon: 'circle-check', description: 'Refunded to the original payment method.' },
    partially_refunded: { label: 'Partially refunded', tone: 'info', icon: 'rotate-ccw', description: 'Some items were refunded.' },
  },
  seller: {
    draft: { label: 'Draft', tone: 'neutral', icon: 'file-pen', description: 'Application started but not submitted.' },
    under_review: { label: 'Under review', tone: 'warning', icon: 'hourglass', description: 'Waiting for the marketplace team.' },
    action_required: { label: 'Action required', tone: 'warning', icon: 'shield-alert', description: 'Something needs fixing before approval.' },
    active: { label: 'Active', tone: 'success', icon: 'badge-check', description: 'Selling on the marketplace.' },
    suspended: { label: 'Suspended', tone: 'danger', icon: 'ban', description: 'Listings hidden until the issue is resolved.' },
    rejected: { label: 'Rejected', tone: 'danger', icon: 'circle-x', description: 'The application was declined.' },
  },
  kyc: {
    not_submitted: { label: 'Not submitted', tone: 'neutral', icon: 'circle-dot', description: 'The seller has not uploaded this yet.' },
    submitted: { label: 'Submitted', tone: 'info', icon: 'hourglass', description: 'Uploaded and waiting for a check.' },
    verified: { label: 'Verified', tone: 'success', icon: 'shield-check', description: 'Checked and accepted.' },
    needs_attention: { label: 'Needs attention', tone: 'warning', icon: 'shield-alert', description: 'Something does not match.' },
  },
  listing: {
    draft: { label: 'Draft', tone: 'neutral', icon: 'file-pen', description: 'Saved but never submitted.' },
    pending: { label: 'Pending review', tone: 'warning', icon: 'hourglass', description: 'Waiting for catalogue moderation.' },
    live: { label: 'Live', tone: 'success', icon: 'circle-check', description: 'Visible to shoppers.' },
    rejected: { label: 'Rejected', tone: 'danger', icon: 'circle-x', description: 'Fix the listed problems and resubmit.' },
    inactive: { label: 'Inactive', tone: 'neutral', icon: 'archive', description: 'Hidden by the seller.' },
    blocked: { label: 'Blocked', tone: 'danger', icon: 'ban', description: 'Taken down by the marketplace.' },
  },
  stock: {
    in_stock: { label: 'In stock', tone: 'success', icon: 'circle-check' },
    low_stock: { label: 'Low stock', tone: 'warning', icon: 'triangle-alert', description: 'Running out soon.' },
    out_of_stock: { label: 'Out of stock', tone: 'danger', icon: 'circle-x' },
  },
  payout: {
    scheduled: { label: 'Scheduled', tone: 'neutral', icon: 'calendar-clock', description: 'Queued for the next payout run.' },
    processing: { label: 'Processing', tone: 'info', icon: 'hourglass', description: 'Sent to the bank.' },
    paid: { label: 'Paid', tone: 'success', icon: 'circle-check', description: 'Settled to the seller account.' },
    failed: { label: 'Failed', tone: 'danger', icon: 'circle-x', description: 'The bank rejected the transfer.' },
    on_hold: { label: 'On hold', tone: 'warning', icon: 'pause', description: 'Held by the finance team.' },
  },
  coupon: {
    active: { label: 'Active', tone: 'success', icon: 'circle-check' },
    scheduled: { label: 'Scheduled', tone: 'info', icon: 'calendar-clock' },
    paused: { label: 'Paused', tone: 'warning', icon: 'pause' },
    expired: { label: 'Expired', tone: 'neutral', icon: 'clock' },
  },
  review: {
    published: { label: 'Published', tone: 'success', icon: 'circle-check' },
    flagged: { label: 'Flagged', tone: 'warning', icon: 'flag', description: 'Reported and waiting for a decision.' },
    removed: { label: 'Removed', tone: 'danger', icon: 'eye-off', description: 'Hidden from the product page.' },
  },
  customer: {
    active: { label: 'Active', tone: 'success', icon: 'circle-check' },
    blocked: { label: 'Blocked', tone: 'danger', icon: 'ban', description: 'Cannot place new orders.' },
  },
}

const FALLBACK_META: StatusMeta = { label: 'Unknown', tone: 'neutral', icon: 'circle-dot' }

/** Label, tone and icon for one status. Never throws — unknown values fall back to "Unknown". */
export function statusMeta<D extends StatusDomain>(domain: D, status: StatusDomains[D] | string): StatusMeta {
  const map = STATUS_META[domain] as Record<string, StatusMeta | undefined>
  return map[status as string] ?? FALLBACK_META
}

/** `{ value, label }` options for filter menus, in registry order. */
export function statusOptions<D extends StatusDomain>(domain: D): { value: StatusDomains[D]; label: string }[] {
  return Object.entries(STATUS_META[domain]).map(([value, meta]) => ({
    value: value as StatusDomains[D],
    label: (meta as StatusMeta).label,
  }))
}

// ── Transitions ───────────────────────────────────────────────────────────

export interface Transition<S extends string> {
  to: S
  /** Who may move it. Admins can additionally override any shipment status with a note. */
  actors: Actor[]
}

export const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, Transition<ShipmentStatus>[]> = {
  placed: [
    { to: 'confirmed', actors: ['seller', 'admin'] },
    { to: 'cancelled', actors: ['customer', 'seller', 'admin'] },
  ],
  confirmed: [
    { to: 'packed', actors: ['seller', 'admin'] },
    { to: 'cancelled', actors: ['customer', 'seller', 'admin'] },
  ],
  packed: [
    { to: 'shipped', actors: ['seller', 'admin'] },
    { to: 'cancelled', actors: ['seller', 'admin'] },
  ],
  shipped: [{ to: 'out_for_delivery', actors: ['courier', 'system', 'admin'] }],
  out_for_delivery: [{ to: 'delivered', actors: ['courier', 'system', 'admin'] }],
  delivered: [],
  cancelled: [],
}

export const RETURN_TRANSITIONS: Record<ReturnStatus, Transition<ReturnStatus>[]> = {
  requested: [
    { to: 'approved', actors: ['seller', 'admin'] },
    { to: 'rejected', actors: ['seller', 'admin'] },
  ],
  approved: [{ to: 'picked_up', actors: ['courier', 'system', 'seller', 'admin'] }],
  picked_up: [{ to: 'refunded', actors: ['system', 'admin'] }],
  rejected: [],
  refunded: [],
}

const TRANSITIONS = {
  shipment: SHIPMENT_TRANSITIONS,
  return: RETURN_TRANSITIONS,
} as const

export type TransitionDomain = keyof typeof TRANSITIONS

/** May `actor` move this record from `from` to `to`? */
export function canTransition<D extends TransitionDomain>(
  domain: D,
  from: StatusDomains[D],
  to: StatusDomains[D],
  actor: Actor,
): boolean {
  const rows = (TRANSITIONS[domain] as Record<string, Transition<string>[] | undefined>)[from] ?? []
  return rows.some((row) => row.to === to && row.actors.includes(actor))
}

/** The statuses an actor can move a record to right now. */
export function allowedTransitions<D extends TransitionDomain>(
  domain: D,
  from: StatusDomains[D],
  actor: Actor,
): StatusDomains[D][] {
  const rows = (TRANSITIONS[domain] as Record<string, Transition<string>[] | undefined>)[from] ?? []
  return rows.filter((row) => row.actors.includes(actor)).map((row) => row.to as StatusDomains[D])
}

/** Progress order for trackers and timelines (cancelled sits outside the line). */
export const SHIPMENT_PROGRESS: readonly ShipmentStatus[] = [
  'placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered',
]

export const RETURN_PROGRESS: readonly ReturnStatus[] = ['requested', 'approved', 'picked_up', 'refunded']

export function isTerminalShipmentStatus(status: ShipmentStatus): boolean {
  return status === 'delivered' || status === 'cancelled'
}

/** Shipments a seller still has to act on. */
export function isOpenShipmentStatus(status: ShipmentStatus): boolean {
  return status === 'placed' || status === 'confirmed' || status === 'packed'
}

/** The next status in the fulfilment line, or null at the end of it. */
export const NEXT_SHIPMENT_STATUS: Partial<Record<ShipmentStatus, ShipmentStatus>> = {
  placed: 'confirmed',
  confirmed: 'packed',
  packed: 'shipped',
  shipped: 'out_for_delivery',
  out_for_delivery: 'delivered',
}

/** The seller's stage action: "Confirm", "Mark as packed", "Hand over", or null. */
export function nextShipmentAction(status: ShipmentStatus): string | null {
  switch (status) {
    case 'placed':
      return 'Confirm'
    case 'confirmed':
      return 'Mark as packed'
    case 'packed':
      return 'Hand over'
    default:
      return null
  }
}

// ── Seller order tabs ─────────────────────────────────────────────────────

export type SellerOrderTabId =
  | 'new' | 'to_pack' | 'ready_to_ship' | 'in_transit' | 'delivered' | 'cancelled' | 'returns'

export interface SellerOrderTab {
  id: SellerOrderTabId
  label: string
  /** Shipment statuses in this tab. Empty for `returns`, which filters on `returnId`. */
  statuses: ShipmentStatus[]
  /** The returns tab holds shipments with a return, whatever their status. */
  returnsOnly?: boolean
  /** Empty-state line for this tab. */
  emptyLine: string
}

export const SELLER_ORDER_TABS: readonly SellerOrderTab[] = [
  { id: 'new', label: 'New', statuses: ['placed'], emptyLine: 'No new orders waiting to be confirmed.' },
  { id: 'to_pack', label: 'To pack', statuses: ['confirmed'], emptyLine: 'Nothing to pack right now.' },
  { id: 'ready_to_ship', label: 'Ready to ship', statuses: ['packed'], emptyLine: 'No packed orders waiting for the courier.' },
  { id: 'in_transit', label: 'In transit', statuses: ['shipped', 'out_for_delivery'], emptyLine: 'Nothing is on its way at the moment.' },
  { id: 'delivered', label: 'Delivered', statuses: ['delivered'], emptyLine: 'No deliveries in this period.' },
  { id: 'cancelled', label: 'Cancelled', statuses: ['cancelled'], emptyLine: 'No cancelled orders — nicely done.' },
  { id: 'returns', label: 'Returns', statuses: [], returnsOnly: true, emptyLine: 'No return requests to handle.' },
]

export function sellerOrderTab(id: string): SellerOrderTab | undefined {
  return SELLER_ORDER_TABS.find((tab) => tab.id === id)
}

// ── Order summary ─────────────────────────────────────────────────────────

/**
 * A customer order has no status of its own — it summarises its shipments:
 * "Delivered", "1 of 2 delivered", "2 shipments in progress", "Cancelled".
 */
export function deriveOrderSummary(
  shipments: readonly { status: ShipmentStatus }[],
): { label: string; tone: StatusTone } {
  if (shipments.length === 0) return { label: 'No shipments', tone: 'neutral' }
  const total = shipments.length
  let delivered = 0
  let cancelled = 0
  for (const shipment of shipments) {
    if (shipment.status === 'delivered') delivered += 1
    else if (shipment.status === 'cancelled') cancelled += 1
  }
  if (cancelled === total) return { label: 'Cancelled', tone: 'danger' }
  if (delivered === total) return { label: 'Delivered', tone: 'success' }
  if (delivered > 0) return { label: `${delivered} of ${total} delivered`, tone: 'info' }
  if (total === 1) {
    const only = shipments[0]
    const meta = statusMeta('shipment', only ? only.status : 'placed')
    return { label: meta.label, tone: meta.tone }
  }
  const open = total - cancelled
  return { label: `${open} shipments in progress`, tone: 'info' }
}

/** Stock badge for a quantity, given the variant's low-stock threshold. */
export function stockStatus(stock: number, lowStockAt = 5): StockStatus {
  if (stock <= 0) return 'out_of_stock'
  return stock <= lowStockAt ? 'low_stock' : 'in_stock'
}

// ── Timelines ─────────────────────────────────────────────────────────────

/** Icon for every event a shipment timeline can carry. */
export const TIMELINE_ICON: Record<TimelineCode, StatusIconKey> = {
  placed: 'circle-dot',
  confirmed: 'circle-check',
  packed: 'package',
  shipped: 'truck',
  out_for_delivery: 'map-pin',
  delivered: 'package-check',
  cancelled: 'circle-x',
  return_requested: 'rotate-ccw',
  return_approved: 'circle-check',
  return_rejected: 'circle-x',
  return_picked_up: 'truck',
  refunded: 'wallet',
  note: 'file-pen',
}

// ── Payment methods ───────────────────────────────────────────────────────

export const PAYMENT_METHOD_META: Record<PaymentMethod, { label: string; short: string }> = {
  upi: { label: 'UPI', short: 'UPI' },
  card: { label: 'Credit or debit card', short: 'Card' },
  emi: { label: 'EMI', short: 'EMI' },
  netbanking: { label: 'Net banking', short: 'Net banking' },
  wallet: { label: 'Wallet', short: 'Wallet' },
  cod: { label: 'Cash on delivery', short: 'COD' },
}

/** Everything except COD is collected before dispatch. */
export function isPrepaid(method: PaymentMethod): boolean {
  return method !== 'cod'
}
