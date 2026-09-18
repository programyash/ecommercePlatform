// Format checks only — nothing here talks to a bank, a PAN database or the GST portal.
// Every schema doubles as a plain predicate so non-form code (the PIN chip, the UPI
// verify button, the payment simulator) can reuse the same rules.

import { z } from 'zod'
import { DEMO_NOW, lookupPin } from '@/data/constants'

// ── Patterns ──────────────────────────────────────────────────────────────

export const PIN_RE = /^[1-9]\d{5}$/
export const MOBILE_RE = /^[6-9]\d{9}$/
export const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
export const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/
export const VPA_RE = /^[\w.-]{2,}@[a-z]{2,}$/
export const OTP_RE = /^\d{6}$/
export const HSN_RE = /^\d{4,8}$/

// ── Predicates ────────────────────────────────────────────────────────────

export function isValidPin(value: string): boolean {
  return PIN_RE.test(value)
}

/** A PIN we can both parse and place on the map. */
export function isKnownPin(value: string): boolean {
  return lookupPin(value) !== null
}

export function isValidMobile(value: string): boolean {
  return MOBILE_RE.test(value)
}

export function isValidGstin(value: string): boolean {
  return GSTIN_RE.test(value)
}

export function isValidPan(value: string): boolean {
  return PAN_RE.test(value)
}

export function isValidIfsc(value: string): boolean {
  return IFSC_RE.test(value)
}

export function isValidVpa(value: string): boolean {
  return VPA_RE.test(value)
}

/** GST state code carried by a GSTIN, e.g. "27AAECR1234F1ZP" → "27". */
export function gstinStateCode(gstin: string): string | null {
  return isValidGstin(gstin) ? gstin.slice(0, 2) : null
}

/** The PAN embedded in a GSTIN (characters 3–12). */
export function gstinPan(gstin: string): string | null {
  return isValidGstin(gstin) ? gstin.slice(2, 12) : null
}

// ── Cards ─────────────────────────────────────────────────────────────────

export type CardNetwork = 'visa' | 'mastercard' | 'rupay' | 'amex' | 'unknown'

/** Luhn checksum — catches typos, proves nothing about the account. */
export function luhnCheck(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '')
  if (digits.length < 12 || digits.length > 19) return false
  let sum = 0
  let double = false
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = digits.charCodeAt(index) - 48
    if (digit < 0 || digit > 9) return false
    if (double) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    double = !double
  }
  return sum % 10 === 0
}

/** Network from the leading digits, the way a checkout page detects it while typing. */
export function cardNetwork(cardNumber: string): CardNetwork {
  const digits = cardNumber.replace(/\D/g, '')
  if (digits.length === 0) return 'unknown'
  if (digits.startsWith('4')) return 'visa'
  if (/^3[47]/.test(digits)) return 'amex'
  if (/^(508|60|65|81|82)/.test(digits)) return 'rupay'
  if (/^5[1-5]/.test(digits)) return 'mastercard'
  const prefix4 = Number(digits.slice(0, 4))
  if (digits.length >= 4 && prefix4 >= 2221 && prefix4 <= 2720) return 'mastercard'
  return 'unknown'
}

export const CARD_NETWORK_LABEL: Record<CardNetwork, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  rupay: 'RuPay',
  amex: 'American Express',
  unknown: 'Card',
}

/** Amex cards are 15 digits; everything else here is 16. */
export function cardNumberLength(network: CardNetwork): number {
  return network === 'amex' ? 15 : 16
}

export function isValidCardNumber(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  const network = cardNetwork(digits)
  if (network !== 'unknown' && digits.length !== cardNumberLength(network)) return false
  return luhnCheck(digits)
}

/** "MM/YY", not in the past (relative to the demo's "now"). */
export function isValidExpiry(value: string, now: string | Date = DEMO_NOW): boolean {
  const match = /^(\d{2})\s*\/?\s*(\d{2})$/.exec(value.trim())
  if (!match) return false
  const month = Number(match[1])
  const year = 2000 + Number(match[2])
  if (month < 1 || month > 12) return false
  const reference = new Date(now)
  const nowYear = reference.getUTCFullYear()
  const nowMonth = reference.getUTCMonth() + 1
  return year > nowYear || (year === nowYear && month >= nowMonth)
}

