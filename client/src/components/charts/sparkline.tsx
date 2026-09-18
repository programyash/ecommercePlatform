import { chartColor, type ChartSlot } from './chart-theme'

interface SparklineProps {
  values: number[]
  slot?: ChartSlot
  width?: number
  height?: number
  className?: string
  /** Describe the trend for assistive tech, e.g. "Net sales, last 30 days". */
  label: string
}

/**
 * Hand-rolled SVG: a KPI's own trend, never decoration. No Recharts container,
 * so it costs nothing in a dense strip.
 */
export function Sparkline({ values, slot = 1, width = 96, height = 28, className, label }: SparklineProps) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const step = width / (values.length - 1)
  const points = values.map((value, index) => [index * step, height - ((value - min) / span) * (height - 3) - 1.5] as const)
  const path = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const last = points[points.length - 1]!

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={label}
      className={className}
      preserveAspectRatio="none"
    >
      <path d={path} fill="none" stroke={chartColor(slot)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={chartColor(slot)} />
    </svg>
  )
}
