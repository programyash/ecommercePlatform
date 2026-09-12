import { Banknote, CreditCard, Landmark, QrCode, Smartphone, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import type { PaymentMethod } from '@/data/types'
import { cn } from '@/lib/cn'

export interface PaymentOption {
  method: PaymentMethod
  label: string
  description?: string
  /** Why this method cannot be used right now (COD over the limit, PIN restrictions). */
  unavailableReason?: string
  /** Right-aligned note, e.g. "No-cost EMI from ₹3,000/month". */
  meta?: ReactNode
}

const ICONS: Record<PaymentMethod, typeof CreditCard> = {
  upi: Smartphone,
  card: CreditCard,
  emi: QrCode,
  netbanking: Landmark,
  wallet: Wallet,
  cod: Banknote,
}

interface PaymentMethodPickerProps {
  options: PaymentOption[]
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
  /** Panel for the selected method (VPA field, card form, bank list…). */
  renderPanel: (method: PaymentMethod) => ReactNode
  className?: string
}

/**
 * Methods list on the left with the selected method's panel beside it on desktop;
 * an accordion on phones. UPI leads, COD explains itself when unavailable.
 */
export function PaymentMethodPicker({ options, value, onChange, renderPanel, className }: PaymentMethodPickerProps) {
  return (
    <div className={cn('overflow-hidden rounded-card border border-border bg-surface md:grid md:grid-cols-[15rem_1fr]', className)}>
      <ul role="radiogroup" aria-label="Payment method" className="flex flex-col border-border-subtle md:border-r">
        {options.map((option) => {
          const Icon = ICONS[option.method]
          const selected = option.method === value
          const disabled = Boolean(option.unavailableReason)
          return (
            <li key={option.method} className="border-b border-border-subtle last:border-b-0 md:last:border-b">
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                aria-disabled={disabled || undefined}
                onClick={() => !disabled && onChange(option.method)}
                className={cn(
                  'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                  selected ? 'bg-primary-subtle/50 md:border-r-2 md:border-primary' : 'hover:bg-surface-2',
                  disabled && 'cursor-not-allowed opacity-60 hover:bg-transparent',
                  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                )}
              >
                <Icon aria-hidden className={cn('mt-0.5 size-5 shrink-0', selected ? 'text-primary' : 'text-fg-muted')} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={cn('type-label', selected ? 'text-primary-subtle-fg' : 'text-fg')}>{option.label}</span>
                  {option.description ? <span className="type-caption text-fg-muted">{option.description}</span> : null}
                  {option.unavailableReason ? (
                    <span className="type-caption text-warning-subtle-fg">{option.unavailableReason}</span>
                  ) : null}
                </span>
                {option.meta ? <span className="shrink-0 type-caption text-fg-muted">{option.meta}</span> : null}
              </button>

              {/* Phones: the panel opens under the chosen method. */}
              {selected ? <div className="border-t border-border-subtle p-4 md:hidden">{renderPanel(option.method)}</div> : null}
            </li>
          )
        })}
      </ul>

      <div className="hidden p-5 md:block">{renderPanel(value)}</div>
    </div>
  )
}
