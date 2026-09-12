// Everything the payment step needs that is not a component: the fictional
// institutions, the EMI maths and the shape of the form state.

import { FAILING_VPA } from '@/data'
import type { PaymentOption } from '@/components/commerce/payment-method-picker'
import { formatINR } from '@/lib/format'

// Fictional institutions: nothing here maps to a real bank, wallet or UPI app.
export const BANKS = ['Demo Bank', 'Bharat National Bank', 'Peninsula Bank', 'Nilgiri Bank', 'Ganga Cooperative Bank']
export const WALLETS = ['DemoPay Wallet', 'Paykit Wallet', 'ChowkCash']
export const UPI_APPS = ['DemoPay', 'Paykit', 'UniPay']

export const EMI_MINIMUM = 3_000
export const EMI_TENURES = [3, 6, 9, 12, 18, 24]
export const EMI_INTEREST_PCT = 13

export interface PaymentDetails {
  upiMode: 'vpa' | 'qr'
  vpa: string
  /** The mock account name shown after "Verify". */
  vpaName: string | null
  upiApp: string
  cardNumber: string
  cardName: string
  cardExpiry: string
  cardCvv: string
  saveCard: boolean
  emiBank: string
  emiTenure: number
  bank: string
  wallet: string
}

export type PaymentErrors = Partial<
  Record<'vpa' | 'cardNumber' | 'cardName' | 'cardExpiry' | 'cardCvv' | 'bank' | 'wallet', string>
>

export const DEFAULT_PAYMENT_DETAILS: PaymentDetails = {
  upiMode: 'vpa',
  vpa: '',
  vpaName: null,
  upiApp: UPI_APPS[0] ?? 'DemoPay',
  cardNumber: '',
  cardName: '',
  cardExpiry: '',
  cardCvv: '',
  saveCard: false,
  emiBank: BANKS[0] ?? 'Demo Bank',
  emiTenure: 6,
  bank: BANKS[0] ?? 'Demo Bank',
  wallet: WALLETS[0] ?? 'DemoPay Wallet',
}

/** The demo's account-name lookup — a format-valid UPI id resolves to a made-up name. */
export function mockVpaName(vpa: string): string {
  if (vpa.trim().toLowerCase() === FAILING_VPA) return 'Demo Test Account (always declines)'
  const handle = vpa.split('@')[0] ?? ''
  const name = handle
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
  return name || 'Demo Account'
}

export function emiMonthly(amount: number, tenure: number): { monthly: number; noCost: boolean } {
  const noCost = tenure <= 6
  const payable = noCost ? amount : amount * (1 + (EMI_INTEREST_PCT / 100) * (tenure / 12))
  return { monthly: Math.round(payable / tenure), noCost }
}

/** UPI first, cash on delivery last, each explaining itself when it cannot be used. */
export function paymentOptions(options: { amount: number; codAvailable: boolean; codReason?: string }): PaymentOption[] {
  return [
    { method: 'upi', label: 'UPI', description: 'Pay by UPI ID or QR code' },
    { method: 'card', label: 'Credit or debit card', description: 'Visa, Mastercard, RuPay and Amex' },
    {
      method: 'emi',
      label: 'EMI',
      description: 'Split the amount across months',
      unavailableReason:
        options.amount < EMI_MINIMUM ? `EMI starts on orders of ${formatINR(EMI_MINIMUM)} and above.` : undefined,
    },
    { method: 'netbanking', label: 'Net banking', description: 'All major demo banks' },
    { method: 'wallet', label: 'Wallet', description: 'Pay from a wallet balance' },
    {
      method: 'cod',
      label: 'Cash on delivery',
      description: 'Pay the delivery partner',
      unavailableReason: options.codAvailable ? undefined : options.codReason,
    },
  ]
}
