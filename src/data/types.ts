// The data contract every portal depends on. All records are synthetic.
// Money is in whole rupees unless a field says otherwise (settlements carry paise as decimals).

import type { ImageId, MediaRef } from './images'

export type ID = string
/** ISO-8601 timestamp, e.g. "2026-09-12T10:30:00+05:30". */
export type ISODate = string
/** Calendar day in IST, "YYYY-MM-DD". */
export type DayKey = string
export type Rupees = number

export type Portal = 'customer' | 'seller' | 'admin'
export type Actor = 'customer' | 'seller' | 'admin' | 'system' | 'courier'

// ── Catalogue ─────────────────────────────────────────────────────────────

export type GstRate = 0 | 5 | 18 | 40

/** Lucide icon key; the UI maps keys to components (components/icons/category-icons.ts). */
export type CategoryIconKey =
  | 'smartphone' | 'headphones' | 'shirt' | 'footprints' | 'cooking-pot' | 'sparkles'
  | 'dumbbell' | 'book-open' | 'toy-brick' | 'shopping-basket' | 'laptop' | 'watch'
  | 'camera' | 'speaker' | 'sofa' | 'lamp' | 'gem' | 'backpack' | 'baby' | 'coffee' | 'tag'

export interface FacetDef {
  key: string
  label: string
  /** Where the value comes from: a variant option axis or a spec label. */
  source: { kind: 'axis'; axis: VariantAxis } | { kind: 'spec'; label: string }
}

export interface Category {
  id: ID
  slug: string
  name: string
  /** null for top-level categories. Products always point at a leaf. */
  parentId: ID | null
  icon: CategoryIconKey
  image: ImageId | null
  description: string
  gstRate: GstRate
  hsnDefault: string
  commissionPct: number
  returnDays: number
  /** Category-specific filters shown on listing pages (RAM, size, language…). */
  facets: FacetDef[]
  sortOrder: number
}

export type VariantAxis = 'colour' | 'size' | 'storage' | 'pack'

export interface Variant {
  id: ID
  sku: string
  /** e.g. { colour: 'Midnight Teal', storage: '128 GB' } */
  options: Partial<Record<VariantAxis, string>>
  mrp: Rupees
  price: Rupees
  stock: number
  lowStockAt: number
  active: boolean
  /** Colour variants may carry their own photos. */
  media?: MediaRef[]
}

/** Display colour for a colour option (content data, not a design token). */
export interface ColourSwatch {
  name: string
  hex: string
}

export interface SpecGroup {
  group: string
  items: { label: string; value: string }[]
}

export type ProductStatus = 'draft' | 'pending' | 'live' | 'rejected' | 'inactive' | 'blocked'
export type ProductTag = 'bestseller' | 'new' | 'deal'

/** Books get an authored typographic cover instead of a photo. */
export interface BookCover {
  title: string
  subtitle?: string
  author: string
  style: 'ink' | 'monsoon' | 'saffron' | 'forest' | 'rose'
}

export interface ProductOffer {
  sellerId: ID
  price: Rupees
  mrp: Rupees
  stock: number
  dispatchDays: number
}

export interface Rating {
  avg: number
  count: number
  /** Counts for 5★, 4★, 3★, 2★, 1★ in that order. */
  dist: [number, number, number, number, number]
}

export interface ModerationInfo {
  submittedAt?: ISODate
  reviewedAt?: ISODate
  reviewerId?: ID
  /** Rejection or block reason, shown to the seller verbatim. */
  reason?: string
  /** Human-readable list of what changed since the last approval. */
  changes?: string[]
}

