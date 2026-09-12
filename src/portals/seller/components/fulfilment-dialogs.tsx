import { Printer } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { COURIER_NAME, dbActions } from '@/data'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { RadioGroup } from '@/components/ui/radio-group'
import { formatINR } from '@/lib/format'

// ── Pack ──────────────────────────────────────────────────────────────────

export interface PackTarget {
  shipmentId: string
  weightKg: number
  dimensionsCm: [number, number, number]
}

interface PackDialogProps {
  target: PackTarget | null
  onClose: () => void
  onPacked?: (shipmentId: string) => void
}

function volumetric(l: number, b: number, h: number): number {
  return Math.round(((l * b * h) / 5000) * 100) / 100
}

function PackBody({ target, onClose, onPacked }: { target: PackTarget; onClose: () => void; onPacked?: (id: string) => void }) {
  const [weight, setWeight] = useState(String(target.weightKg))
  const [length, setLength] = useState(String(target.dimensionsCm[0]))
  const [breadth, setBreadth] = useState(String(target.dimensionsCm[1]))
  const [height, setHeight] = useState(String(target.dimensionsCm[2]))

  const numbers = [weight, length, breadth, height].map((value) => Number(value))
  const invalid = numbers.some((value) => !Number.isFinite(value) || value <= 0)
  const billable = invalid ? 0 : Math.max(numbers[0] ?? 0, volumetric(numbers[1] ?? 0, numbers[2] ?? 0, numbers[3] ?? 0))

  const submit = () => {
    if (invalid) return
    const result = dbActions.packShipment(target.shipmentId, {
      weightKg: numbers[0] ?? 0,
      dimensionsCm: [numbers[1] ?? 0, numbers[2] ?? 0, numbers[3] ?? 0],
    })
    if (!result.ok) {
      toast.error('Could not mark as packed', { description: result.error })
      return
    }
    toast.success('Marked as packed', { description: `${target.shipmentId} is ready for the courier.` })
    onPacked?.(target.shipmentId)
    onClose()
  }

  return (
    <DialogContent
      title="Pack this order"
      description="Weight and size come from the listing. Correct them if the packed parcel differs."
      size="md"
      footer={
        <>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={submit} disabled={invalid}>
            Mark as packed
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Packed weight" hint="Kilograms, as weighed.">
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              inputMode="decimal"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              suffix="kg"
              className="tabular"
            />
          )}
        </Field>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="type-label text-fg">Box size</legend>
          <div className="grid grid-cols-3 gap-2">
            <Input aria-label="Length in centimetres" inputMode="decimal" value={length} onChange={(event) => setLength(event.target.value)} suffix="cm" className="tabular" />
            <Input aria-label="Breadth in centimetres" inputMode="decimal" value={breadth} onChange={(event) => setBreadth(event.target.value)} suffix="cm" className="tabular" />
            <Input aria-label="Height in centimetres" inputMode="decimal" value={height} onChange={(event) => setHeight(event.target.value)} suffix="cm" className="tabular" />
          </div>
          <p className="type-caption text-fg-muted">Length × breadth × height.</p>
        </fieldset>
        <p className="rounded-card border border-border-subtle bg-surface-2 p-3 type-caption text-fg-muted">
          Volumetric weight {invalid ? '—' : `${volumetric(numbers[1] ?? 0, numbers[2] ?? 0, numbers[3] ?? 0)} kg`} · billed at{' '}
          <span className="font-semibold text-fg">{invalid ? '—' : `${billable} kg`}</span>, the higher of the two.
        </p>
      </div>
    </DialogContent>
  )
}

export function PackDialog({ target, onClose, onPacked }: PackDialogProps) {
  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {target ? <PackBody target={target} onClose={onClose} onPacked={onPacked} /> : null}
    </Dialog>
  )
}

// ── Shipping labels ───────────────────────────────────────────────────────

export interface LabelRow {
  shipmentId: string
  orderId: string
  buyer: string
  pin: string
  items: string
  amount: number
  prepaid: boolean
  awb?: string
}

interface LabelDialogProps {
  rows: LabelRow[]
  open: boolean
  onOpenChange: (open: boolean) => void
  from: string
  title?: string
}

