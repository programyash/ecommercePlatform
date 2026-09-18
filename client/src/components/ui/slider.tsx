import { Slider as SliderPrimitive } from 'radix-ui'
import { cn } from '@/lib/cn'

interface RangeSliderProps {
  value: [number, number]
  onValueChange: (value: [number, number]) => void
  onValueCommit?: (value: [number, number]) => void
  min: number
  max: number
  step?: number
  /** Accessible labels for the two thumbs. */
  labels?: [string, string]
  formatValue?: (value: number) => string
  className?: string
}

/** Two-thumb range slider. Always pair it with typed inputs for keyboard/screen-reader users. */
export function RangeSlider({
  value,
  onValueChange,
  onValueCommit,
  min,
  max,
  step = 1,
  labels = ['Minimum', 'Maximum'],
  formatValue,
  className,
}: RangeSliderProps) {
  return (
    <SliderPrimitive.Root
      min={min}
      max={max}
      step={step}
      value={value}
      minStepsBetweenThumbs={1}
      onValueChange={(next) => onValueChange([next[0] ?? min, next[1] ?? max])}
      onValueCommit={onValueCommit ? (next) => onValueCommit([next[0] ?? min, next[1] ?? max]) : undefined}
      className={cn('relative flex h-5 w-full touch-none select-none items-center', className)}
    >
      <SliderPrimitive.Track className="relative h-1 grow overflow-hidden rounded-pill bg-border">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {value.map((v, i) => (
        <SliderPrimitive.Thumb
          key={i}
          aria-label={labels[i]}
          aria-valuetext={formatValue ? formatValue(v) : undefined}
          className="block size-4.5 rounded-full border-2 border-primary bg-surface shadow-card transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
      ))}
    </SliderPrimitive.Root>
  )
}