export interface Product {
  id: ID
  slug: string
  title: string
  brand: string
  /** Leaf category id. */
  categoryId: ID
  /** The seller that owns the listing (and wins the buy box). */
  sellerId: ID
  /** Other sellers offering the same product (multi-seller listings). */
  otherOffers: ProductOffer[]
  description: string
  highlights: string[]
  specs: SpecGroup[]
  media: MediaRef[]
  cover?: BookCover
  axes: VariantAxis[]
  /** Always at least one; single-SKU products have one variant with empty options. */
  variants: Variant[]
  swatches?: ColourSwatch[]
  rating: Rating
  tags: ProductTag[]
  dealEndsAt?: ISODate
  returnDays: number
  cod: boolean
  status: ProductStatus
  hsn: string
  gstRate: GstRate
  dispatchDays: number
  weightKg: number
  dimensionsCm: [number, number, number]
  countryOfOrigin: string
  manufacturer: string
  warranty?: string
  keywords: string[]
  createdAt: ISODate
  updatedAt: ISODate
  moderation?: ModerationInfo
}

// ── People ────────────────────────────────────────────────────────────────

export interface Address {
  id: ID
  name: string
  phone: string
  line1: string
  line2?: string
  landmark?: string
  city: string
  state: string
  /** GST state code, e.g. "32" for Kerala. */
  stateCode: string
  pin: string
  type: 'home' | 'work' | 'other'
}

export type SavedPayment =
  | { id: ID; kind: 'upi'; vpa: string; isDefault: boolean }
  | { id: ID; kind: 'card'; network: 'visa' | 'mastercard' | 'rupay' | 'amex'; last4: string; expiry: string; nameOnCard: string; isDefault: boolean }

export type CustomerStatus = 'active' | 'blocked'

export interface Customer {
  id: ID
  name: string
  email: string
  phone: string
  joinedAt: ISODate
  status: CustomerStatus
  statusReason?: string
  addresses: Address[]
  defaultAddressId: ID | null
  savedPayments: SavedPayment[]
}

export type SellerStatus = 'draft' | 'under_review' | 'action_required' | 'active' | 'suspended' | 'rejected'
export type KycKey = 'pan' | 'gstin' | 'bank' | 'address' | 'signature' | 'cheque'
export type KycStatus = 'not_submitted' | 'submitted' | 'verified' | 'needs_attention'

export interface KycItem {
  key: KycKey
  label: string
  status: KycStatus
  /** e.g. "Name matches PAN records" or the reason it needs attention. */
  note?: string
  /** Document preview label (documents are illustrated placeholders). */
  document?: string
  required: boolean
}

export interface Seller {
  id: ID
  slug: string
  displayName: string
  legalName: string
  ownerName: string
  email: string
  phone: string
  /** null for PAN-only sellers (e.g. books). */
  gstin: string | null
  pan: string
  city: string
  state: string
  stateCode: string
  pickupAddress: Address
  joinedAt: ISODate
  status: SellerStatus
  /** Reason / admin message for action_required, suspended or rejected. */
  statusReason?: string
  kyc: KycItem[]
  rating: number | null
  ratingCount: number
  /** Top-level category ids the seller trades in. */
  categoryIds: ID[]
  tier: 'bronze' | 'silver' | 'gold'
  bank: { accountName: string; bankName: string; ifsc: string; last4: string; verified: boolean }
  tagline: string
  about: string
  policies: { returns: string; shipping: string }
  holiday?: { from: ISODate; to: ISODate }
  submittedAt?: ISODate
}

// ── Orders, shipments, payments, returns ───────────────────────────────────

export type ShipmentStatus = 'placed' | 'confirmed' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled'
export type CancelledBy = 'customer' | 'seller' | 'platform'

export type PaymentMethod = 'upi' | 'card' | 'emi' | 'netbanking' | 'wallet' | 'cod'
export type PaymentStatus =
  | 'pending' | 'paid' | 'failed' | 'cod_pending' | 'collected'
  | 'refund_initiated' | 'refunded' | 'partially_refunded'

export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'picked_up' | 'refunded'

export type TimelineCode =
  | ShipmentStatus
  | 'return_requested' | 'return_approved' | 'return_rejected' | 'return_picked_up' | 'refunded'
  | 'note'