/** Label preview before printing — the same sheet for one order or a whole batch. */
export function LabelDialog({ rows, open, onOpenChange, from, title = 'Shipping labels' }: LabelDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={title}
        description={`${rows.length} ${rows.length === 1 ? 'label' : 'labels'} ready for ${COURIER_NAME}. Buyer phone numbers are masked on the label.`}
        size="lg"
        footer={
          <>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
            <Button
              leftIcon={<Printer aria-hidden />}
              onClick={() => {
                toast.success('Labels sent to the printer', {
                  description: `${rows.length} ${rows.length === 1 ? 'label' : 'labels'} for ${COURIER_NAME}.`,
                })
                onOpenChange(false)
              }}
            >
              Print labels
            </Button>
          </>
        }
      >
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.shipmentId} className="flex flex-col gap-2 rounded-card border border-border-strong p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border-subtle pb-2">
                <span className="type-code text-fg">{row.shipmentId}</span>
                <span className="type-caption text-fg-muted">{COURIER_NAME}{row.awb ? ` · AWB ${row.awb}` : ' · AWB on hand-over'}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex flex-col">
                  <span className="type-caption text-fg-muted">Deliver to</span>
                  <span className="type-body text-fg">{row.buyer}</span>
                  <span className="type-body text-fg tabular">PIN {row.pin}</span>
                </div>
                <div className="flex flex-col">
                  <span className="type-caption text-fg-muted">Ship from</span>
                  <span className="type-body text-fg">{from}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-2 type-caption text-fg-muted">
                <span className="min-w-0 truncate">{row.items}</span>
                <span className="shrink-0 font-semibold text-fg">
                  {row.prepaid ? 'Prepaid' : `Collect ${formatINR(row.amount)}`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

// ── Cancel ────────────────────────────────────────────────────────────────

const CANCEL_REASONS = [
  { value: 'out_of_stock', label: 'Out of stock', description: 'The item is not available to pack.' },
  { value: 'pricing_error', label: 'Pricing error', description: 'The listed price was wrong.' },
  { value: 'address_unserviceable', label: 'Cannot ship to this PIN code', description: 'Our courier does not reach this address.' },
  { value: 'damaged', label: 'Damaged in the warehouse', description: 'The only unit left is not fit to send.' },
  { value: 'other', label: 'Something else', description: 'Explain below so the shopper gets a real reason.' },
]

interface CancelDialogProps {
  shipmentId: string | null
  onClose: () => void
  onCancelled?: (shipmentId: string) => void
}

function CancelBody({ shipmentId, onClose, onCancelled }: { shipmentId: string; onClose: () => void; onCancelled?: (id: string) => void }) {
  const [reason, setReason] = useState('out_of_stock')
  const [note, setNote] = useState('')
  const chosen = CANCEL_REASONS.find((entry) => entry.value === reason)
  const needsNote = reason === 'other'
  const text = needsNote ? note.trim() : `${chosen?.label ?? 'Cancelled by the seller'}${note.trim() ? ` — ${note.trim()}` : ''}`

  return (
    <DialogContent
      title="Cancel this order?"
      description="Cancelling affects your seller rating. Cancel only if you can't fulfil this order."
      size="md"
      footer={
        <>
          <DialogClose asChild>
            <Button variant="outline">Keep the order</Button>
          </DialogClose>
          <Button
            variant="danger"
            disabled={needsNote && note.trim().length < 5}
            onClick={() => {
              const result = dbActions.cancelShipment(shipmentId, { by: 'seller', reason: text })
              if (!result.ok) {
                toast.error('Could not cancel this order', { description: result.error })
                return
              }
              toast.success('Order cancelled', { description: `${shipmentId} · the shopper has been told why.` })
              onCancelled?.(shipmentId)
              onClose()
            }}
          >
            Cancel order
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <RadioGroup
          aria-label="Reason for cancelling"
          value={reason}
          onValueChange={setReason}
          options={CANCEL_REASONS}
          variant="card"
        />
        <Field label="Note for the shopper" optional={!needsNote} hint="This is shown on their order page.">
          {({ id, describedBy }) => (
            <Textarea
              id={id}
              aria-describedby={describedBy}
              value={note}
              rows={3}
              maxLength={200}
              onChange={(event) => setNote(event.target.value)}
              placeholder="We are very sorry — the last unit failed our quality check."
            />
          )}
        </Field>
      </div>
    </DialogContent>
  )
}

export function CancelDialog({ shipmentId, onClose, onCancelled }: CancelDialogProps) {
  return (
    <Dialog
      open={Boolean(shipmentId)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {shipmentId ? <CancelBody shipmentId={shipmentId} onClose={onClose} onCancelled={onCancelled} /> : null}
    </Dialog>
  )
}

// ── Returns ───────────────────────────────────────────────────────────────

export interface ReturnTarget {
  returnId: string
  shipmentId: string
  reason: string
  refundAmount: number
}

interface ReturnDialogProps {
  target: ReturnTarget | null
  onClose: () => void
}

function ReturnBody({ target, onClose }: { target: ReturnTarget; onClose: () => void }) {
  const [decision, setDecision] = useState('approve')
  const [note, setNote] = useState('')
  const rejecting = decision === 'reject'

  return (
    <DialogContent
      title="Decide this return"
      description={`${target.shipmentId} · ${target.reason}`}
      size="md"
      footer={
        <>
          <DialogClose asChild>
            <Button variant="outline">Not now</Button>
          </DialogClose>
          <Button
            variant={rejecting ? 'danger' : 'primary'}
            disabled={rejecting && note.trim().length < 5}
            onClick={() => {
              const result = dbActions.decideReturn(target.returnId, !rejecting, note.trim() || undefined)
              if (!result.ok) {
                toast.error('Could not update this return', { description: result.error })
                return
              }
              toast.success(rejecting ? 'Return rejected' : 'Return approved', {
                description: rejecting
                  ? 'The shopper has been told why.'
                  : `Pickup will be scheduled. ${formatINR(target.refundAmount)} is refunded once the item is checked.`,
              })
              onClose()
            }}
          >
            {rejecting ? 'Reject return' : 'Approve return'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <RadioGroup
          aria-label="Decision"
          value={decision}
          onValueChange={setDecision}
          variant="card"
          options={[
            {
              value: 'approve',
              label: 'Approve the return',
              description: `We collect the item and refund ${formatINR(target.refundAmount)} after the quality check.`,
            },
            {
              value: 'reject',
              label: 'Reject the return',
              description: 'Only when the request falls outside your return policy. Tell the shopper why.',
            },
          ]}
        />
        <Field label="Reason for the shopper" optional={!rejecting}>
          {({ id, describedBy }) => (
            <Textarea
              id={id}
              aria-describedby={describedBy}
              rows={3}
              maxLength={200}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={rejecting ? 'The item was used, so it falls outside our 7-day return policy.' : 'Sorry this did not work out — pickup is on us.'}
            />
          )}
        </Field>
      </div>
    </DialogContent>
  )
}

export function ReturnDialog({ target, onClose }: ReturnDialogProps) {
  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {target ? <ReturnBody target={target} onClose={onClose} /> : null}
    </Dialog>
  )
}
