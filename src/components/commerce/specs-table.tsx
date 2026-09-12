import type { SpecGroup } from '@/data/types'
import { cn } from '@/lib/cn'

interface SpecsTableProps {
  groups: SpecGroup[]
  className?: string
}

/** Grouped label/value rows — the detail buyers compare across products. */
export function SpecsTable({ groups, className }: SpecsTableProps) {
  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {groups.map((group) => (
        <section key={group.group} className="flex flex-col gap-2">
          <h3 className="type-title text-fg">{group.group}</h3>
          <dl className="grid grid-cols-1 overflow-hidden rounded-card border border-border sm:grid-cols-2">
            {group.items.map((item, index) => (
              <div
                key={item.label}
                className={cn(
                  'flex gap-3 border-b border-border-subtle px-3 py-2.5 last:border-b-0 sm:border-b sm:last:border-b-0',
                  index % 2 === 1 && 'sm:bg-surface-2/60',
                  index % 2 === 0 && 'bg-surface',
                )}
              >
                <dt className="w-40 shrink-0 type-caption text-fg-muted">{item.label}</dt>
                <dd className="min-w-0 flex-1 type-body text-fg">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}