export interface TimelineEvent {
  id: ID
  at: ISODate
  code: TimelineCode
  /** Human label, e.g. "Handed over to DemoShip". */
  label: string
  actor: Actor
  location?: string
  note?: string
}

export interface OrderItem {
  id: ID
  orderId: ID
  shipmentId: ID
  sellerId: ID
  productId: ID
  variantId: ID
  /** Snapshot at purchase time. */
  title: string
  variantLabel: string
  image: MediaRef
  qty: number
  mrp: Rupees
  price: Rupees
  gstRate: GstRate
  hsn: string
}

export interface ShipmentTotals {
  mrp: Rupees
  price: Rupees
  shipping: Rupees
  /** This shipment's share of the order coupon. */
  coupon: Rupees
  total: Rupees
}

export interface Shipment {
  /** `${orderId}-${n}`, e.g. "ORD-482193-1" — the unit of fulfilment shared by all portals. */
  id: ID
  orderId: ID
  sellerId: ID
  itemIds: ID[]
  status: ShipmentStatus
  cancelledBy?: CancelledBy
  cancelReason?: string
  /** Dispatch deadline for the seller. */
  slaDueAt: ISODate
  /** Delivery date promised to the customer. */
  promisedBy: ISODate
  deliveredAt?: ISODate
  courier?: string
  awb?: string
  package?: { weightKg: number; dimensionsCm: [number, number, number] }
  events: TimelineEvent[]
  totals: ShipmentTotals
  returnId?: ID
  payoutId?: ID
}

export interface Refund {
  id: ID
  amount: Rupees
  at: ISODate
  status: 'initiated' | 'processed'
  reason: string
}

export interface Payment {
  id: ID
  method: PaymentMethod
  status: PaymentStatus
  amount: Rupees
  /** Synthetic gateway reference, e.g. "UPI/426183920145". */
  txnRef: string
  /** Masked instrument, e.g. "priya.n@okdemo" or "Visa •••• 4242". */
  detail: string
  paidAt?: ISODate
  failureReason?: string
  refunds: Refund[]
}

export interface OrderTotals {
  mrp: Rupees
  /** MRP − price across items. */
  discount: Rupees
  coupon: Rupees
  shipping: Rupees
  codFee: Rupees
  total: Rupees
}

export interface Order {
  /** e.g. "ORD-482193" */
  id: ID
  customerId: ID
  placedAt: ISODate
  shipTo: Address
  billing?: { gstin: string; businessName: string }
  payment: Payment
  couponCode?: string
  couponFundedBy?: 'platform' | 'seller'
  shipmentIds: ID[]
  totals: OrderTotals
  notes: { id: ID; at: ISODate; by: string; text: string }[]
}

export interface ReturnRequest {
  id: ID
  orderId: ID
  shipmentId: ID
  itemIds: ID[]
  reason: string
  details?: string
  status: ReturnStatus
  requestedAt: ISODate
  decidedAt?: ISODate
  pickedUpAt?: ISODate
  refundedAt?: ISODate
  refundAmount: Rupees
  refundTo: 'source' | 'upi'
  rejectionReason?: string
  escalated?: boolean
}

// ── Reviews ───────────────────────────────────────────────────────────────

export type ReviewStatus = 'published' | 'flagged' | 'removed'

export interface Review {
  id: ID
  productId: ID
  customerId: ID
  sellerId: ID
  rating: 1 | 2 | 3 | 4 | 5
  title: string
  body: string
  createdAt: ISODate
  verified: boolean
  helpful: number
  photos: ImageId[]
  status: ReviewStatus
  flagReason?: string
  sellerReply?: { body: string; at: ISODate }
}

// ── Money out ─────────────────────────────────────────────────────────────

export type PayoutStatus = 'scheduled' | 'processing' | 'paid' | 'failed' | 'on_hold'

