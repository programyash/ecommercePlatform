// GST maths. Catalogue prices are GST-inclusive (that is what Indian shoppers see),
// so an invoice line works backwards from the price to the taxable value.
//
// Intra-state supply splits the tax into CGST + SGST; inter-state charges IGST.

import type { GstRate } from '@/data/types'

/** The slabs this marketplace uses. Real GST has more; four keeps Settings › Tax readable. */
export const GST_RATES = [0, 5, 18, 40] as const

export interface GstBreakup {
  /** Price excluding GST. */
  taxable: number
  cgst: number
  sgst: number
  igst: number
  /** Always equals the inclusive amount that went in. */
  total: number
  rate: GstRate
  intraState: boolean
}

/** Money is carried to paise on invoices and settlements. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Supply is intra-state when the seller and the buyer share a GST state code. */
export function isIntraState(sellerStateCode: string, buyerStateCode: string): boolean {
  return sellerStateCode === buyerStateCode
}

/**
 * Split a GST-inclusive amount into its taxable value and tax components.
 * `gstBreakup(17999, 18, { intraState: true })` → taxable 15253.39, cgst 1372.81, sgst 1372.81.
 */
export function gstBreakup(
  inclusiveAmount: number,
  rate: GstRate,
  { intraState }: { intraState: boolean },
): GstBreakup {
  const total = round2(inclusiveAmount)
  const taxable = round2(total / (1 + rate / 100))
  const tax = round2(total - taxable)
  if (intraState) {
    const half = round2(tax / 2)
    return { taxable, cgst: half, sgst: round2(tax - half), igst: 0, total, rate, intraState }
  }
  return { taxable, cgst: 0, sgst: 0, igst: tax, total, rate, intraState }
}

/** Total tax inside a GST-inclusive amount. */
export function gstAmount(inclusiveAmount: number, rate: GstRate): number {
  return round2(inclusiveAmount - inclusiveAmount / (1 + rate / 100))
}

/** The value a GST-inclusive amount carries before tax. */
export function taxableValue(inclusiveAmount: number, rate: GstRate): number {
  return round2(inclusiveAmount / (1 + rate / 100))
}
