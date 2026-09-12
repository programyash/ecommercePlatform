import type { PayoutLine } from '@/data'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'

interface SettlementLinesProps {
  lines: readonly PayoutLine[]
  net: number
  caption: string
  /** "Net payout" on a statement, "You earn" in an estimate. */
  netLabel?: string
  className?: string
}

/**
 * The settlement, printed the way the statement reads: sale value, then every
 * deduction in order, then what reaches the bank.
 */
export function SettlementLines({ lines, net, caption, netLabel = 'Net payout', className }: SettlementLinesProps) {
  return (
    <table className={cn('w-full border-collapse text-left', className)}>
      <caption className="sr-only">{caption}</caption>
      <tbody>
        {lines.map((line) => (
          <tr key={`${line.kind}-${line.label}`} className="border-b border-border-subtle">
            <th scope="row" className={cn('py-2 pr-3 type-body font-normal', line.kind === 'sale' ? 'text-fg' : 'text-fg-muted')}>
              {line.label}
            </th>
            <td className={cn('py-2 text-right type-body tabular', line.kind === 'sale' ? 'text-fg' : 'text-fg-muted')}>
              {formatINR(line.amount, { decimals: 2 })}
            </td>
          </tr>
        ))}
        <tr>
          <th scope="row" className="pt-3 pr-3 type-label text-fg">
            {netLabel}
          </th>
          <td className="pt-3 text-right type-price text-fg">{formatINR(net, { decimals: 2 })}</td>
        </tr>
      </tbody>
    </table>
  )
}
