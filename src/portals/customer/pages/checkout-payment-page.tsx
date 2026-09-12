import { CircleAlert, Lock, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import { toast } from 'sonner'
import {
  dbActions,
  useCart,
  useSession,
  type ID,
  type PaymentMethod,
  type SavedPayment,
} from '@/data'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { PaymentMethodPicker } from '@/components/commerce/payment-method-picker'
import { formatDayShort, formatINR } from '@/lib/format'
import { cardNetwork, isValidCardNumber, isValidCvv, isValidExpiry, isValidVpa } from '@/lib/validators'
import { CheckoutColumns, CompletedStep, StepHeading, StepPanel } from '../components/checkout/checkout-step'
import { EmptyBag } from '../components/checkout/empty-bag'
import {
  DEFAULT_PAYMENT_DETAILS,
  EMI_MINIMUM,
  paymentOptions,
  type PaymentDetails,
  type PaymentErrors,
} from '../components/checkout/payment-options'
import { PaymentPanel } from '../components/checkout/payment-panels'
import { PriceColumn } from '../components/checkout/price-column'
import { useCheckout } from '../components/checkout/use-checkout'

const QR_SECONDS = 300
const HOLD_SECONDS = 15 * 60
const PROCESSING_MS = 1500

/** Exactly the copy from the spec — the shopper reads the same words every time. */
const FAILURE_MESSAGE =
  'Your bank didn’t approve this payment. If money was deducted, it will be refunded within 5–7 working days. Your items are held for 15 minutes.'

function validate(method: PaymentMethod, details: PaymentDetails): PaymentErrors {
  const errors: PaymentErrors = {}
  if (method === 'upi' && details.upiMode === 'vpa' && !isValidVpa(details.vpa)) {
    errors.vpa = 'Enter a valid UPI ID, e.g. name@bank.'
  }
  if (method === 'card' || method === 'emi') {
    if (!isValidCardNumber(details.cardNumber)) errors.cardNumber = 'Check the card number.'
    if (details.cardName.trim().length < 3) errors.cardName = 'Enter the name printed on the card.'
    if (!isValidExpiry(details.cardExpiry)) errors.cardExpiry = 'Enter a valid expiry date in the future.'
    if (!isValidCvv(details.cardCvv, cardNetwork(details.cardNumber))) {
      errors.cardCvv = 'Enter the 3-digit CVV from the back of the card.'
    }
  }
  if (method === 'netbanking' && !details.bank) errors.bank = 'Choose a bank to continue.'
  if (method === 'wallet' && !details.wallet) errors.wallet = 'Choose a wallet to continue.'
  return errors
}

function countdown(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/** Step 3 of checkout: pay, including the path where the bank says no. */
export default function CheckoutPaymentPage() {
  const checkout = useCheckout()
  const customerId = useSession((state) => state.customerId)
  const clearCart = useCart((state) => state.clear)
  const resetCheckout = useCart((state) => state.resetCheckout)
  const setCheckout = useCart((state) => state.setCheckout)

  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [details, setDetails] = useState<PaymentDetails>(DEFAULT_PAYMENT_DETAILS)
  const [errors, setErrors] = useState<PaymentErrors>({})
  const [phase, setPhase] = useState<'idle' | 'processing' | 'failed'>('idle')
  const [placedId, setPlacedId] = useState<ID | null>(null)
  const [qrSecondsLeft, setQrSecondsLeft] = useState(QR_SECONDS)
  const [holdSecondsLeft, setHoldSecondsLeft] = useState(HOLD_SECONDS)

  const chosen = method ?? checkout.paymentMethod ?? 'upi'
  const qrRunning = chosen === 'upi' && details.upiMode === 'qr' && qrSecondsLeft > 0 && phase !== 'processing'
  const holdRunning = phase === 'failed' && holdSecondsLeft > 0

  useEffect(() => {
    if (!qrRunning) return
    const timer = window.setInterval(() => setQrSecondsLeft((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [qrRunning])

  useEffect(() => {
    if (!holdRunning) return
    const timer = window.setInterval(() => setHoldSecondsLeft((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [holdRunning])

  if (placedId) return <Navigate to={`/order-confirmed/${placedId}`} replace />
  if (checkout.isEmpty) return <EmptyBag />

  if (checkout.status === 'error') {
    return (
      <>
        <PageHeader title="Payment" documentTitle="Checkout · Payment" />
        <div className="mt-4 rounded-card border border-border bg-surface">
          <EmptyState
            icon={<TriangleAlert aria-hidden />}
            title="We couldn’t load the payment page"
            description="Nothing has been charged. Try again in a moment."
            action={<Button onClick={checkout.retry}>Retry</Button>}
          />
        </div>
      </>
    )
  }

  if (checkout.status === 'loading' || !checkout.data) {
    return (
      <CheckoutColumns aside={<Skeleton className="h-72 rounded-card" />}>
        <Skeleton className="h-14 rounded-card" />
        <PageHeader title="Payment" documentTitle="Checkout · Payment" />
        <Skeleton className="h-80 rounded-card" />
      </CheckoutColumns>
    )
  }

  const { address, shipments, summary, lines, blockedReason } = checkout.data

  // Steps cannot be skipped: no address, or no confirmed summary, means back a step.
  if (!address) return <Navigate to="/checkout/address" replace />
  if (!checkout.paymentMethod) return <Navigate to="/checkout/summary" replace />

  const codBlocked = chosen === 'cod' && !summary.codAvailable
  const emiBlocked = chosen === 'emi' && summary.total < EMI_MINIMUM
  const canPay = !blockedReason && !codBlocked && !emiBlocked && phase !== 'processing'
  const soonest = shipments
    .map((shipment) =>
      shipment.express && shipment.estimate?.expressDate ? shipment.estimate.expressDate : shipment.estimate?.date,
    )
    .filter((date): date is string => Boolean(date))
    .sort()[0]

  const patch = (next: Partial<PaymentDetails>) => setDetails((current) => ({ ...current, ...next }))

  const chooseMethod = (next: PaymentMethod) => {
    setMethod(next)
    setCheckout({ paymentMethod: next })
    setErrors({})
    if (phase === 'failed') setPhase('idle')
  }

  const pay = () => {
    const found = validate(chosen, details)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setPhase('processing')
    window.setTimeout(() => {
      const result = dbActions.placeOrder({
        customerId,
        addressId: address.id,
        lines: lines.map((line) => ({ productId: line.product.id, variantId: line.variant.id, qty: line.qty })),
        couponCode: summary.couponDiscount > 0 ? summary.couponCode : undefined,
        paymentMethod: chosen,
        upiVpa: chosen === 'upi' && details.upiMode === 'vpa' ? details.vpa : undefined,
        cardLast4: chosen === 'card' || chosen === 'emi' ? details.cardNumber.slice(-4) : undefined,
        deliverySpeed: checkout.deliverySpeed,
        gstInvoice: checkout.gstInvoice,
      })

      if (result.ok) {
        if (details.saveCard && chosen === 'card') {
          const network = cardNetwork(details.cardNumber)
          const card: SavedPayment = {
            id: dbActions.newAccountId('pay_'),
            kind: 'card',
            network: network === 'unknown' ? 'visa' : network,
            last4: details.cardNumber.slice(-4),
            expiry: details.cardExpiry,
            nameOnCard: details.cardName,
            isDefault: false,
          }
          dbActions.savePayment(customerId, card)
        }
        clearCart()
        resetCheckout()
        setPlacedId(result.orderId)
        return
      }

      if (result.paymentFailed) {
        setHoldSecondsLeft(HOLD_SECONDS)
        setPhase('failed')
        return
      }

      setPhase('idle')
      toast.error('We couldn’t place this order', { description: result.error })
    }, PROCESSING_MS)
  }

  const payLabel =
    chosen === 'cod'
      ? 'Place order'
      : chosen === 'upi' && details.upiMode === 'qr'
        ? `I’ve paid ${formatINR(summary.total)}`
        : `Pay ${formatINR(summary.total)}`

  return (
    <CheckoutColumns
      aside={
        <PriceColumn
          summary={summary}
          barLabel={chosen === 'cod' ? 'Pay on delivery' : 'Payable now'}
          cta={
            <Button size="lg" fullWidth loading={phase === 'processing'} disabled={!canPay} onClick={pay}>
              {payLabel}
            </Button>
          }
          note={
            <span className="block">
              {chosen === 'cod'
                ? `Keep ${formatINR(summary.total)} ready for the delivery partner.`
                : 'Payments in this demo are simulated — no money moves.'}
            </span>
          }
        />
      }
    >
      <CompletedStep label="Deliver to" to="/checkout/address" changeLabel="Change delivery address">
        <span className="text-fg">{address.name}</span>
        <span className="text-fg-muted">
          {' · '}
          {address.line1}, {address.city} {address.pin}
        </span>
      </CompletedStep>

      <CompletedStep label="Order summary" to="/checkout/summary" changeLabel="Change the order summary">
        <span className="text-fg">
          {shipments.length} {shipments.length === 1 ? 'shipment' : 'shipments'} · {summary.units}{' '}
          {summary.units === 1 ? 'item' : 'items'}
        </span>
        {soonest ? <span className="text-fg-muted"> · delivery by {formatDayShort(soonest)}</span> : null}
      </CompletedStep>

      <StepHeading
        title="Payment"
        documentTitle="Checkout · Payment"
        description="Choose how you want to pay. Your order is placed the moment the payment goes through."
        meta={
          <span className="flex items-center gap-1.5">
            <Lock aria-hidden className="size-3.5" />
            Simulated gateway · nothing is charged
          </span>
        }
      />

      {phase === 'failed' ? (
        <div role="alert" className="flex flex-col gap-3 rounded-card border border-danger-border bg-danger-subtle p-4">
          <p className="flex items-start gap-2 type-label text-danger-subtle-fg">
            <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>Payment not completed</span>
          </p>
          <p className="type-body text-danger-subtle-fg">{FAILURE_MESSAGE}</p>
          <p className="type-caption text-danger-subtle-fg tabular">
            {holdSecondsLeft > 0
              ? `Items held for ${countdown(holdSecondsLeft)}`
              : 'The hold has expired — check availability before paying again.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setPhase('idle')}>
              Retry payment
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                chooseMethod(summary.codAvailable ? 'cod' : 'card')
                setPhase('idle')
              }}
            >
              Try another payment method
            </Button>
          </div>
        </div>
      ) : null}

      {blockedReason ? (
        <p className="flex items-start gap-2 rounded-card border border-danger-border bg-danger-subtle px-4 py-3 type-body text-danger-subtle-fg">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{blockedReason}</span>
        </p>
      ) : null}

      <PaymentMethodPicker
        options={paymentOptions({
          amount: summary.total,
          codAvailable: summary.codAvailable,
          codReason: summary.codReason,
        })}
        value={chosen}
        onChange={chooseMethod}
        renderPanel={(panelMethod) => (
          <PaymentPanel
            method={panelMethod}
            details={details}
            onChange={patch}
            errors={errors}
            amount={summary.total}
            qrSecondsLeft={qrSecondsLeft}
            onRestartQr={() => setQrSecondsLeft(QR_SECONDS)}
            codAvailable={summary.codAvailable}
            codReason={summary.codReason}
          />
        )}
      />

      <p aria-live="polite" className="type-caption text-fg-muted">
        {phase === 'processing' ? 'Processing your payment. Please don’t close this page.' : ''}
      </p>

      <StepPanel title="What happens next">
        <ol className="flex flex-col gap-2 type-body text-fg-muted">
          <li>1. The sellers confirm and pack your items — one parcel per seller.</li>
          <li>2. You get a tracking link for every parcel as soon as it is handed to the courier.</li>
          <li>3. A GST invoice is available on the order page the moment the order is placed.</li>
        </ol>
      </StepPanel>
    </CheckoutColumns>
  )
}
