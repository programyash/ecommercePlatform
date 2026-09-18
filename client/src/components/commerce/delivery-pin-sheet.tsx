import { MapPin } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { PinCodeInput } from '@/components/forms/inputs'

export interface PinLookupResult {
  ok: boolean
  city?: string
  state?: string
  /** Why it failed: invalid format or not serviceable. */
  message?: string
}

interface DeliveryPinSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Current saved PIN. */
  pin?: string
  /** Checks a PIN and returns the city/state or the reason it won't work. */
  lookup: (pin: string) => PinLookupResult
  onApply: (pin: string) => void
  /** Recently used PINs for one-tap switching. */
  recent?: string[]
}

/**
 * One sheet, used from the header, the product page and the cart, so the delivery
 * PIN is set the same way everywhere.
 */
export function DeliveryPinSheet({ open, onOpenChange, pin, lookup, onApply, recent = [] }: DeliveryPinSheetProps) {
  const [value, setValue] = useState(pin ?? '')
  const [result, setResult] = useState<PinLookupResult | null>(null)

  const check = (next: string) => {
    setValue(next)
    setResult(next.length === 6 ? lookup(next) : null)
  }

  const apply = (next: string) => {
    const check = lookup(next)
    setResult(check)
    if (!check.ok) return
    onApply(next)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        title="Where should we deliver?"
        description="Delivery dates, charges and Cash on Delivery depend on your PIN code."
        className="mx-auto max-w-md"
        footer={
          <Button fullWidth size="lg" disabled={value.length !== 6} onClick={() => apply(value)}>
            Deliver here
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Field
            label="PIN code"
            error={result && !result.ok ? result.message : undefined}
            hint={result?.ok ? `${result.city}, ${result.state}` : 'Six digits, e.g. 682020'}
          >
            {({ id, describedBy, invalid }) => (
              <PinCodeInput
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                value={value}
                autoFocus
                onChange={(event) => check(event.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && value.length === 6) apply(value)
                }}
              />
            )}
          </Field>

          {recent.length ? (
            <div className="flex flex-col gap-2">
              <p className="type-caption text-fg-muted">Recent</p>
              <div className="flex flex-wrap gap-2">
                {recent.map((recentPin) => {
                  const info = lookup(recentPin)
                  return (
                    <Button key={recentPin} variant="outline" size="sm" leftIcon={<MapPin aria-hidden />} onClick={() => apply(recentPin)}>
                      {recentPin}
                      {info.city ? ` · ${info.city}` : ''}
                    </Button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
