import { Switch as SwitchPrimitive } from 'radix-ui'
import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface SwitchProps extends ComponentProps<typeof SwitchPrimitive.Root> {
  label?: ReactNode
  description?: ReactNode
}

export function Switch({ label, description, id, className, ...props }: SwitchProps) {
  const autoId = useId()
  const switchId = id ?? autoId
  const control = (
    <SwitchPrimitive.Root
      id={switchId}
      className={cn(
        'relative inline-flex h-5.5 w-9.5 shrink-0 items-center rounded-pill bg-border-strong transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'data-[state=checked]:bg-primary disabled:cursor-not-allowed disabled:opacity-50',
        !label && className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-4.5 translate-x-0.5 rounded-full bg-surface shadow-card transition-transform duration-150 ease-standard data-[state=checked]:translate-x-4.5" />
    </SwitchPrimitive.Root>
  )
  if (!label) return control
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <label htmlFor={switchId} className="flex cursor-pointer flex-col text-sm">
        <span className="font-medium text-fg">{label}</span>
        {description ? <span className="text-xs text-fg-muted">{description}</span> : null}
      </label>
      {control}
    </div>
  )
}
