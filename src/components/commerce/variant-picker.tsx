import type { ColourSwatch, VariantAxis } from '@/data/types'
import { cn } from '@/lib/cn'

export interface VariantChoice {
  value: string
  /** Not sold in this combination at all. */
  unavailable?: boolean
  /** Exists but has no stock. */
  outOfStock?: boolean
}

interface VariantPickerProps {
  axis: VariantAxis
  label: string
  choices: VariantChoice[]
  value?: string
  onChange: (value: string) => void
  /** Colour chips for the `colour` axis. */
  swatches?: ColourSwatch[]
  /** e.g. "Size chart" link. */
  action?: React.ReactNode
  className?: string
}

const axisHint: Record<VariantAxis, string> = {
  colour: 'Colour',
  size: 'Size',
  storage: 'Storage',
  pack: 'Pack',
}

/** One row per axis. Unavailable combinations stay visible and say why. */
export function VariantPicker({ axis, label, choices, value, onChange, swatches, action, className }: VariantPickerProps) {
  const isColour = axis === 'colour' && swatches?.length
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="type-label text-fg">
          {label}
          {value ? <span className="font-normal text-fg-muted">: {value}</span> : null}
        </p>
        {action}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={axisHint[axis]}>
        {choices.map((choice) => {
          const selected = choice.value === value
          const disabled = choice.unavailable
          const swatch = swatches?.find((item) => item.name === choice.value)
          const title = disabled
            ? `${choice.value} — not available with the current selection`
            : choice.outOfStock
              ? `${choice.value} — out of stock`
              : choice.value

          if (isColour && swatch) {
            return (
              <button
                key={choice.value}
                type="button"
                onClick={() => !disabled && onChange(choice.value)}
                aria-pressed={selected}
                aria-disabled={disabled || undefined}
                title={title}
                className={cn(
                  'relative size-9 rounded-full border-2 transition-colors',
                  selected ? 'border-primary' : 'border-border hover:border-border-strong',
                  (disabled || choice.outOfStock) && 'opacity-45',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                )}
              >
                <span aria-hidden className="absolute inset-1 rounded-full" style={{ backgroundColor: swatch.hex }} />
                <span className="sr-only">{title}</span>
                {(disabled || choice.outOfStock) ? (
                  <span aria-hidden className="absolute inset-0 grid place-items-center">
                    <span className="h-px w-7 rotate-45 bg-fg-muted" />
                  </span>
                ) : null}
              </button>
            )
          }

          return (
            <button
              key={choice.value}
              type="button"
              onClick={() => !disabled && onChange(choice.value)}
              aria-pressed={selected}
              aria-disabled={disabled || undefined}
              title={title}
              className={cn(
                'relative min-w-11 rounded-control border px-3 py-2 type-label transition-colors',
                selected
                  ? 'border-primary bg-primary-subtle text-primary-subtle-fg'
                  : 'border-border bg-surface text-fg hover:border-border-strong',
                (disabled || choice.outOfStock) && 'text-fg-disabled',
                disabled && 'bg-surface-2',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              )}
            >
              {choice.value}
              {(disabled || choice.outOfStock) ? (
                <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
                  <span className="h-px w-[120%] -rotate-12 bg-border-strong" />
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
