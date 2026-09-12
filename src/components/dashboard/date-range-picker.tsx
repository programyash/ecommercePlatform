import { CalendarDays, Check } from 'lucide-react'
import { useState } from 'react'
import type { DateRange, RangePreset } from '@/data/types'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/cn'
import { rangeFromPreset } from '@/lib/date'
import { formatDateRange } from '@/lib/format'

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'mtd', label: 'This month' },
]

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  compare?: boolean
  onCompareChange?: (compare: boolean) => void
  className?: string
}

/** Presets plus two date inputs, and the compare toggle that every dashboard shares. */
export function DateRangePicker({ value, onChange, compare, onCompareChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" leftIcon={<CalendarDays aria-hidden />} className={className}>
          {formatDateRange(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col">
            {PRESETS.map((preset) => {
              const active = value.preset === preset.value
              return (
                <li key={preset.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(rangeFromPreset(preset.value))
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-badge px-2.5 py-2 text-left type-body transition-colors hover:bg-surface-2',
                      active && 'font-semibold text-primary',
                    )}
                  >
                    {preset.label}
                    {active ? <Check aria-hidden className="size-4" /> : null}
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="flex flex-col gap-2 border-t border-border-subtle pt-3">
            <p className="type-caption text-fg-muted">Custom range</p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={value.from}
                max={value.to}
                onChange={(event) => onChange({ from: event.target.value, to: value.to })}
                aria-label="From date"
                className="h-9 w-full rounded-control border border-input bg-surface px-2 type-body text-fg"
              />
              <span className="type-caption text-fg-muted">to</span>
              <input
                type="date"
                value={value.to}
                min={value.from}
                onChange={(event) => onChange({ from: value.from, to: event.target.value })}
                aria-label="To date"
                className="h-9 w-full rounded-control border border-input bg-surface px-2 type-body text-fg"
              />
            </div>
          </div>

          {onCompareChange ? (
            <div className="border-t border-border-subtle pt-3">
              <Switch
                label="Compare with previous period"
                checked={compare}
                onCheckedChange={(checked) => onCompareChange(Boolean(checked))}
              />
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
