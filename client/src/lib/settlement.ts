// What a seller is actually paid. One statement line per deduction, in the order
// the payout page prints them:
//
//   Sale                ₹17,999.00
//   Commission 5%         −₹899.95
//   Fixed fee              −₹30.00
//   Shipping fee           −₹65.00
//   GST 18% on fees       −₹179.09
//   TCS 0.5%               −₹76.27
//   TDS 0.1%               −₹15.25
//   Net payout         ₹16,733.44
//
// TCS and TDS are charged on the taxable value (the sale net of GST), which is why
// they are not simply 0.5 % and 0.1 % of ₹17,999.

import { round2 } from './tax'
import type { GstRate, ID, PayoutLine, PlatformSettings } from '@/data/types'

export interface SettlementShipment {
  id: ID
  /** Goods value the shopper paid for this shipment, GST-inclusive. */
  saleAmount: number
  /** Commission percentage for these goods (from the category). */
  commissionPct?: number
  /** GST slab of the goods, used to strip GST before TCS/TDS. */
  gstRate?: GstRate
  /** Overrides the platform shipping fee for this shipment. */
  shippingFee?: number
  /** Amount refunded out of this shipment (returns), deducted from the payout. */
  refund?: number
}

export interface Settlement {
  lines: PayoutLine[]
  /** Total sale value before deductions. */
  gross: number
  /** What lands in the bank account. */
  net: number
  /** Handy for the seller dashboard: total of every deduction (positive number). */
  deductions: number
}

const DEFAULT_COMMISSION_PCT = 5

/** Format a percentage for a statement label: 5, 0.5, 18 → "5", "0.5", "18". */
function pct(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100)
}

/**
 * Build a settlement for one or more shipments of the same seller.
 * `defaultCommissionPct` applies to shipments that do not carry their own rate.
 */
export function computeSettlement(
  shipments: readonly SettlementShipment[],
  settings: PlatformSettings,
  defaultCommissionPct: number = DEFAULT_COMMISSION_PCT,
): Settlement {
  let sale = 0
  let commission = 0
  let taxableBase = 0
  let shipping = 0
  let refunds = 0

  for (const shipment of shipments) {
    const rate = shipment.commissionPct ?? defaultCommissionPct
    const gstRate = shipment.gstRate ?? 18
    sale += shipment.saleAmount
    commission += (shipment.saleAmount * rate) / 100
    taxableBase += shipment.saleAmount / (1 + gstRate / 100)
    shipping += shipment.shippingFee ?? settings.shippingFeePerShipment
    refunds += shipment.refund ?? 0
  }

  sale = round2(sale)
  commission = round2(commission)
  shipping = round2(shipping)
  refunds = round2(refunds)
  const fixed = round2(settings.fixedFee * shipments.length)
  const gstOnFees = round2(((commission + fixed + shipping) * settings.gstOnFeesPct) / 100)
  const tcs = round2((taxableBase * settings.tcsPct) / 100)
  const tds = round2((taxableBase * settings.tdsPct) / 100)
  const effectiveCommissionPct = sale > 0 ? Math.round((commission / sale) * 1000) / 10 : defaultCommissionPct

  const lines: PayoutLine[] = [
    { kind: 'sale', label: 'Sale value', amount: sale },
    { kind: 'commission', label: `Commission ${pct(effectiveCommissionPct)}%`, amount: -commission },
    { kind: 'fixed_fee', label: shipments.length > 1 ? `Fixed fee × ${shipments.length}` : 'Fixed fee', amount: -fixed },
    { kind: 'shipping_fee', label: 'Shipping fee', amount: -shipping },
    { kind: 'gst_on_fees', label: `GST ${pct(settings.gstOnFeesPct)}% on fees`, amount: -gstOnFees },
    { kind: 'tcs', label: `TCS ${pct(settings.tcsPct)}%`, amount: -tcs },
    { kind: 'tds', label: `TDS ${pct(settings.tdsPct)}%`, amount: -tds },
  ]
  if (refunds > 0) lines.push({ kind: 'refund', label: 'Refunds', amount: -refunds })

  const net = round2(lines.reduce((total, line) => total + line.amount, 0))
  return { lines, gross: sale, net, deductions: round2(sale - net) }
}

/**
 * What one unit earns a seller, for the "earnings calculator" on the listing form.
 * Uses the same deductions as a real payout, spread over a single-item shipment.
 */
export function estimateEarnings(
  price: number,
  commissionPct: number,
  gstRate: GstRate,
  settings: PlatformSettings,
): { net: number; deductions: number; lines: PayoutLine[] } {
  const settlement = computeSettlement([{ id: 'preview', saleAmount: price, commissionPct, gstRate }], settings, commissionPct)
  return { net: settlement.net, deductions: settlement.deductions, lines: settlement.lines }
}
