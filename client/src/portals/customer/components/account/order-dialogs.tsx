import { Star } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  DEMO_NOW,
  dbActions,
  useSession,
  type OrderItem,
  type OrderShipmentView,
} from '@/data'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Img } from '@/components/ui/img'
import { RadioGroup } from '@/components/ui/radio-group'
import { Select } from '@/components/ui/select'
import { ImageUploader, type UploadedImage } from '@/components/forms/image-uploader'
import { addDaysIso } from '@/lib/date'
import { formatDayShort, formatINR } from '@/lib/format'
import { cn } from '@/lib/cn'

const CANCEL_REASONS = [
  'Ordered by mistake',
  'Found a better price elsewhere',
  'Delivery is taking too long',
  'Ordered the wrong variant',
  'No longer needed',
]

const RETURN_REASONS = [
  'Item is not as described',
  'Item damaged in transit',
  'Wrong item delivered',
  'Size or fit issue',
  'Changed my mind',
]

const SLOT_TIMES = ['10:00 AM – 1:00 PM', '2:00 PM – 6:00 PM']

function pickupSlots(): { value: string; label: string }[] {
  const slots: { value: string; label: string }[] = []
  for (let day = 1; day <= 3; day += 1) {
    const date = formatDayShort(addDaysIso(DEMO_NOW, day))
    for (const time of SLOT_TIMES) slots.push({ value: `${date} · ${time}`, label: `${date} · ${time}` })
  }
  return slots
}

interface ShipmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: OrderShipmentView
  prepaid: boolean
}

