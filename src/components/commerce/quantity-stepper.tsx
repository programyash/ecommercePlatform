import { Minus, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'

interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max: number
  /** At min, the decrement button becomes "Remove". */
  onRemove?: () => void
  size?: 'sm' | 'md'
  label?: string
  className?: string
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  onRemove,
  size = 'md',
  label = 'Quantity',
  className,
}: QuantityStepperProps) {
  const atMin = value <= min
  const atMax = value >= max
  const buttonClass = cn(
    'grid place-items-center rounded-control text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg',
    'disabled:pointer-events-none disabled:text-fg-disabled focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    size === 'sm' ? 'size-8 [&_svg]:size-3.5' : 'size-10 [&_svg]:size-4',
  )

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-control border border-border bg-surface',
        size === 'sm' ? 'h-8' : 'h-10',
        className,
      )}
    >
      <button
        type="button"
        className={buttonClass}
        onClick={() => (atMin && onRemove ? onRemove() : onChange(value - 1))}
        disabled={atMin && !onRemove}
        aria-label={atMin && onRemove ? 'Remove item' : `Decrease ${label.toLowerCase()}`}
      >
        {atMin && onRemove ? <Trash2 aria-hidden /> : <Minus aria-hidden />}
      </button>
      <span
        aria-live="polite"
        className={cn('min-w-8 text-center type-label tabular', size === 'sm' && 'min-w-6 text-xs')}
      >
        <span className="sr-only">{label}: </span>
        {value}
      </span>
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(value + 1)}
        disabled={atMax}
        aria-label={`Increase ${label.toLowerCase()}`}
        title={atMax ? `Maximum ${max} per order` : undefined}
      >
        <Plus aria-hidden />
      </button>
    </div>
  )
}
