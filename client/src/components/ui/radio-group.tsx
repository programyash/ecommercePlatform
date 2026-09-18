import { RadioGroup as RadioPrimitive } from 'radix-ui'
import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface RadioOption {
  value: string
  label: ReactNode
  description?: ReactNode
  /** Right-aligned extra, e.g. a price or "Free". */
  meta?: ReactNode
  icon?: ReactNode
  disabled?: boolean
}

interface RadioGroupProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  options: RadioOption[]
  /** `card` renders each option as a selectable bordered row (payment, delivery speed). */
  variant?: 'default' | 'card'
  orientation?: 'vertical' | 'horizontal'
  name?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  className?: string
  disabled?: boolean
}

export function RadioGroup({
  value,
  defaultValue,
  onValueChange,
  options,
  variant = 'default',
  orientation = 'vertical',
  name,
  className,
  disabled,
  ...aria
}: RadioGroupProps) {
  const groupId = useId()
  return (
    <RadioPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      orientation={orientation}
      name={name}
      disabled={disabled}
      {...aria}
      className={cn(orientation === 'horizontal' ? 'flex flex-wrap gap-2' : 'flex flex-col gap-2', className)}
    >
      {options.map((option) => {
        const id = `${groupId}-${option.value}`
        return (
          <label
            key={option.value}
            htmlFor={id}
            className={cn(
              'flex cursor-pointer items-start gap-3 text-sm text-fg',
              variant === 'card' &&
                'rounded-control border border-border bg-surface p-3 transition-colors hover:border-border-strong has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-subtle/40',
              option.disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <RadioPrimitive.Item
              id={id}
              value={option.value}
              disabled={option.disabled}
              className={cn(
                'mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full border border-border-strong bg-surface',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                'data-[state=checked]:border-primary',
              )}
            >
              <RadioPrimitive.Indicator className="size-2.5 rounded-full bg-primary" />
            </RadioPrimitive.Item>
            {option.icon ? <span className="mt-px flex text-fg-muted [&_svg]:size-5">{option.icon}</span> : null}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium">{option.label}</span>
              {option.description ? <span className="text-xs text-fg-muted">{option.description}</span> : null}
            </span>
            {option.meta ? <span className="shrink-0 text-sm text-fg-muted">{option.meta}</span> : null}
          </label>
        )
      })}
    </RadioPrimitive.Root>
  )
}
