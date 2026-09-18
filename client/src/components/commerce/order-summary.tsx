import { Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'

export interface SummaryLine {
  label: string
  amount: number
  /** Discounts and savings render in green with a leading minus. */
  kind?: 'default' | 'discount' | 'free' | 'muted'
  hint?: string
}

interface OrderSummaryProps {
  lines: SummaryLine[]
  total: number
  totalLabel?: string
  /** "You will save ₹7,560" banner under the total. */
  savings?: number
  cta?: ReactNode
  note?: ReactNode
  /** Sticky card on desktop; the mobile bar variant is rendered by the page. */
  sticky?: boolean
  className?: string
}

export function OrderSummary({
  lines,
  total,
  totalLabel = 'Total',
  savings,
  cta,
  note,
  sticky = false,
  className,
}: OrderSummaryProps) {
  return (
    <section
      aria-label="Price details"
      className={cn('flex flex-col rounded-card border border-border bg-surface', sticky && 'lg:sticky lg:top-24', className)}
    >
      <h2 className="border-b border-border-subtle px-4 py-3 type-overline text-fg-muted">Price details</h2>
      <dl className="flex flex-col gap-2.5 px-4 py-3">
        {lines.map((line) => (
          <div key={line.label} className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-1.5 type-body text-fg-muted">
              {line.label}
              {line.hint ? (
                <Tooltip content={line.hint}>
                  <button type="button" aria-label={`About ${line.label}`} className="text-fg-subtle hover:text-fg">
                    <Info aria-hidden className="size-3.5" />
                  </button>
                </Tooltip>
              ) : null}
            </dt>
            <dd
              className={cn(
                'type-body tabular',
                line.kind === 'discount' && 'text-discount',
                line.kind === 'free' && 'text-success-subtle-fg',
                line.kind === 'muted' && 'text-fg-muted',
                (!line.kind || line.kind === 'default') && 'text-fg',
              )}
            >
              {line.kind === 'free' ? 'Free' : line.kind === 'discount' ? `− ${formatINR(Math.abs(line.amount))}` : formatINR(line.amount)}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex items-center justify-between gap-3 border-t border-border-subtle px-4 py-3">
        <p className="type-title">{totalLabel}</p>
        <p className="type-price text-lg text-fg">{formatINR(total)}</p>
      </div>
      {savings && savings > 0 ? (
        <p className="border-t border-border-subtle bg-success-subtle px-4 py-2 type-label text-success-subtle-fg">
          You will save {formatINR(savings)} on this order
        </p>
      ) : null}
      {cta ? <div className="border-t border-border-subtle p-4">{cta}</div> : null}
      {note ? <div className="px-4 pb-4 type-caption text-fg-muted">{note}</div> : null}
    </section>
  )
}
