import { Tabs as TabsPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useUrlState } from '@/lib/use-url-state'

export interface TabItem {
  value: string
  label: ReactNode
  /** Count shown after the label. */
  count?: number
  disabled?: boolean
}

interface TabsProps {
  items: TabItem[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  variant?: 'underline' | 'pill'
  /** Content panels keyed by value; omit when tabs only drive a filter. */
  panels?: Record<string, ReactNode>
  'aria-label'?: string
  className?: string
  listClassName?: string
}

const listClass = (variant: 'underline' | 'pill', extra?: string) =>
  cn(
    'flex max-w-full items-center overflow-x-auto no-scrollbar',
    variant === 'underline' ? 'gap-5 border-b border-border' : 'gap-1.5',
    extra,
  )

const triggerClass = (variant: 'underline' | 'pill') =>
  cn(
    'group inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-medium text-fg-muted transition-colors',
    'hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-45',
    variant === 'underline'
      ? '-mb-px h-10 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-fg'
      : 'h-8 rounded-pill border border-border px-3 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-fg',
  )

function Count({ value, variant }: { value: number; variant: 'underline' | 'pill' }) {
  return (
    <span
      className={cn(
        'rounded-pill px-1.5 text-2xs leading-4 tabular',
        variant === 'underline'
          ? 'bg-surface-3 text-fg-muted group-data-[state=active]:bg-primary-subtle group-data-[state=active]:text-primary-subtle-fg'
          : 'bg-surface-3 text-fg-muted group-data-[state=active]:bg-primary-fg/20 group-data-[state=active]:text-primary-fg',
      )}
    >
      {value}
    </span>
  )
}

export function Tabs({
  items,
  value,
  defaultValue,
  onValueChange,
  variant = 'underline',
  panels,
  className,
  listClassName,
  ...aria
}: TabsProps) {
  // With no panels these are filters, not tabs: `role="tab"` would promise an
  // `aria-controls` panel that does not exist. Toggle buttons tell the truth.
  if (!panels) {
    const active = value ?? defaultValue ?? items[0]?.value
    return (
      <div role="group" {...aria} className={cn(listClass(variant, listClassName), className)}>
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            disabled={item.disabled}
            aria-pressed={item.value === active}
            data-state={item.value === active ? 'active' : 'inactive'}
            onClick={() => onValueChange?.(item.value)}
            className={triggerClass(variant)}
          >
            {item.label}
            {item.count !== undefined ? <Count value={item.count} variant={variant} /> : null}
          </button>
        ))}
      </div>
    )
  }

  return (
    <TabsPrimitive.Root value={value} defaultValue={defaultValue ?? items[0]?.value} onValueChange={onValueChange} className={className}>
      <TabsPrimitive.List {...aria} className={listClass(variant, listClassName)}>
        {items.map((item) => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className={triggerClass(variant)}
          >
            {item.label}
            {item.count !== undefined ? <Count value={item.count} variant={variant} /> : null}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {panels
        ? Object.entries(panels).map(([key, node]) => (
            <TabsPrimitive.Content key={key} value={key} className="pt-4 outline-none">
              {node}
            </TabsPrimitive.Content>
          ))
        : null}
    </TabsPrimitive.Root>
  )
}

/** Tabs whose selection lives in `?tab=` so back/forward and deep links work. */
export function UrlTabs({ param = 'tab', items, ...props }: Omit<TabsProps, 'value' | 'onValueChange'> & { param?: string }) {
  const [value, setValue] = useUrlState(param, items[0]?.value ?? '')
  return <Tabs items={items} value={value} onValueChange={setValue} {...props} />
}
