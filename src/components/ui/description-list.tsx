import { Check, Copy } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface DescriptionItem {
  term: ReactNode
  detail: ReactNode
  /** Show a copy button (order ids, GSTIN, AWB). */
  copyValue?: string
}

interface DescriptionListProps {
  items: DescriptionItem[]
  /** `rows` stacks term over detail; `inline` puts them side by side. */
  layout?: 'rows' | 'inline'
  columns?: 1 | 2 | 3
  className?: string
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      }}
      aria-label={copied ? 'Copied' : `Copy ${value}`}
      className="grid size-6 place-items-center rounded-badge text-fg-subtle hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
    >
      {copied ? <Check aria-hidden className="size-3.5 text-success" /> : <Copy aria-hidden className="size-3.5" />}
    </button>
  )
}

/** Label/value pairs: order summaries, seller details, settings read-outs. */
export function DescriptionList({ items, layout = 'rows', columns = 1, className }: DescriptionListProps) {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-3',
        columns === 2 && 'sm:grid-cols-2',
        columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className={cn('min-w-0', layout === 'inline' ? 'flex items-baseline justify-between gap-3' : 'flex flex-col gap-0.5')}
        >
          <dt className="type-caption text-fg-muted">{item.term}</dt>
          <dd className={cn('flex min-w-0 items-center gap-1 type-body text-fg', layout === 'inline' && 'text-right')}>
            <span className="min-w-0 truncate">{item.detail}</span>
            {item.copyValue ? <CopyButton value={item.copyValue} /> : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}
