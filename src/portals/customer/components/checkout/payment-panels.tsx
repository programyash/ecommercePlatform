import { BadgeIndianRupee, Banknote, Check, QrCode, Smartphone } from 'lucide-react'
import type { PaymentMethod } from '@/data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { RadioGroup } from '@/components/ui/radio-group'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { formatINR } from '@/lib/format'
import { CARD_NETWORK_LABEL, cardNetwork, isValidVpa } from '@/lib/validators'
import {
  BANKS,
  EMI_INTEREST_PCT,
  EMI_TENURES,
  UPI_APPS,
  WALLETS,
  emiMonthly,
  mockVpaName,
  type PaymentDetails,
  type PaymentErrors,
} from './payment-options'

function groupCard(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 19)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

function QrTimer({ secondsLeft, onRestart }: { secondsLeft: number; onRestart: () => void }) {
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const wholeMinutes = Math.ceil(secondsLeft / 60)
  // Derived, not stateful: the live region only changes once a minute, so it is
  // announced once a minute rather than once a second.
  const announcement =
    secondsLeft === 0
      ? 'This QR code has expired'
      : `${wholeMinutes} ${wholeMinutes === 1 ? 'minute' : 'minutes'} left to pay`

  return (
    <div className="flex flex-col items-center gap-2">
      <p aria-hidden className="type-price text-lg text-fg tabular">
        {minutes}:{String(seconds).padStart(2, '0')}
      </p>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {secondsLeft === 0 ? (
        <Button variant="outline" size="sm" onClick={onRestart}>
          Need more time?
        </Button>
      ) : (
        <p className="type-caption text-fg-muted">
          This code expires in {minutes > 0 ? `${minutes} min` : `${seconds}s`}
        </p>
      )}
    </div>
  )
}

interface PaymentPanelProps {
  method: PaymentMethod
  details: PaymentDetails
  onChange: (patch: Partial<PaymentDetails>) => void
  errors: PaymentErrors
  amount: number
  /** Seconds left on the QR code; the page owns the clock. */
  qrSecondsLeft: number
  onRestartQr: () => void
  codReason?: string
  codAvailable: boolean
}