/** Cancel a whole shipment before the seller packs it. */
export function CancelShipmentDialog({ open, onOpenChange, entry, prepaid }: ShipmentDialogProps) {
  const [reason, setReason] = useState(CANCEL_REASONS[0] ?? '')
  const [busy, setBusy] = useState(false)

  const confirm = () => {
    setBusy(true)
    const result = dbActions.cancelShipment(entry.shipment.id, { by: 'customer', reason })
    setBusy(false)
    if (!result.ok) {
      toast.error('We couldn’t cancel this shipment', { description: result.error })
      return
    }
    onOpenChange(false)
    toast.success('Shipment cancelled', {
      description: prepaid
        ? `A refund of ${formatINR(entry.shipment.totals.total)} is on its way to your original payment method.`
        : 'Nothing was charged — you had chosen cash on delivery.',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Cancel this shipment?"
        description={`${entry.shipment.id} from ${entry.seller?.displayName ?? 'the seller'} has not been packed yet.`}
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Keep the order
            </Button>
            <Button variant="danger" loading={busy} onClick={confirm}>
              Cancel shipment
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col gap-3">
            {entry.items.map((item) => (
              <li key={item.id} className="flex items-start gap-3">
                <Img image={item.image} alt={item.title} ratio="square" width={120} sizes="48px" className="w-12 shrink-0 rounded-card" />
                <div className="flex min-w-0 flex-col">
                  <p className="line-clamp-2 type-body text-fg">{item.title}</p>
                  <p className="type-caption text-fg-muted">Quantity {item.qty}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="rounded-control border border-warning-border bg-warning-subtle px-3 py-2 type-caption text-warning-subtle-fg">
            Cancelling removes every item in this shipment. Other shipments in this order are not affected.
          </p>

          <Field label="Why are you cancelling?">
            {(ids) => (
              <Select
                id={ids.id}
                value={reason}
                onValueChange={setReason}
                options={CANCEL_REASONS.map((entryReason) => ({ value: entryReason, label: entryReason }))}
                aria-describedby={ids.describedBy}
                className="w-full"
              />
            )}
          </Field>

          <p className="type-caption text-fg-muted">
            {prepaid
              ? 'Prepaid orders are refunded to the original payment method within 5 to 7 working days.'
              : 'Nothing is charged for a cancelled cash-on-delivery order.'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Raise a return on a delivered shipment, within the product's return window. */
export function ReturnDialog({ open, onOpenChange, entry, prepaid }: ShipmentDialogProps) {
  const [selected, setSelected] = useState<string[]>(entry.items.map((item) => item.id))
  const [reason, setReason] = useState(RETURN_REASONS[0] ?? '')
  const [details, setDetails] = useState('')
  const [photos, setPhotos] = useState<UploadedImage[]>([])
  const [slot, setSlot] = useState(pickupSlots()[0]?.value ?? '')
  const [refundTo, setRefundTo] = useState<'source' | 'upi'>(prepaid ? 'source' : 'upi')
  const [busy, setBusy] = useState(false)

  const refundAmount = entry.items
    .filter((item) => selected.includes(item.id))
    .reduce((sum, item) => sum + item.price * item.qty, 0)

  const submit = () => {
    if (selected.length === 0) return
    setBusy(true)
    const result = dbActions.requestReturn({
      shipmentId: entry.shipment.id,
      itemIds: selected,
      reason,
      details: details.trim() ? `${details.trim()} · Pickup requested for ${slot}` : `Pickup requested for ${slot}`,
      refundTo,
    })
    setBusy(false)
    if (!result.ok) {
      toast.error('We couldn’t raise this return', { description: result.error })
      return
    }
    onOpenChange(false)
    toast.success('Return requested', {
      description: `The seller has 48 hours to approve. Pickup is set for ${slot}.`,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Return items"
        description={`${entry.returnWindowDays} ${entry.returnWindowDays === 1 ? 'day' : 'days'} left in the return window for ${entry.shipment.id}.`}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button loading={busy} disabled={selected.length === 0} onClick={submit}>
              Request return
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <fieldset className="flex flex-col gap-3">
            <legend className="pb-2 type-label text-fg">Which items are going back?</legend>
            {entry.items.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-start gap-3 rounded-card border border-border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-subtle/40"
              >
                <Checkbox
                  checked={selected.includes(item.id)}
                  onCheckedChange={(checked) =>
                    setSelected((current) =>
                      checked === true ? [...current, item.id] : current.filter((id) => id !== item.id),
                    )
                  }
                />
                <Img image={item.image} alt="" ratio="square" width={120} sizes="48px" className="w-12 shrink-0 rounded-card" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="line-clamp-2 type-body text-fg">{item.title}</span>
                  <span className="type-caption text-fg-muted">
                    {item.variantLabel ? `${item.variantLabel} · ` : ''}Quantity {item.qty} · {formatINR(item.price * item.qty)}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          <Field label="Reason for the return">
            {(ids) => (
              <Select
                id={ids.id}
                value={reason}
                onValueChange={setReason}
                options={RETURN_REASONS.map((entryReason) => ({ value: entryReason, label: entryReason }))}
                className="w-full"
                aria-describedby={ids.describedBy}
              />
            )}
          </Field>

          <Field label="Tell the seller what went wrong" optional hint="A sentence or two helps the seller decide faster.">
            {(ids) => (
              <Textarea
                id={ids.id}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                aria-describedby={ids.describedBy}
                rows={3}
                maxLength={300}
              />
            )}
          </Field>

          <Field label="Photos" optional hint="Up to 4 photos. They stay on this device — nothing is uploaded.">
            {() => <ImageUploader value={photos} onChange={setPhotos} max={4} />}
          </Field>

          <Field label="Pickup slot">
            {(ids) => (
              <Select
                id={ids.id}
                value={slot}
                onValueChange={setSlot}
                options={pickupSlots()}
                className="w-full"
                aria-describedby={ids.describedBy}
              />
            )}
          </Field>

          <fieldset className="flex flex-col gap-2">
            <legend className="pb-2 type-label text-fg">Where should the refund go?</legend>
            <RadioGroup
              variant="card"
              aria-label="Where should the refund go?"
              value={refundTo}
              onValueChange={(value) => setRefundTo(value === 'upi' ? 'upi' : 'source')}
              options={[
                {
                  value: 'source',
                  label: 'Original payment method',
                  description: prepaid ? 'Reaches you in 5 to 7 working days' : 'Not available for cash-on-delivery orders',
                  disabled: !prepaid,
                },
                { value: 'upi', label: 'A UPI ID', description: 'Usually within 24 hours of the quality check' },
              ]}
            />
          </fieldset>

          <p className="rounded-control border border-border bg-surface-2 px-3 py-2 type-body text-fg">
            Refund if approved: <span className="type-price">{formatINR(refundAmount)}</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface ReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: OrderItem[]
}

/** Rate and review a delivered product. */
export function ReviewDialog({ open, onOpenChange, items }: ReviewDialogProps) {
  const customerId = useSession((state) => state.customerId)
  const [productId, setProductId] = useState(items[0]?.productId ?? '')
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = () => {
    if (body.trim().length < 10) {
      setError('Write at least a sentence so other shoppers get something useful.')
      return
    }
    setError(null)
    setBusy(true)
    const result = dbActions.submitReview({
      productId,
      customerId,
      rating: rating as 1 | 2 | 3 | 4 | 5,
      title: title.trim() || 'Verified purchase',
      body: body.trim(),
    })
    setBusy(false)
    if (!result.ok) {
      toast.error('We couldn’t post this review', { description: result.error })
      return
    }
    onOpenChange(false)
    toast.success('Thanks for the review', { description: 'It is live on the product page now.' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Rate and review"
        description="Only shoppers who received the item can review it, so reviews here are all verified."
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button loading={busy} onClick={submit}>
              Post review
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {items.length > 1 ? (
            <Field label="Which product?">
              {(ids) => (
                <Select
                  id={ids.id}
                  value={productId}
                  onValueChange={setProductId}
                  options={items.map((item) => ({ value: item.productId, label: item.title }))}
                  className="w-full"
                />
              )}
            </Field>
          ) : null}

          <fieldset className="flex flex-col gap-2">
            <legend className="pb-1 type-label text-fg">Your rating</legend>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`${value} out of 5`}
                  aria-pressed={rating === value}
                  onClick={() => setRating(value)}
                  className="grid size-11 place-items-center rounded-control text-fg-subtle hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Star aria-hidden className={cn('size-6', value <= rating && 'fill-rating text-rating')} />
                </button>
              ))}
              <span className="ml-2 type-body text-fg-muted">{rating} out of 5</span>
            </div>
          </fieldset>

          <Field label="Headline" optional>
            {(ids) => (
              <Input
                id={ids.id}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={80}
                placeholder="Worth every rupee"
              />
            )}
          </Field>

          <Field label="Your review" error={error} hint="What worked, what didn’t, and who it suits.">
            {(ids) => (
              <Textarea
                id={ids.id}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                invalid={ids.invalid}
                aria-describedby={ids.describedBy}
                rows={4}
                maxLength={600}
              />
            )}
          </Field>
        </div>
      </DialogContent>
    </Dialog>
  )
}
