import { Progress as ProgressPrimitive } from 'radix-ui'
import { cn } from '@/lib/cn'
import type { Tone } from './badge'

const fillClass: Record<Tone, string> = {
  neutral: 'bg-neutral',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  primary: 'bg-primary',
  accent: 'bg-accent',
}

interface ProgressProps {
  value: number
  max?: number
  tone?: Tone
  size?: 'sm' | 'md'
  label?: string
  className?: string
}

export function Progress({ value, max = 100, tone = 'primary', size = 'md', label, className }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <ProgressPrimitive.Root
      value={value}
      max={max}
      aria-label={label}
      className={cn('relative w-full overflow-hidden rounded-pill bg-surface-3', size === 'sm' ? 'h-1.5' : 'h-2', className)}
    >
      <ProgressPrimitive.Indicator
        className={cn('h-full rounded-pill transition-[width] duration-300 ease-standard', fillClass[tone])}
        style={{ width: `${pct}%` }}
      />
    </ProgressPrimitive.Root>
  )
}
