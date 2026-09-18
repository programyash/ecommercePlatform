import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { chartColor, ChartTooltip, type ChartSlot, type SeriesSpec } from './chart-theme'

export interface DonutSlice {
  label: string
  value: number
  slot?: ChartSlot
}

interface DonutChartProps {
  data: DonutSlice[]
  /** Big number in the middle (the total, usually). */
  centerValue?: string
  centerLabel?: string
  formatValue?: (value: number) => string
}

/** Composition at a glance: at most six slices, each directly labelled in the legend. */
export function DonutChart({ data, centerValue, centerLabel, formatValue }: DonutChartProps) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0)
  const series: SeriesSpec[] = data.map((slice, index) => ({
    key: slice.label,
    label: slice.label,
    slot: slice.slot ?? (((index % 6) + 1) as ChartSlot),
    format: formatValue,
  }))

  return (
    <div className="flex h-full items-center gap-3">
      <div className="relative h-full min-w-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.map((slice) => ({ ...slice, name: slice.label }))}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="var(--surface)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((slice, index) => (
                <Cell key={slice.label} fill={chartColor(slice.slot ?? (((index % 6) + 1) as ChartSlot))} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip series={series} />} />
          </PieChart>
        </ResponsiveContainer>
        {centerValue ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="type-h3 text-fg tabular">{centerValue}</p>
              {centerLabel ? <p className="type-caption text-fg-muted">{centerLabel}</p> : null}
            </div>
          </div>
        ) : null}
      </div>
      <ul className="flex max-h-full shrink-0 flex-col gap-1.5 overflow-y-auto pr-1 scrollbar-thin">
        {data.map((slice, index) => (
          <li key={slice.label} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: chartColor(slice.slot ?? (((index % 6) + 1) as ChartSlot)) }}
            />
            <span className="min-w-0 flex-1 truncate type-caption text-fg-muted">{slice.label}</span>
            <span className="type-caption font-semibold text-fg tabular">
              {total ? Math.round((slice.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