/** The form for whichever payment method is selected. */
export function PaymentPanel({
  method,
  details,
  onChange,
  errors,
  amount,
  qrSecondsLeft,
  onRestartQr,
  codReason,
  codAvailable,
}: PaymentPanelProps) {
  if (method === 'upi') {
    return (
      <div className="flex flex-col gap-4">
        <SegmentedControl
          aria-label="How to pay by UPI"
          value={details.upiMode}
          onValueChange={(value) => onChange({ upiMode: value })}
          options={[
            { value: 'vpa', label: 'UPI ID', icon: <Smartphone aria-hidden /> },
            { value: 'qr', label: 'QR code', icon: <QrCode aria-hidden /> },
          ]}
          className="self-start"
        />

        {details.upiMode === 'vpa' ? (
          <>
            <Field label="UPI ID" error={errors.vpa} hint="Type fail@demo to see how a declined payment behaves.">
              {(ids) => (
                <div className="flex flex-wrap items-start gap-2">
                  <Input
                    id={ids.id}
                    value={details.vpa}
                    onChange={(event) => onChange({ vpa: event.target.value.toLowerCase(), vpaName: null })}
                    placeholder="name@bank"
                    inputMode="email"
                    autoComplete="off"
                    invalid={ids.invalid}
                    aria-describedby={ids.describedBy}
                    wrapperClassName="min-w-0 flex-1"
                  />
                  <Button
                    variant="outline"
                    disabled={!isValidVpa(details.vpa)}
                    onClick={() => onChange({ vpaName: mockVpaName(details.vpa) })}
                  >
                    Verify
                  </Button>
                </div>
              )}
            </Field>

            {details.vpaName ? (
              <p className="flex items-center gap-2 rounded-control border border-success-border bg-success-subtle px-3 py-2 type-body text-success-subtle-fg">
                <Check aria-hidden className="size-4 shrink-0" />
                Paying {details.vpaName}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 sm:hidden">
              <p className="type-label text-fg">Or open a UPI app</p>
              <div className="flex flex-wrap gap-2">
                {UPI_APPS.map((app) => (
                  <Button
                    key={app}
                    variant={details.upiApp === app ? 'secondary' : 'outline'}
                    size="sm"
                    aria-pressed={details.upiApp === app}
                    onClick={() => onChange({ upiApp: app, upiMode: 'qr' })}
                  >
                    {app}
                  </Button>
                ))}
              </div>
              <p className="type-caption text-fg-subtle">These are demo apps — nothing leaves this page.</p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-border-strong bg-surface-2 p-5 text-center">
            <span
              aria-hidden
              className="grid size-32 place-items-center rounded-card border border-border bg-surface text-fg-subtle"
            >
              <QrCode className="size-16" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="type-label text-fg">Scan with {details.upiApp} or any UPI app</p>
              <p className="type-caption text-fg-muted">
                Paying {formatINR(amount)}. This demo does not generate a real QR code.
              </p>
            </div>
            <QrTimer secondsLeft={qrSecondsLeft} onRestart={onRestartQr} />
          </div>
        )}
      </div>
    )
  }

  if (method === 'card' || method === 'emi') {
    const network = cardNetwork(details.cardNumber)
    return (
      <div className="flex flex-col gap-4">
        {method === 'emi' ? (
          <div className="flex flex-col gap-3">
            <fieldset className="flex flex-col gap-2">
              <legend className="pb-2 type-label text-fg">EMI bank</legend>
              <RadioGroup
                aria-label="EMI bank"
                orientation="horizontal"
                value={details.emiBank}
                onValueChange={(value) => onChange({ emiBank: value })}
                options={BANKS.map((bank) => ({ value: bank, label: bank }))}
              />
            </fieldset>

            <div className="overflow-x-auto">
              <table className="w-full text-left type-body">
                <caption className="sr-only">EMI plans for {formatINR(amount)}</caption>
                <thead className="type-caption text-fg-muted">
                  <tr>
                    <th scope="col" className="py-1.5 pr-3 font-medium">
                      Tenure
                    </th>
                    <th scope="col" className="py-1.5 pr-3 text-right font-medium">
                      Monthly
                    </th>
                    <th scope="col" className="py-1.5 font-medium">
                      Interest
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {EMI_TENURES.map((tenure) => {
                    const plan = emiMonthly(amount, tenure)
                    return (
                      <tr key={tenure} className="border-t border-border-subtle">
                        <td className="py-1.5 pr-3">
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="radio"
                              name="emi-tenure"
                              value={tenure}
                              checked={details.emiTenure === tenure}
                              onChange={() => onChange({ emiTenure: tenure })}
                              className="size-4 accent-primary"
                            />
                            {tenure} months
                          </label>
                        </td>
                        <td className="py-1.5 pr-3 text-right tabular">{formatINR(plan.monthly)}</td>
                        <td className="py-1.5">
                          {plan.noCost ? (
                            <Badge tone="success" size="sm">
                              No-cost
                            </Badge>
                          ) : (
                            <span className="type-caption text-fg-muted">{EMI_INTEREST_PCT}% p.a.</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <Field
          label="Card number"
          error={errors.cardNumber}
          hint="A card ending 0002 always declines, so you can try the failure path."
        >
          {(ids) => (
            <Input
              id={ids.id}
              value={groupCard(details.cardNumber)}
              onChange={(event) => onChange({ cardNumber: event.target.value.replace(/\D/g, '').slice(0, 19) })}
              placeholder="4111 1111 1111 1111"
              inputMode="numeric"
              autoComplete="cc-number"
              invalid={ids.invalid}
              aria-describedby={ids.describedBy}
              className="tabular"
              suffix={
                network !== 'unknown' ? (
                  <span className="type-caption text-fg-muted">{CARD_NETWORK_LABEL[network]}</span>
                ) : null
              }
            />
          )}
        </Field>

        <Field label="Name on card" error={errors.cardName}>
          {(ids) => (
            <Input
              id={ids.id}
              value={details.cardName}
              onChange={(event) => onChange({ cardName: event.target.value })}
              autoComplete="cc-name"
              invalid={ids.invalid}
              aria-describedby={ids.describedBy}
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Expiry (MM/YY)" error={errors.cardExpiry}>
            {(ids) => (
              <Input
                id={ids.id}
                value={details.cardExpiry}
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, '').slice(0, 4)
                  onChange({ cardExpiry: digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits })
                }}
                placeholder="08/29"
                inputMode="numeric"
                autoComplete="cc-exp"
                invalid={ids.invalid}
                aria-describedby={ids.describedBy}
                className="tabular"
              />
            )}
          </Field>
          <Field label="CVV" error={errors.cardCvv} hint="The 3 digits on the back of the card.">
            {(ids) => (
              <Input
                id={ids.id}
                type="password"
                value={details.cardCvv}
                onChange={(event) => onChange({ cardCvv: event.target.value.replace(/\D/g, '').slice(0, 4) })}
                inputMode="numeric"
                autoComplete="cc-csc"
                maxLength={4}
                invalid={ids.invalid}
                aria-describedby={ids.describedBy}
                className="tabular"
              />
            )}
          </Field>
        </div>

        {method === 'card' ? (
          <Checkbox
            label="Save this card for next time"
            description="Tokenised as per RBI rules — we never keep the full number."
            checked={details.saveCard}
            onCheckedChange={(checked) => onChange({ saveCard: checked === true })}
          />
        ) : null}
      </div>
    )
  }

  if (method === 'netbanking') {
    return (
      <fieldset className="flex flex-col gap-3">
        <legend className="pb-2 type-label text-fg">Choose your bank</legend>
        <RadioGroup
          variant="card"
          aria-label="Choose your bank"
          value={details.bank}
          onValueChange={(value) => onChange({ bank: value })}
          options={BANKS.map((bank) => ({ value: bank, label: bank, description: 'Redirects to a simulated bank page' }))}
        />
        {errors.bank ? <p className="type-caption text-danger-subtle-fg">{errors.bank}</p> : null}
      </fieldset>
    )
  }

  if (method === 'wallet') {
    return (
      <fieldset className="flex flex-col gap-3">
        <legend className="pb-2 type-label text-fg">Choose a wallet</legend>
        <RadioGroup
          variant="card"
          aria-label="Choose a wallet"
          value={details.wallet}
          onValueChange={(value) => onChange({ wallet: value })}
          options={WALLETS.map((wallet) => ({
            value: wallet,
            label: wallet,
            description: 'Demo balance, topped up automatically',
            icon: <BadgeIndianRupee aria-hidden />,
          }))}
        />
        {errors.wallet ? <p className="type-caption text-danger-subtle-fg">{errors.wallet}</p> : null}
      </fieldset>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-start gap-3 type-body text-fg">
        <Banknote aria-hidden className="mt-0.5 size-5 shrink-0 text-fg-muted" />
        <span>
          Pay {formatINR(amount)} in cash when the parcel arrives. Keep the exact amount ready — delivery partners
          rarely carry change.
        </span>
      </p>
      {!codAvailable && codReason ? (
        <p className="rounded-control border border-warning-border bg-warning-subtle px-3 py-2 type-caption text-warning-subtle-fg">
          {codReason}
        </p>
      ) : (
        <p className="type-caption text-fg-muted">
          Prepaid orders are dispatched a little sooner and are eligible for every coupon.
        </p>
      )}
    </div>
  )
}
