import { History } from 'lucide-react'
import type { AuditEntry } from '@/data'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDateTime, formatRelative } from '@/lib/format'

interface AuditLogProps {
  entries: AuditEntry[]
  emptyTitle: string
  emptyDescription: string
}

/** Who did what, and when — the same list on sellers, orders and shoppers. */
export function AuditLog({ entries, emptyTitle, emptyDescription }: AuditLogProps) {
  if (entries.length === 0) {
    return <EmptyState variant="compact" icon={<History aria-hidden />} title={emptyTitle} description={emptyDescription} />
  }

  return (
    <ol className="flex flex-col">
      {entries.map((entry, index) => (
        <li key={entry.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-border-strong" />
            {index < entries.length - 1 ? <span aria-hidden className="w-px flex-1 bg-border-subtle" /> : null}
          </div>
          <div className="flex min-w-0 flex-col gap-0.5 pb-4">
            <p className="type-body text-fg">{entry.summary}</p>
            <p className="type-caption text-fg-muted">
              {entry.actorName}
              {' · '}
              <time dateTime={entry.at} title={formatDateTime(entry.at)}>
                {formatRelative(entry.at)}
              </time>
              {' · '}
              <span className="font-mono">{entry.action}</span>
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
