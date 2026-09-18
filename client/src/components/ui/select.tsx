import { Check, ChevronDown } from 'lucide-react'
import { Select as SelectPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { fieldBase } from './field-base'

export interface SelectOption {
  /** Never an empty string (Radix reserves it) — use a sentinel like 'all'. */
  value: string
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
}

interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  size?: 'sm' | 'md'
  invalid?: boolean
  disabled?: boolean
  id?: string
  name?: string
  'aria-label'?: string
  'aria-describedby'?: string
  className?: string
  /** Rendered before the value inside the trigger, e.g. "Sort:". */
  leading?: ReactNode
}

export function Select({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = 'Select',
  size = 'md',
  invalid,
  disabled,
  id,
  name,
  className,
  leading,
  ...aria
}: SelectProps) {
  return (
    <SelectPrimitive.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange} disabled={disabled} name={name}>
      <SelectPrimitive.Trigger
        id={id}
        aria-invalid={invalid || undefined}
        {...aria}
        className={cn(
          fieldBase,
          'inline-flex items-center justify-between gap-2 px-3 text-left',
          'focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25',
          'data-[placeholder]:text-fg-subtle disabled:cursor-not-allowed disabled:bg-surface-2',
          size === 'sm' ? 'h-control-sm text-sm' : 'h-control-md text-base md:text-sm',
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          {leading ? <span className="shrink-0 text-fg-muted">{leading}</span> : null}
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown aria-hidden className="size-4 shrink-0 text-fg-subtle" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          collisionPadding={8}
          className={cn(
            'z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden',
            'rounded-popover border border-border bg-surface text-fg shadow-popover',
            'origin-(--radix-select-content-transform-origin) data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out',
          )}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={cn(
                  'relative flex cursor-pointer select-none items-start gap-2 rounded-badge py-2 pr-8 pl-2.5 text-sm outline-none',
                  'data-[highlighted]:bg-surface-2 data-[disabled]:pointer-events-none data-[disabled]:text-fg-disabled',
                )}
              >
                <div className="flex flex-col">
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  {option.description ? <span className="text-xs text-fg-muted">{option.description}</span> : null}
                </div>
                <SelectPrimitive.ItemIndicator className="absolute top-2.5 right-2.5">
                  <Check aria-hidden className="size-4 text-primary" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
