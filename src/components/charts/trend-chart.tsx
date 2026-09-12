import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { axisProps, chartColor, ChartLegend, ChartTooltip, gridProps, type ChartRow, type SeriesSpec } from './chart-theme'

interface TrendChartProps {
  data: ChartRow[]
  xKey: string
  series: SeriesSpec[]
  /** Area reads as volume over time; line keeps two comparable series legible. */
  kind?: 'area' | 'line'
  formatX?: (value: string) => string
  formatY?: (value: number) => string
  /** Dashed comparison series (previous period) drawn behind the current one. */
  compareKey?: string
  compareLabel?: string
}

/**
 * One y-axis, always. Two measures on different scales get two charts, never a
 * second axis.
 */
export function TrendChart({
  data,
  xKey,
  series,
  kind = 'area',
  formatX,
  formatY,
  compareKey,
  compareLabel = 'Previous period',
}: TrendChartProps) {
  const legendSeries = compareKey
    ? [...series, { key: compareKey, label: compareLabel, slot: 6 as const }]
    : series
  const Chart = kind === 'area' ? AreaChart : LineChart

  return (
    <div className="flex h-full flex-col">
      {legendSeries.length > 1 ? <ChartLegend series={legendSeries} /> : null}
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis
              dataKey={xKey}
              {...axisProps}
              minTickGap={24}
              tickFormatter={formatX ? (value: string) => formatX(value) : undefined}
            />
            <YAxis
              {...axisProps}
              width={56}
              tickFormatter={formatY ? (value: number) => formatY(value) : undefined}
            />
            <Tooltip
              cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '4 4' }}
              content={<ChartTooltip series={legendSeries} labelFormatter={formatX as (l: string | number) => string} />}
            />
            {compareKey ? (
              kind === 'area' ? (
                <Area
                  type="monotone"
                  dataKey={compareKey}
                  stroke="var(--chart-6)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fill="none"
                  dot={false}
                  isAnimationActive={false}
                />
              ) : (
                <Line
                  type="monotone"
                  dataKey={compareKey}
                  stroke="var(--chart-6)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
              )
            ) : null}
            {series.map((spec) =>
              kind === 'area' ? (
                <Area
                  key={spec.key}
                  type="monotone"
                  dataKey={spec.key}
                  name={spec.label}
                  stroke={chartColor(spec.slot)}
                  strokeWidth={2}
                  fill={chartColor(spec.slot)}
                  fillOpacity={0.12}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
                  isAnimationActive={false}
                />
              ) : (
                <Line
                  key={spec.key}
                  type="monotone"
                  dataKey={spec.key}
                  name={spec.label}
                  stroke={chartColor(spec.slot)}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
                  isAnimationActive={false}
                />
              ),
            )}
          </Chart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
