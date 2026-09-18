import { CreditCard, Plus, Smartphone, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { dbActions, useDemoQuery, useSession, type SavedPayment } from '@/data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useConfirm } from '@/components/ui/use-confirm'
import { maskCard, maskUpi } from '@/lib/mask'
import { isValidVpa } from '@/lib/validators'

const NETWORK_LABEL: Record<'visa' | 'mastercard' | 'rupay' | 'amex', string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  rupay: 'RuPay',
  amex: 'American Express',
}

/** Saved UPI IDs and tokenised cards. */
export default function PaymentsPage() {
  const customerId = useSession((state) => state.customerId)
  const confirm = useConfirm()
  const [addOpen, setAddOpen] = useState(false)
  const [vpa, setVpa] = useState('')
  const [vpaError, setVpaError] = useState<string | null>(null)

  const query = useDemoQuery((view) => view.customerById.get(customerId), [customerId])
  const customer = query.data
  // `?demo=empty` forces the empty state even when something is saved.
  const payments = query.status === 'empty' ? [] : (customer?.savedPayments ?? [])
  const upi = payments.filter((payment) => payment.kind === 'upi')
  const cards = payments.filter((payment) => payment.kind === 'card')

  const addUpi = () => {
    const value = vpa.trim().toLowerCase()
    if (!isValidVpa(value)) {
      setVpaError('Enter a valid UPI ID, e.g. name@bank.')
      return
    }
    const result = dbActions.savePayment(customerId, {
      id: dbActions.newAccountId('pay_'),
      kind: 'upi',
      vpa: value,
      isDefault: payments.length === 0,
    })
    if (!result.ok) {
      setVpaError(result.error)
      return
    }
    setVpa('')
    setVpaError(null)
    setAddOpen(false)
    toast.success('UPI ID saved', { description: value })
  }

  const onRemove = async (payment: SavedPayment) => {
    const label = payment.kind === 'upi' ? payment.vpa : `${NETWORK_LABEL[payment.network]} ${maskCard(payment.last4)}`
    const ok = await confirm({
      title: 'Remove this payment method?',
      description: `${label} will no longer appear at checkout. You can add it again at any time.`,
      confirmLabel: 'Remove',
      tone: 'danger',
    })
    if (!ok) return
    dbActions.removePayment(customerId, payment.id)
    toast.success('Payment method removed')
  }

  const rowActions = (payment: SavedPayment) => (
    <div className="flex flex-wrap items-center gap-1">
      {payment.isDefault ? null : (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            dbActions.setDefaultPayment(customerId, payment.id)
            toast.success('Default payment method updated')
          }}
        >
          Set as default
        </Button>
      )}
      <Button size="sm" variant="ghost" className="text-danger-subtle-fg" onClick={() => void onRemove(payment)}>
        Remove
      </Button>
    </div>
  )

  return (
    <>
      <PageHeader
        title="Saved payments"
        breadcrumbs={[{ label: 'My account', to: '/account' }, { label: 'Saved payments' }]}
        description="Chowk never stores a full card number — cards are tokenised as per RBI rules while you pay."
        actions={
          <Button leftIcon={<Plus aria-hidden />} onClick={() => setAddOpen(true)}>
            Add UPI ID
          </Button>
        }
      />

      {query.status === 'error' ? (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState
            icon={<TriangleAlert aria-hidden />}
            title="We couldn’t load your saved payments"
            description="Something went wrong on our side. Try again in a moment."
            action={<Button onClick={query.retry}>Retry</Button>}
          />
        </div>
      ) : query.status === 'loading' ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40 rounded-card" />
          <Skeleton className="h-40 rounded-card" />
        </div>
      ) : payments.length === 0 ? (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState
            icon={<CreditCard aria-hidden />}
            title="Nothing saved yet"
            description="Save a UPI ID to pay in one tap, or tick “Save this card” the next time you pay by card."
            action={<Button onClick={() => setAddOpen(true)}>Add a UPI ID</Button>}
          />
        </div>
      ) : (
        <>
          <SectionCard title="UPI IDs" description="Pay in one tap without leaving the page." flush>
            {upi.length === 0 ? (
              <EmptyState
                variant="compact"
                title="No UPI ID saved"
                description="Add one and it shows up first at checkout."
                action={
                  <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                    Add UPI ID
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border-subtle">
                {upi.map((payment) => (
                  <li key={payment.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-fg-muted">
                        <Smartphone className="size-4.5" />
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <p className="flex flex-wrap items-center gap-2 type-label text-fg">
                          {payment.kind === 'upi' ? maskUpi(payment.vpa) : null}
                          {payment.isDefault ? (
                            <Badge tone="primary" size="sm">
                              Default
                            </Badge>
                          ) : null}
                        </p>
                        <p className="type-caption text-fg-muted">UPI</p>
                      </div>
                    </div>
                    {rowActions(payment)}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Cards"
            description="Only the last four digits are kept, alongside a token from the bank."
            flush
          >
            {cards.length === 0 ? (
              <EmptyState
                variant="compact"
                title="No cards saved"
                description="Tick “Save this card for next time” while paying and it appears here."
              />
            ) : (
              <ul className="divide-y divide-border-subtle">
                {cards.map((payment) => (
                  <li key={payment.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-fg-muted">
                        <CreditCard className="size-4.5" />
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <p className="flex flex-wrap items-center gap-2 type-label text-fg tabular">
                          {payment.kind === 'card' ? maskCard(payment.last4) : null}
                          {payment.isDefault ? (
                            <Badge tone="primary" size="sm">
                              Default
                            </Badge>
                          ) : null}
                        </p>
                        <p className="type-caption text-fg-muted">
                          {payment.kind === 'card'
                            ? `${NETWORK_LABEL[payment.network]} · expires ${payment.expiry} · ${payment.nameOnCard}`
                            : null}
                        </p>
                      </div>
                    </div>
                    {rowActions(payment)}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent
          title="Add a UPI ID"
          description="We check the format only — no money moves in this demo."
          size="sm"
          footer={
            <>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={addUpi}>Save UPI ID</Button>
            </>
          }
        >
          <Field label="UPI ID" error={vpaError} hint="For example priya.n@okdemo.">
            {(ids) => (
              <Input
                id={ids.id}
                value={vpa}
                onChange={(event) => setVpa(event.target.value.toLowerCase())}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addUpi()
                  }
                }}
                placeholder="name@bank"
                inputMode="email"
                autoComplete="off"
                invalid={ids.invalid}
                aria-describedby={ids.describedBy}
              />
            )}
          </Field>
        </DialogContent>
      </Dialog>
    </>
  )
}
