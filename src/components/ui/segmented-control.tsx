import { ToggleGroup } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface SegmentedControlProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  options: { value: T; label: ReactNode; icon?: ReactNode; 'aria-label'?: string }[]
  size?: 'sm' | 'md'
  'aria-label': string
  className?: string
}

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  size = 'md',
  className,
  ...aria
}: SegmentedControlProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => next && onValueChange(next as T)}
      {...aria}
      className={cn('inline-flex items-center gap-0.5 rounded-control border border-border bg-surface-2 p-0.5', className)}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          aria-label={option['aria-label']}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-badge px-2.5 font-medium text-fg-muted transition-colors',
            'hover:text-fg focus-visible:outline-2 focus-visible:outline-ring data-[state=on]:bg-surface data-[state=on]:text-fg data-[state=on]:shadow-card',
            size === 'sm' ? 'h-7 text-xs [&_svg]:size-3.5' : 'h-8 text-sm [&_svg]:size-4',
          )}
        >
          {option.icon}
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
