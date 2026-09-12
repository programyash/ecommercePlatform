import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ReportColumn } from '@/data'
import { cn } from '@/lib/cn'
import { formatDayMonth, formatINR, formatNumber, formatPercent } from '@/lib/format'

export type ReportRow = Record<string, string | number>

interface ReportTableProps {
  caption: string
  columns: ReportColumn[]
  rows: ReportRow[]
  /** Footer row; percentages that cannot be summed are passed as an empty string. */
  totals?: ReportRow
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/

function formatCell(column: ReportColumn, value: string | number | undefined): string {
  if (value === undefined || value === '') return '—'
  if (typeof value === 'string') {
    return column.key === 'day' && DAY_KEY.test(value) ? formatDayMonth(value) : value
  }
  switch (column.format) {
    case 'inr':
      return formatINR(value)
    case 'percent':
      return formatPercent(value, { decimals: 1 })
    case 'number':
      return formatNumber(value)
    default:
      return String(value)
  }
}

/**
 * The chart's numbers, spelled out. Sortable, with a totals row, and the first
 * column stays put while the rest scroll sideways on phones.
 */
export function ReportTable({ caption, columns, rows, totals }: ReportTableProps) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const factor = sort.dir === 'asc' ? 1 : -1
    return [...rows]
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const av = a.row[sort.key]
        const bv = b.row[sort.key]
        if (av === bv) return a.index - b.index
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor
        return String(av ?? '').localeCompare(String(bv ?? ''), 'en-IN') * factor
      })
      .map((entry) => entry.row)
  }, [rows, sort])

  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border bg-surface-2">
            {columns.map((column, index) => {
              const isSorted = sort?.key === column.key
              const alignEnd = column.align === 'right'
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={isSorted ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={cn(
                    'px-3 py-2.5 type-caption font-semibold whitespace-nowrap text-fg-muted',
                    alignEnd && 'text-right',
                    index === 0 && 'sticky left-0 z-10 bg-surface-2',
                  )}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSort((prev) =>
                        prev?.key === column.key
                          ? { key: column.key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                          : { key: column.key, dir: alignEnd ? 'desc' : 'asc' },
                      )
                    }
                    className={cn(
                      'inline-flex items-center gap-1 rounded-badge hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      alignEnd && 'flex-row-reverse',
                      isSorted && 'text-fg',
                    )}
                  >
                    {column.label}
                    {isSorted ? (
                      sort.dir === 'asc' ? (
                        <ArrowUp aria-hidden className="size-3.5" />
                      ) : (
                        <ArrowDown aria-hidden className="size-3.5" />
                      )
                    ) : (
                      <ChevronsUpDown aria-hidden className="size-3.5 text-fg-disabled" />
                    )}
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, rowIndex) => (
            <tr key={`${String(row[columns[0]?.key ?? 'row'] ?? rowIndex)}-${rowIndex}`} className="border-b border-border-subtle last:border-b-0">
              {columns.map((column, index) => (
                <td
                  key={column.key}
                  className={cn(
                    'px-3 py-2.5 type-body text-fg',
                    column.align === 'right' && 'text-right tabular',
                    index === 0 && 'sticky left-0 z-10 bg-surface whitespace-nowrap',
                  )}
                >
                  {formatCell(column, row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {totals ? (
          <tfoot>
            <tr className="border-t border-border bg-surface-2">
              {columns.map((column, index) => (
                <th
                  key={column.key}
                  scope={index === 0 ? 'row' : undefined}
                  className={cn(
                    'px-3 py-2.5 type-label text-fg',
                    column.align === 'right' ? 'text-right tabular' : 'text-left',
                    index === 0 && 'sticky left-0 z-10 bg-surface-2 whitespace-nowrap',
                  )}
                >
                  {formatCell(column, totals[column.key])}
                </th>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  )
}
