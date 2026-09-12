// Fixed points the whole demo hangs off: "now", the PRNG seed, the demo personas,
// platform settings, Indian states with their GST codes and a PIN code lookup.
//
// Everything here is synthetic. GSTINs, PANs, IFSC codes and phone numbers are
// format-valid but belong to nobody.

import type { ISODate, PlatformSettings } from './types'

// ── Now ───────────────────────────────────────────────────────────────────

/** IST is a fixed +05:30 offset — no daylight saving, so plain arithmetic is safe. */
export const IST_OFFSET_MINUTES = 330
export const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60_000
export const IST_SUFFIX = '+05:30'

function todayAt1030Ist(): string {
  const ist = new Date(Date.now() + IST_OFFSET_MS)
  const day = ist.toISOString().slice(0, 10)
  return `${day}T10:30:00${IST_SUFFIX}`
}

function resolveDemoNow(): string {
  const override = import.meta.env.VITE_DEMO_NOW
  if (override) {
    const parsed = new Date(override)
    if (!Number.isNaN(parsed.getTime())) return override
  }
  return todayAt1030Ist()
}

/**
 * "Now" for every synthetic record — today at 10:30 IST, computed once at module load
 * so renders stay pure (the react-hooks compiler rules flag `Date.now()` during render).
 * Override with `VITE_DEMO_NOW` to pin the data for screenshots.
 */
export const DEMO_NOW: ISODate = resolveDemoNow()
export const DEMO_NOW_MS = new Date(DEMO_NOW).getTime()
export const DEMO_NOW_DATE = new Date(DEMO_NOW_MS)

/** Seed for every generator. Change it and the whole marketplace regenerates. */
export const SEED = 20260912

// ── Demo personas ─────────────────────────────────────────────────────────

export const DEMO = {
  /** Priya Nair, Kochi — the shopper every storefront screen opens as. */
  customerId: 'cus_priya',
  /** Orbit Mobiles Hub — the default Seller Hub persona. */
  sellerId: 'sel_orbit',
  /** Rangrez Threads — the second seller in the showcase order. */
  sellerAltId: 'sel_rangrez',
  /** Chai & Crumbs Co. — an application waiting for approval. */
  sellerPendingId: 'sel_chai',
  adminId: 'adm_super',
  /** The showcase order: two sellers, two stages, one coupon. */
  orderId: 'ORD-482193',
  /** The product every demo path points at; it always carries written reviews. */
  productId: 'prd_voltix_nova_5g',
} as const

export const DEMO_OTP = '123456'
/** Typing this VPA (or a card ending 0002) makes the mock payment fail. */
export const FAILING_VPA = 'fail@demo'
export const FAILING_CARD_SUFFIX = '0002'
export const COURIER_NAME = 'DemoShip'

// ── Platform settings ─────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: PlatformSettings = {
  marketplaceName: 'Chowk',
  supportEmail: 'help@chowk.example',
  freeDeliveryThreshold: 499,
  deliveryFee: 40,
  expressFee: 99,
  codLimit: 50_000,
  codFee: 0,
  defaultReturnDays: 7,
  fixedFee: 30,
  shippingFeePerShipment: 65,
  gstOnFeesPct: 18,
  tcsPct: 0.5,
  tdsPct: 0.1,
  payoutDelayDays: 7,
  unserviceablePins: ['744301', '744302', '796321', '190011'],
}

/** Maximum units of one variant a shopper may add to the cart. */
export const MAX_QTY_PER_LINE = 5
/** Express delivery lands this many days earlier than standard (floor 1 day). */
export const EXPRESS_DAYS_SAVED = 2

// ── States ────────────────────────────────────────────────────────────────

export interface IndianState {
  code: string
  name: string
  /** Coarse zone used to estimate delivery time between two states. */
  zone: 'north' | 'south' | 'east' | 'west' | 'central' | 'northeast'
}

