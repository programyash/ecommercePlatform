import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { StatusTone } from '@/lib/status'

/** A plotted row: one category/date plus its numeric series. */
export type ChartRow = Record<string, string | number>

/** Fixed slot order — a series keeps its colour even when the filter changes. */
export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
] as const

export type ChartSlot = 1 | 2 | 3 | 4 | 5 | 6

export function chartColor(slot: ChartSlot): string {
  return CHART_COLORS[slot - 1] ?? CHART_COLORS[0]
}

/**
 * Status colours for a chart whose categories are statuses. They come from the status
 * tones, not the categorical ramp, so a bar is the same colour as its badge — and the
 * axis label still carries the meaning, because tones repeat across statuses.
 */
export const STATUS_TONE_COLOR: Record<StatusTone, string> = {
  neutral: 'var(--chart-other)',
  info: 'var(--info)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
}

export interface SeriesSpec {
  key: string
  label: string
  slot: ChartSlot
  /** Formats values in the tooltip and the table view. */
  format?: (value: number) => string
}

export const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fill: 'var(--chart-axis)', fontSize: 11 },
  style: { fontVariantNumeric: 'tabular-nums' },
} as const

export const gridProps = {
  stroke: 'var(--chart-grid)',
  strokeDasharray: '3 3',
  vertical: false,
} as const

interface TooltipPayloadEntry {
  dataKey?: string | number
  name?: string | number
  value?: number | string
  color?: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string | number
  series: SeriesSpec[]
  labelFormatter?: (label: string | number) => string
}

/** Shared tooltip: values in ink, a colour dot carries identity. */
export function ChartTooltip({ active, payload, label, series, labelFormatter }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-40 rounded-popover border border-border bg-surface p-2.5 shadow-popover">
      {label !== undefined ? (
        <p className="mb-1.5 type-caption font-semibold text-fg">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      ) : null}
      <ul className="flex flex-col gap-1">
        {payload.map((entry) => {
          const spec = series.find((s) => s.key === entry.dataKey) ?? series.find((s) => s.label === entry.name)
          const value = typeof entry.value === 'number' ? entry.value : Number(entry.value ?? 0)
          return (
            <li key={String(entry.dataKey ?? entry.name)} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 type-caption text-fg-muted">
                <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {spec?.label ?? entry.name}
              </span>
              <span className="type-caption font-semibold text-fg tabular">
                {spec?.format ? spec.format(value) : value.toLocaleString('en-IN')}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface ChartLegendProps {
  series: SeriesSpec[]
  className?: string
  children?: ReactNode
}

/** Always present for two or more series, so identity is never colour-alone. */
export function ChartLegend({ series, className, children }: ChartLegendProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 px-2 pb-1', className)}>
      {series.map((spec) => (
        <span key={spec.key} className="flex items-center gap-1.5 type-caption text-fg-muted">
          <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: chartColor(spec.slot) }} />
          {spec.label}
        </span>
      ))}
      {children}
    </div>
  )
}