export function isValidCvv(value: string, network: CardNetwork = 'unknown'): boolean {
  if (!/^\d{3,4}$/.test(value)) return false
  return network === 'amex' ? value.length === 4 : value.length === 3 || value.length === 4
}

// ── Reusable field schemas ────────────────────────────────────────────────

export const pinSchema = z.string().regex(PIN_RE, 'Enter a valid 6-digit PIN code.')

export const mobileSchema = z
  .string()
  .regex(MOBILE_RE, 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.')

export const emailSchema = z.email('Enter a valid email address.')

export const gstinSchema = z
  .string()
  .regex(GSTIN_RE, 'Enter a valid 15-character GSTIN, e.g. 29AABCU9603R1ZM.')

export const panSchema = z.string().regex(PAN_RE, 'Enter a valid 10-character PAN, e.g. AABCU9603R.')

export const ifscSchema = z.string().regex(IFSC_RE, 'Enter a valid 11-character IFSC, e.g. HDFC0001234.')

export const vpaSchema = z.string().regex(VPA_RE, 'Enter a valid UPI ID, e.g. name@bank.')

export const otpSchema = z.string().regex(OTP_RE, 'Enter the 6-digit code.')

export const hsnSchema = z.string().regex(HSN_RE, 'Enter a 4 to 8 digit HSN code.')

export const nameSchema = z
  .string()
  .trim()
  .min(3, 'Enter the full name.')
  .max(60, 'Keep the name under 60 characters.')

export const accountNumberSchema = z
  .string()
  .regex(/^\d{9,18}$/, 'Enter a valid account number (9 to 18 digits).')

export const cardNumberSchema = z
  .string()
  .refine((value) => isValidCardNumber(value), 'Check the card number.')

export const expirySchema = z
  .string()
  .refine((value) => isValidExpiry(value), 'Enter a valid expiry date in the future.')

export const cvvSchema = z.string().regex(/^\d{3,4}$/, 'Enter the 3-digit CVV from the back of the card.')

export const passwordSchema = z.string().min(8, 'Use at least 8 characters.')

/** The delivery address form, shared by checkout and the account pages. */
export const addressSchema = z.object({
  name: nameSchema,
  phone: mobileSchema,
  pin: pinSchema,
  line1: z.string().trim().min(4, 'Enter the flat, house number or building.'),
  line2: z.string().trim().min(3, 'Enter the area, street or locality.'),
  landmark: z.string().trim().max(60, 'Keep the landmark under 60 characters.').optional(),
  city: z.string().trim().min(2, 'Enter the town or city.'),
  state: z.string().trim().min(2, 'Choose a state or union territory.'),
  type: z.enum(['home', 'work', 'other']),
})

export type AddressFormValues = z.infer<typeof addressSchema>

/** GST invoice details at checkout. */
export const gstInvoiceSchema = z.object({
  gstin: gstinSchema,
  businessName: z.string().trim().min(3, 'Enter the registered business name.'),
})

/** Seller onboarding: business details step. */
export const sellerBusinessSchema = z.object({
  legalName: z.string().trim().min(3, 'Enter the registered business name.'),
  gstin: gstinSchema.optional(),
  pan: panSchema,
})

/** Seller onboarding: bank step. */
export const bankSchema = z.object({
  accountName: nameSchema,
  accountNumber: accountNumberSchema,
  ifsc: ifscSchema,
})

/** Card entry at checkout. */
export const cardSchema = z.object({
  number: cardNumberSchema,
  name: nameSchema,
  expiry: expirySchema,
  cvv: cvvSchema,
})

/** Sign-in with a mobile number and the demo OTP. */
export const otpLoginSchema = z.object({
  phone: mobileSchema,
  otp: otpSchema,
})

/** Email + password sign-in (seller and admin portals). */
export const passwordLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})