export const STATES: readonly IndianState[] = [
  { code: '01', name: 'Jammu & Kashmir', zone: 'north' },
  { code: '02', name: 'Himachal Pradesh', zone: 'north' },
  { code: '03', name: 'Punjab', zone: 'north' },
  { code: '04', name: 'Chandigarh', zone: 'north' },
  { code: '05', name: 'Uttarakhand', zone: 'north' },
  { code: '06', name: 'Haryana', zone: 'north' },
  { code: '07', name: 'Delhi', zone: 'north' },
  { code: '08', name: 'Rajasthan', zone: 'north' },
  { code: '09', name: 'Uttar Pradesh', zone: 'central' },
  { code: '10', name: 'Bihar', zone: 'east' },
  { code: '11', name: 'Sikkim', zone: 'northeast' },
  { code: '12', name: 'Arunachal Pradesh', zone: 'northeast' },
  { code: '13', name: 'Nagaland', zone: 'northeast' },
  { code: '14', name: 'Manipur', zone: 'northeast' },
  { code: '15', name: 'Mizoram', zone: 'northeast' },
  { code: '16', name: 'Tripura', zone: 'northeast' },
  { code: '17', name: 'Meghalaya', zone: 'northeast' },
  { code: '18', name: 'Assam', zone: 'northeast' },
  { code: '19', name: 'West Bengal', zone: 'east' },
  { code: '20', name: 'Jharkhand', zone: 'east' },
  { code: '21', name: 'Odisha', zone: 'east' },
  { code: '22', name: 'Chhattisgarh', zone: 'central' },
  { code: '23', name: 'Madhya Pradesh', zone: 'central' },
  { code: '24', name: 'Gujarat', zone: 'west' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu', zone: 'west' },
  { code: '27', name: 'Maharashtra', zone: 'west' },
  { code: '29', name: 'Karnataka', zone: 'south' },
  { code: '30', name: 'Goa', zone: 'west' },
  { code: '31', name: 'Lakshadweep', zone: 'south' },
  { code: '32', name: 'Kerala', zone: 'south' },
  { code: '33', name: 'Tamil Nadu', zone: 'south' },
  { code: '34', name: 'Puducherry', zone: 'south' },
  { code: '35', name: 'Andaman & Nicobar Islands', zone: 'east' },
  { code: '36', name: 'Telangana', zone: 'south' },
  { code: '37', name: 'Andhra Pradesh', zone: 'south' },
  { code: '38', name: 'Ladakh', zone: 'north' },
]

const STATE_BY_CODE = new Map(STATES.map((state) => [state.code, state]))

export function stateByCode(code: string): IndianState | null {
  return STATE_BY_CODE.get(code) ?? null
}

export function stateNameByCode(code: string): string {
  return STATE_BY_CODE.get(code)?.name ?? 'India'
}

/** Same state → 0, same zone → 1, otherwise 2. Feeds the delivery estimate. */
export function stateDistance(fromCode: string, toCode: string): 0 | 1 | 2 {
  if (fromCode === toCode) return 0
  const from = STATE_BY_CODE.get(fromCode)
  const to = STATE_BY_CODE.get(toCode)
  if (from && to && from.zone === to.zone) return 1
  return 2
}

// ── PIN codes ─────────────────────────────────────────────────────────────

export interface PinInfo {
  city?: string
  state: string
  stateCode: string
}

/** Real-format PIN codes for the cities the demo ships to. */
export const PIN_TABLE: Readonly<Record<string, { city: string; stateCode: string }>> = {
  '110001': { city: 'New Delhi', stateCode: '07' },
  '110017': { city: 'New Delhi', stateCode: '07' },
  '110092': { city: 'New Delhi', stateCode: '07' },
  '122018': { city: 'Gurugram', stateCode: '06' },
  '132103': { city: 'Panipat', stateCode: '06' },
  '141001': { city: 'Ludhiana', stateCode: '03' },
  '143001': { city: 'Amritsar', stateCode: '03' },
  '144001': { city: 'Jalandhar', stateCode: '03' },
  '160017': { city: 'Chandigarh', stateCode: '04' },
  '171001': { city: 'Shimla', stateCode: '02' },
  '180001': { city: 'Jammu', stateCode: '01' },
  '201301': { city: 'Noida', stateCode: '09' },
  '208001': { city: 'Kanpur', stateCode: '09' },
  '226010': { city: 'Lucknow', stateCode: '09' },
  '248001': { city: 'Dehradun', stateCode: '05' },
  '282001': { city: 'Agra', stateCode: '09' },
  '302001': { city: 'Jaipur', stateCode: '08' },
  '302015': { city: 'Jaipur', stateCode: '08' },
  '342001': { city: 'Jodhpur', stateCode: '08' },
  '360001': { city: 'Rajkot', stateCode: '24' },
  '370001': { city: 'Bhuj', stateCode: '24' },
  '380015': { city: 'Ahmedabad', stateCode: '24' },
  '395003': { city: 'Surat', stateCode: '24' },
  '400001': { city: 'Mumbai', stateCode: '27' },
  '400050': { city: 'Mumbai', stateCode: '27' },
  '400706': { city: 'Navi Mumbai', stateCode: '27' },
  '403001': { city: 'Panaji', stateCode: '30' },
  '411001': { city: 'Pune', stateCode: '27' },
  '411045': { city: 'Pune', stateCode: '27' },
  '440001': { city: 'Nagpur', stateCode: '27' },
  '452001': { city: 'Indore', stateCode: '23' },
  '462001': { city: 'Bhopal', stateCode: '23' },
  '495001': { city: 'Bilaspur', stateCode: '22' },
  '500081': { city: 'Hyderabad', stateCode: '36' },
  '500034': { city: 'Hyderabad', stateCode: '36' },
  '520010': { city: 'Vijayawada', stateCode: '37' },
  '530003': { city: 'Visakhapatnam', stateCode: '37' },
  '560001': { city: 'Bengaluru', stateCode: '29' },
  '560034': { city: 'Bengaluru', stateCode: '29' },
  '560103': { city: 'Bengaluru', stateCode: '29' },
  '575001': { city: 'Mangaluru', stateCode: '29' },
  '600001': { city: 'Chennai', stateCode: '33' },
  '600040': { city: 'Chennai', stateCode: '33' },
  '605001': { city: 'Puducherry', stateCode: '34' },
  '641001': { city: 'Coimbatore', stateCode: '33' },
  '641601': { city: 'Tiruppur', stateCode: '33' },
  '673001': { city: 'Kozhikode', stateCode: '32' },
  '682016': { city: 'Kochi', stateCode: '32' },
  '682020': { city: 'Kochi', stateCode: '32' },
  '695001': { city: 'Thiruvananthapuram', stateCode: '32' },
  '700001': { city: 'Kolkata', stateCode: '19' },
  '700019': { city: 'Kolkata', stateCode: '19' },
  '734001': { city: 'Siliguri', stateCode: '19' },
  '737101': { city: 'Gangtok', stateCode: '11' },
  '744301': { city: 'Mayabunder', stateCode: '35' },
  '751001': { city: 'Bhubaneswar', stateCode: '21' },
  '781005': { city: 'Guwahati', stateCode: '18' },
  '793001': { city: 'Shillong', stateCode: '17' },
  '795001': { city: 'Imphal', stateCode: '14' },
  '800001': { city: 'Patna', stateCode: '10' },
  '834001': { city: 'Ranchi', stateCode: '20' },
}

/** Two-digit PIN prefix → GST state code, for PINs outside the table. */
const PIN_PREFIX_STATE: Readonly<Record<string, string>> = {
  '11': '07', '12': '06', '13': '06', '14': '03', '15': '03', '16': '04', '17': '02',
  '18': '01', '19': '01', '20': '09', '21': '09', '22': '09', '23': '09', '24': '09',
  '25': '09', '26': '05', '27': '09', '28': '09', '30': '08', '31': '08', '32': '08',
  '33': '08', '34': '08', '36': '24', '37': '24', '38': '24', '39': '24', '40': '27',
  '41': '27', '42': '27', '43': '27', '44': '27', '45': '23', '46': '23', '47': '23',
  '48': '23', '49': '22', '50': '36', '51': '37', '52': '37', '53': '37', '56': '29',
  '57': '29', '58': '29', '59': '29', '60': '33', '61': '33', '62': '33', '63': '33',
  '64': '33', '67': '32', '68': '32', '69': '32', '70': '19', '71': '19', '72': '19',
  '73': '19', '74': '19', '75': '21', '76': '21', '77': '21', '78': '18', '79': '16',
  '80': '10', '81': '10', '82': '10', '83': '20', '84': '10', '85': '10',
}

const PIN_RE = /^[1-9]\d{5}$/

/** City, state and GST state code for a PIN code, or null if it isn't a valid PIN. */
export function lookupPin(pin: string): PinInfo | null {
  if (!PIN_RE.test(pin)) return null
  const exact = PIN_TABLE[pin]
  if (exact) return { city: exact.city, state: stateNameByCode(exact.stateCode), stateCode: exact.stateCode }
  const prefix = PIN_PREFIX_STATE[pin.slice(0, 2)]
  if (!prefix) return null
  return { state: stateNameByCode(prefix), stateCode: prefix }
}

/** Every PIN the demo knows a city for — used to place generated shoppers. */
export const KNOWN_PINS: readonly string[] = Object.keys(PIN_TABLE)
