import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface Step {
  id: string
  label: string
  description?: string
}

interface StepperProps {
  steps: Step[]
  /** Index of the current step (0-based). */
  current: number
  orientation?: 'horizontal' | 'vertical'
  onStepClick?: (index: number) => void
  className?: string
}

/** Checkout, seller onboarding and any other linear flow. */
export function Stepper({ steps, current, orientation = 'horizontal', onStepClick, className }: StepperProps) {
  return (
    <ol
      className={cn(
        'flex',
        orientation === 'horizontal' ? 'w-full items-center gap-2 sm:gap-3' : 'flex-col gap-3',
        className,
      )}
    >
      {steps.map((step, index) => {
        const done = index < current
        const active = index === current
        const clickable = Boolean(onStepClick) && done
        const Marker = clickable ? 'button' : 'div'
        return (
          <li
            key={step.id}
            className={cn('flex min-w-0 items-center gap-2', orientation === 'horizontal' && 'flex-1 last:flex-none')}
            aria-current={active ? 'step' : undefined}
          >
            <Marker
              {...(clickable ? { type: 'button' as const, onClick: () => onStepClick?.(index) } : {})}
              className={cn(
                'flex min-w-0 items-center gap-2 text-left',
                clickable && 'rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              )}
            >
              <span
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-full border text-2xs font-semibold tabular',
                  done && 'border-primary bg-primary text-primary-fg',
                  active && 'border-primary bg-primary-subtle text-primary-subtle-fg',
                  !done && !active && 'border-border bg-surface text-fg-subtle',
                )}
              >
                {done ? <Check aria-hidden className="size-3.5" strokeWidth={3} /> : index + 1}
              </span>
              <span className="flex min-w-0 flex-col">
                <span
                  className={cn(
                    'truncate text-sm',
                    active ? 'font-semibold text-fg' : done ? 'font-medium text-fg' : 'text-fg-muted',
                  )}
                >
                  {step.label}
                </span>
                {step.description ? <span className="truncate text-xs text-fg-muted">{step.description}</span> : null}
              </span>
            </Marker>
            {orientation === 'horizontal' && index < steps.length - 1 ? (
              <span aria-hidden className={cn('h-px min-w-4 flex-1', done ? 'bg-primary' : 'bg-border')} />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