export interface PayoutLine {
  kind: 'sale' | 'commission' | 'fixed_fee' | 'shipping_fee' | 'gst_on_fees' | 'tcs' | 'tds' | 'refund' | 'adjustment'
  label: string
  /** Signed amount with paise precision (two decimals). */
  amount: number
}

export interface Payout {
  id: ID
  sellerId: ID
  periodStart: DayKey
  periodEnd: DayKey
  scheduledFor: DayKey
  paidAt?: ISODate
  status: PayoutStatus
  holdReason?: string
  /** Synthetic bank reference once paid. */
  utr?: string
  shipmentIds: ID[]
  lines: PayoutLine[]
  gross: number
  net: number
}

export type CouponStatus = 'active' | 'scheduled' | 'paused' | 'expired'

export interface Coupon {
  code: string
  title: string
  description: string
  kind: 'flat' | 'percent'
  value: number
  maxDiscount?: Rupees
  minOrder: Rupees
  categoryIds?: ID[]
  firstOrderOnly?: boolean
  prepaidOnly?: boolean
  fundedBy: 'platform' | 'seller'
  sellerId?: ID
  startsAt: ISODate
  endsAt: ISODate
  usageLimit?: number
  used: number
  paused?: boolean
}

// ── Platform ──────────────────────────────────────────────────────────────

export interface Notification {
  id: ID
  portal: Portal
  audienceId: ID
  kind: 'order' | 'shipment' | 'payout' | 'review' | 'stock' | 'kyc' | 'listing' | 'system' | 'promo'
  title: string
  body: string
  at: ISODate
  href?: string
  read: boolean
}

export type PermissionResource = 'orders' | 'products' | 'sellers' | 'users' | 'payouts' | 'coupons' | 'reviews' | 'reports' | 'settings'
export type PermissionAction = 'view' | 'edit' | 'approve'
export type Permission = `${PermissionResource}:${PermissionAction}`

export interface Role {
  id: ID
  name: string
  description: string
  permissions: Permission[]
}

export interface AdminUser {
  id: ID
  name: string
  email: string
  roleId: ID
  status: 'active' | 'invited'
  lastActiveAt: ISODate
}

export interface AuditEntry {
  id: ID
  at: ISODate
  actor: Actor
  actorName: string
  action: string
  targetType: 'order' | 'shipment' | 'seller' | 'product' | 'review' | 'coupon' | 'payout' | 'customer' | 'settings'
  targetId: ID
  summary: string
}

export interface PlatformSettings {
  marketplaceName: string
  supportEmail: string
  freeDeliveryThreshold: Rupees
  deliveryFee: Rupees
  expressFee: Rupees
  codLimit: Rupees
  codFee: Rupees
  defaultReturnDays: number
  /** Settlement parameters (percentages, e.g. 0.5 means 0.5 %). */
  fixedFee: Rupees
  shippingFeePerShipment: Rupees
  gstOnFeesPct: number
  tcsPct: number
  tdsPct: number
  payoutDelayDays: number
  /** PIN codes the demo treats as not serviceable. */
  unserviceablePins: string[]
}

export interface DailyMetric {
  day: DayKey
  gmv: Rupees
  orders: number
  units: number
  visitors: number
  refunds: Rupees
  newCustomers: number
}

// ── Reporting helpers ─────────────────────────────────────────────────────

export type RangePreset = 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'mtd'

export interface DateRange {
  from: DayKey
  to: DayKey
  preset?: RangePreset
}

export type KpiFormat = 'inr' | 'number' | 'percent' | 'rating'

export interface Kpi {
  key: string
  label: string
  value: number
  previous: number
  format: KpiFormat
  /** false for metrics where going down is good (return rate, cancellations). */
  positiveIsGood: boolean
  sparkline?: number[]
  href?: string
}

export interface SeriesPoint {
  day: DayKey
  [series: string]: number | string
}

/** Generic paged result returned by list selectors. */
export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
