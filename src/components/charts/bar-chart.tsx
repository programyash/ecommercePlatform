import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { axisProps, chartColor, ChartLegend, ChartTooltip, gridProps, type ChartRow, type SeriesSpec } from './chart-theme'

interface BarBreakdownChartProps {
  data: ChartRow[]
  categoryKey: string
  series: SeriesSpec[]
  layout?: 'vertical' | 'horizontal'
  stacked?: boolean
  formatValue?: (value: number) => string
  /** Colour each category differently (single-series breakdowns). */
  colorByCategory?: boolean
  /**
   * One CSS colour per row, in row order — for breakdowns whose categories already
   * own a colour (statuses take their tone from the status registry). Preferred over
   * `colorByCategory` past six categories, since the categorical ramp is never cycled.
   */
  cellColors?: string[]
  onSelect?: (category: string) => void
}

/**
 * `horizontal` = bars grow upward (time-like categories); `vertical` = bars grow
 * rightward with the labels down the side (rankings, long names).
 */
export function BarBreakdownChart({
  data,
  categoryKey,
  series,
  layout = 'horizontal',
  stacked = false,
  formatValue,
  colorByCategory = false,
  cellColors,
  onSelect,
}: BarBreakdownChartProps) {
  const isVertical = layout === 'vertical'
  return (
    <div className="flex h-full flex-col">
      {series.length > 1 ? <ChartLegend series={series} /> : null}
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout={isVertical ? 'vertical' : 'horizontal'}
            margin={{ top: 4, right: 12, bottom: 0, left: isVertical ? 8 : 0 }}
            barCategoryGap={isVertical ? '22%' : '28%'}
          >
            <CartesianGrid {...gridProps} vertical={isVertical} horizontal={!isVertical} />
            {isVertical ? (
              <>
                <XAxis type="number" {...axisProps} tickFormatter={formatValue ? (v: number) => formatValue(v) : undefined} />
                <YAxis type="category" dataKey={categoryKey} {...axisProps} width={120} />
              </>
            ) : (
              <>
                <XAxis dataKey={categoryKey} {...axisProps} interval="preserveStartEnd" />
                <YAxis {...axisProps} width={56} tickFormatter={formatValue ? (v: number) => formatValue(v) : undefined} />
              </>
            )}
            <Tooltip
              cursor={{ fill: 'var(--surface-2)' }}
              content={<ChartTooltip series={series} />}
            />
            {series.map((spec) => (
              <Bar
                key={spec.key}
                dataKey={spec.key}
                name={spec.label}
                stackId={stacked ? 'stack' : undefined}
                fill={chartColor(spec.slot)}
                // 4px rounded data-end, anchored to the baseline.
                radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                maxBarSize={isVertical ? 22 : 44}
                isAnimationActive={false}
                // 2px surface gap between stacked segments.
                stroke={stacked ? 'var(--surface)' : undefined}
                strokeWidth={stacked ? 2 : undefined}
                onClick={onSelect ? (entry: unknown) => {
                  const row = entry as Record<string, unknown>
                  const value = row?.[categoryKey]
                  if (typeof value === 'string') onSelect(value)
                } : undefined}
                className={onSelect ? 'cursor-pointer' : undefined}
              >
                {/* The categorical ramp is assigned in fixed order and never cycled: past
                    the sixth category the bars go neutral and the axis label carries the
                    identity. Pass `cellColors` when the categories own a colour already. */}
                {cellColors
                  ? data.map((_, index) => <Cell key={index} fill={cellColors[index] ?? 'var(--chart-other)'} />)
                  : colorByCategory
                    ? data.map((_, index) => (
                        <Cell
                          key={index}
                          fill={index < 6 ? chartColor((index + 1) as SeriesSpec['slot']) : 'var(--chart-other)'}
                        />
                      ))
                    : null}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
