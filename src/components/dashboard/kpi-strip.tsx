import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { Link } from 'react-router'
import type { Kpi } from '@/data/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'
import { formatINR, formatINRCompact, formatNumber, formatNumberCompact, formatPercent, formatRating } from '@/lib/format'
import { Sparkline } from '@/components/charts/sparkline'

function formatValue(kpi: Kpi): { short: string; full: string } {
  switch (kpi.format) {
    case 'inr':
      // Compact only once the number is long enough to need it — an average order
      // value of "₹5K" hides the very digits the reader came for.
      return {
        short: kpi.value >= 100_000 ? formatINRCompact(kpi.value) : formatINR(kpi.value),
        full: formatINR(kpi.value),
      }
    case 'percent':
      return { short: formatPercent(kpi.value), full: formatPercent(kpi.value, { decimals: 2 }) }
    case 'rating':
      return { short: formatRating(kpi.value), full: `${formatRating(kpi.value)} out of 5` }
    default:
      return { short: formatNumberCompact(kpi.value), full: formatNumber(kpi.value) }
  }
}

function Delta({ kpi }: { kpi: Kpi }) {
  if (!kpi.previous) return null
  const change = (kpi.value - kpi.previous) / Math.abs(kpi.previous)
  const flat = Math.abs(change) < 0.001
  const good = kpi.positiveIsGood ? change > 0 : change < 0
  const Icon = flat ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <p
      className={cn(
        'flex items-center gap-1 type-caption font-medium',
        flat ? 'text-fg-muted' : good ? 'text-success-subtle-fg' : 'text-danger-subtle-fg',
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      <span>
        {flat ? 'No change' : formatPercent(Math.abs(change), { decimals: 1 })}
        <span className="sr-only">{flat ? '' : change > 0 ? ' up' : ' down'} versus the previous period</span>
      </span>
    </p>
  )
}

interface KpiStripProps {
  kpis: Kpi[]
  loading?: boolean
  /** Trend line per KPI (its own data, never decoration). */
  showSparklines?: boolean
  className?: string
}

/**
 * One bordered strip divided by hairlines rather than a grid of identical cards —
 * the numbers read as one row of facts, and the page keeps its own structure.
 */
/**
 * The widest row that divides the KPIs evenly, so the strip never ends in a run of
 * empty cells — eight go 4×2, six go 3×2.
 */
function columnsFor(count: number): string {
  if (count % 4 === 0) return 'sm:grid-cols-3 xl:grid-cols-4'
  if (count % 3 === 0) return 'sm:grid-cols-3'
  return 'sm:grid-cols-2 xl:grid-cols-4'
}

export function KpiStrip({ kpis, loading = false, showSparklines = true, className }: KpiStripProps) {
  const count = loading ? 8 : kpis.length
  return (
    <div
      className={cn(
        'grid grid-cols-2 divide-x divide-y divide-border-subtle overflow-hidden rounded-card border border-border bg-surface',
        columnsFor(count),
        className,
      )}
    >
      {(loading ? Array.from({ length: count }, (_, i) => ({ key: `s${i}` }) as Kpi) : kpis).map((kpi) => {
        const value = loading ? null : formatValue(kpi)
        const body = (
          <>
            {loading ? (
              <Skeleton className="h-3.5 w-20" />
            ) : (
              <p className="type-caption text-fg-muted">{kpi.label}</p>
            )}
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <Tooltip content={value!.full} disabled={value!.short === value!.full}>
                <p className="type-kpi text-fg">{value!.short}</p>
              </Tooltip>
            )}
            <div className="flex items-end justify-between gap-2">
              {loading ? <Skeleton className="h-3.5 w-16" /> : <Delta kpi={kpi} />}
              {!loading && showSparklines && kpi.sparkline?.length ? (
                <Sparkline values={kpi.sparkline} label={`${kpi.label} trend`} className="opacity-80" />
              ) : null}
            </div>
          </>
        )
        return kpi.href && !loading ? (
          <Link
            key={kpi.key}
            to={kpi.href}
            className="flex flex-col gap-1.5 p-4 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            {body}
          </Link>
        ) : (
          <div key={kpi.key} className="flex flex-col gap-1.5 p-4">
            {body}
          </div>
        )
      })}
    </div>
  )
}
