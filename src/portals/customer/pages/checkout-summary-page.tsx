import { FileText, Store, TriangleAlert, Truck } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { MAX_QTY_PER_LINE, useCart } from '@/data'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { RadioGroup } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { CartLine } from '@/components/commerce/cart-line'
import { CouponField } from '@/components/commerce/coupon-field'
import { formatDayShort, formatINR } from '@/lib/format'
import { isValidGstin } from '@/lib/validators'
import { CheckoutColumns, CompletedStep, StepHeading, StepPanel } from '../components/checkout/checkout-step'
import { EmptyBag } from '../components/checkout/empty-bag'
import { PriceColumn } from '../components/checkout/price-column'
import { useCheckout } from '../components/checkout/use-checkout'

/** Step 2 of checkout: one block per seller, delivery speed and the GST invoice. */
export default function CheckoutSummaryPage() {
  const checkout = useCheckout()
  const navigate = useNavigate()
  const setQty = useCart((state) => state.setQty)
  const removeLine = useCart((state) => state.remove)
  const buyNow = useCart((state) => state.buyNow)
  const setCoupon = useCart((state) => state.setCoupon)
  const setCheckout = useCart((state) => state.setCheckout)
  const setDeliverySpeed = useCart((state) => state.setDeliverySpeed)

  const [gstOn, setGstOn] = useState(Boolean(checkout.gstInvoice))
  const [gstin, setGstin] = useState(checkout.gstInvoice?.gstin ?? '')
  const [businessName, setBusinessName] = useState(checkout.gstInvoice?.businessName ?? '')
  const [gstErrors, setGstErrors] = useState<{ gstin?: string; businessName?: string }>({})

  if (checkout.isEmpty) return <EmptyBag />

  if (checkout.status === 'error') {
    return (
      <>
        <PageHeader title="Order summary" documentTitle="Checkout · Order summary" />
        <div className="mt-4 rounded-card border border-border bg-surface">
          <EmptyState
            icon={<TriangleAlert aria-hidden />}
            title="We couldn’t load your order summary"
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
        <PageHeader title="Order summary" documentTitle="Checkout · Order summary" />
        <Skeleton className="h-56 rounded-card" />
      </CheckoutColumns>
    )
  }

  const { address, shipments, summary, coupons, blockedReason } = checkout.data

  // Steps cannot be skipped: without an address there is nothing to summarise.
  if (!address) return <Navigate to="/checkout/address" replace />

  const continueToPayment = () => {
    if (gstOn) {
      const next: { gstin?: string; businessName?: string } = {}
      if (!isValidGstin(gstin.trim().toUpperCase())) {
        next.gstin = 'Enter a valid 15-character GSTIN, e.g. 29AABCU9603R1ZM.'
      }
      if (businessName.trim().length < 3) next.businessName = 'Enter the registered business name.'
      setGstErrors(next)
      if (next.gstin || next.businessName) return
      setCheckout({ gstInvoice: { gstin: gstin.trim().toUpperCase(), businessName: businessName.trim() } })
    } else {
      setCheckout({ gstInvoice: undefined })
    }
    setCheckout({ paymentMethod: checkout.paymentMethod ?? 'upi' })
    void navigate('/checkout/payment')
  }

  return (
    <CheckoutColumns
      aside={
        <PriceColumn
          summary={summary}
          barLabel="Order total"
          coupon={
            <div className="flex flex-col gap-2">
              <p className="type-label text-fg">Have a coupon?</p>
              {summary.couponError ? (
                <p className="type-caption text-danger-subtle-fg">
                  <span className="line-through">{checkout.couponCode}</span> · {summary.couponError}
                </p>
              ) : null}
              <CouponField
                applied={
                  summary.couponCode && summary.couponDiscount > 0
                    ? { code: summary.couponCode, discount: summary.couponDiscount }
                    : undefined
                }
                onApply={(code) => {
                  const offer = coupons.find((entry) => entry.coupon.code === code)
                  if (!offer) return { ok: false, reason: `${code} is not a coupon we recognise.` }
                  if (!offer.applicable) return { ok: false, reason: offer.reason }
                  setCoupon(code)
                  return { ok: true, discount: offer.discount }
                }}
                onRemove={() => setCoupon(null)}
                available={coupons.map((offer) => ({
                  coupon: offer.coupon,
                  result: offer.applicable
                    ? { ok: true, discount: offer.discount }
                    : { ok: false, reason: offer.reason },
                }))}
              />
            </div>
          }
          cta={
            <Button size="lg" fullWidth disabled={Boolean(blockedReason)} onClick={continueToPayment}>
              Continue to payment
            </Button>
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

      <StepHeading
        title="Order summary"
        documentTitle="Checkout · Order summary"
        description={
          shipments.length > 1
            ? `Your order ships in ${shipments.length} parcels, one from each seller.`
            : 'One parcel, sent straight from the seller.'
        }
      />

      {blockedReason ? (
        <p className="flex items-start gap-2 rounded-card border border-danger-border bg-danger-subtle px-4 py-3 type-body text-danger-subtle-fg">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{blockedReason}</span>
        </p>
      ) : null}

      {shipments.map((shipment, index) => (
        <StepPanel
          key={shipment.sellerId}
          title={
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Store aria-hidden className="size-4 text-fg-muted" />
              {shipments.length > 1 ? `Shipment ${index + 1} of ${shipments.length} · ` : ''}
              {shipment.seller ? (
                <Link to={`/store/${shipment.seller.slug}`} className="text-link hover:underline">
                  {shipment.seller.displayName}
                </Link>
              ) : (
                'Seller'
              )}
            </span>
          }
          description={
            shipment.estimate?.serviceable
              ? `Ships from ${shipment.seller?.city ?? 'India'} · delivery by ${formatDayShort(
                  shipment.express && shipment.estimate.expressDate
                    ? shipment.estimate.expressDate
                    : shipment.estimate.date,
                )}`
              : `Ships from ${shipment.seller?.city ?? 'India'}`
          }
        >
          <ul className="divide-y divide-border-subtle">
            {shipment.lines.map((line) => (
              <li key={line.lineId}>
                <CartLine
                  line={{
                    lineId: line.lineId,
                    productSlug: line.product.slug,
                    title: line.product.title,
                    brand: line.product.brand,
                    image: line.product.media[0] ?? 'rack-tees',
                    variantLabel: line.variantLabel,
                    price: line.variant.price,
                    mrp: line.variant.mrp,
                    qty: line.qty,
                    maxQty: Math.min(MAX_QTY_PER_LINE, Math.max(1, line.stock)),
                    notice:
                      line.stock < line.qty
                        ? { tone: 'danger', message: `Only ${line.stock} left — reduce the quantity to continue.` }
                        : line.stock <= 3
                          ? { tone: 'warning', message: `Only ${line.stock} left` }
                          : undefined,
                  }}
                  readOnly={Boolean(buyNow)}
                  onQtyChange={(lineId, qty) => setQty(lineId, qty, line.stock)}
                  onRemove={(lineId) => removeLine(lineId)}
                />
              </li>
            ))}
          </ul>

          {shipment.estimate?.expressAvailable && shipment.estimate.expressDate ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="pb-2 type-label text-fg">Delivery speed</legend>
              <RadioGroup
                variant="card"
                aria-label={`Delivery speed for ${shipment.seller?.displayName ?? 'this shipment'}`}
                value={shipment.express ? 'express' : 'standard'}
                onValueChange={(value) => setDeliverySpeed(shipment.sellerId, value === 'express' ? 'express' : 'standard')}
                options={[
                  {
                    value: 'standard',
                    label: 'Standard',
                    description: `Arrives by ${formatDayShort(shipment.estimate.date)}`,
                    icon: <Truck aria-hidden />,
                    meta: 'Free',
                  },
                  {
                    value: 'express',
                    label: 'Express',
                    description: `Arrives by ${formatDayShort(shipment.estimate.expressDate)}`,
                    icon: <Truck aria-hidden />,
                    meta: formatINR(shipment.estimate.expressFee),
                  },
                ]}
              />
            </fieldset>
          ) : null}
        </StepPanel>
      ))}

      <StepPanel
        title={
          <span className="flex items-center gap-2">
            <FileText aria-hidden className="size-4 text-fg-muted" />
            GST invoice
          </span>
        }
        description="Buying for a business? Add your GSTIN and we’ll put it on the invoice."
      >
        <Checkbox
          label="Use GST invoice"
          description="Available on orders from GST-registered sellers."
          checked={gstOn}
          onCheckedChange={(checked) => setGstOn(checked === true)}
        />

        {gstOn ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="GSTIN" error={gstErrors.gstin} hint="15 characters, e.g. 29AABCU9603R1ZM.">
              {(ids) => (
                <Input
                  id={ids.id}
                  value={gstin}
                  onChange={(event) => setGstin(event.target.value.toUpperCase())}
                  invalid={ids.invalid}
                  aria-describedby={ids.describedBy}
                  maxLength={15}
                  autoComplete="off"
                  className="uppercase tabular"
                />
              )}
            </Field>
            <Field label="Registered business name" error={gstErrors.businessName}>
              {(ids) => (
                <Input
                  id={ids.id}
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  invalid={ids.invalid}
                  aria-describedby={ids.describedBy}
                  autoComplete="organization"
                />
              )}
            </Field>
          </div>
        ) : null}
      </StepPanel>
    </CheckoutColumns>
  )
}
