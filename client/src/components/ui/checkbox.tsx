import { Check, Minus } from 'lucide-react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type CheckboxRootProps = ComponentProps<typeof CheckboxPrimitive.Root>

export function CheckboxBox({ className, ...props }: CheckboxRootProps) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'peer grid size-4.5 shrink-0 place-items-center rounded-badge border border-border-strong bg-surface text-primary-fg',
        'transition-colors duration-100 hover:border-primary',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
        'data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary',
        'disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="grid place-items-center">
        {props.checked === 'indeterminate' ? (
          <Minus aria-hidden className="size-3.5" strokeWidth={3} />
        ) : (
          <Check aria-hidden className="size-3.5" strokeWidth={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

interface CheckboxProps extends CheckboxRootProps {
  label?: ReactNode
  description?: ReactNode
  /** Count shown at the end of the row (filter facets). */
  count?: number
}

export function Checkbox({ label, description, count, id, className, ...props }: CheckboxProps) {
  const autoId = useId()
  const boxId = id ?? autoId
  if (!label) return <CheckboxBox id={boxId} className={className} {...props} />
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <CheckboxBox id={boxId} className="mt-0.5" {...props} />
      <label htmlFor={boxId} className="flex min-w-0 flex-1 cursor-pointer items-baseline justify-between gap-2 text-sm leading-5 text-fg">
        <span className="flex flex-col">
          <span>{label}</span>
          {description ? <span className="text-xs text-fg-muted">{description}</span> : null}
        </span>
        {count !== undefined ? <span className="text-xs text-fg-subtle tabular">{count}</span> : null}
      </label>
    </div>
  )
}
