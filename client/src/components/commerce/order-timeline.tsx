import type { TimelineEvent } from '@/data/types'
import { StatusIcon } from '@/components/ui/status-icon'
import { cn } from '@/lib/cn'
import { formatDateTime, formatRelative } from '@/lib/format'
import { TIMELINE_ICON } from '@/lib/status'

interface OrderTimelineProps {
  events: TimelineEvent[]
  /** Horizontal tracker on desktop order pages; vertical everywhere else. */
  orientation?: 'vertical' | 'horizontal'
  /** Steps still to come, shown greyed after the last event. */
  upcoming?: { code: string; label: string }[]
  className?: string
}

/** The same tracker for the shopper, the seller and the admin — one event log. */
export function OrderTimeline({ events, orientation = 'vertical', upcoming = [], className }: OrderTimelineProps) {
  if (orientation === 'horizontal') {
    const steps = [...events.map((event) => ({ ...event, done: true })), ...upcoming.map((step) => ({ ...step, done: false, at: null }))]
    return (
      <ol className={cn('flex w-full items-start', className)}>
        {steps.map((step, index) => (
          <li key={`${step.code}-${index}`} className="flex min-w-0 flex-1 flex-col gap-1.5 last:flex-none">
            <div className="flex w-full items-center gap-1">
              <span
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full border [&_svg]:size-3.5',
                  step.done ? 'border-success bg-success text-success-fg' : 'border-border bg-surface text-fg-subtle',
                )}
              >
                <StatusIcon name={TIMELINE_ICON[step.code as keyof typeof TIMELINE_ICON] ?? 'circle-dot'} />
              </span>
              {index < steps.length - 1 ? (
                <span aria-hidden className={cn('h-px min-w-3 flex-1', step.done ? 'bg-success' : 'bg-border')} />
              ) : null}
            </div>
            {/* Six equal columns: the label wraps rather than truncates, and the
                timestamp goes relative so it fits — the exact time is on hover. */}
            <div className="flex min-w-0 flex-col pr-3">
              <span className={cn('type-caption text-pretty', step.done ? 'font-medium text-fg' : 'text-fg-muted')}>
                {step.label}
              </span>
              {'at' in step && step.at ? (
                <span className="type-caption text-fg-muted" title={formatDateTime(step.at)}>
                  {formatRelative(step.at)}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    )
  }

  return (
    <ol className={cn('flex flex-col', className)}>
      {events.map((event, index) => (
        <li key={event.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="grid size-7 shrink-0 place-items-center rounded-full border border-success bg-success-subtle text-success-subtle-fg [&_svg]:size-3.5">
              <StatusIcon name={TIMELINE_ICON[event.code] ?? 'circle-dot'} />
            </span>
            {index < events.length - 1 + upcoming.length ? <span aria-hidden className="w-px flex-1 bg-border" /> : null}
          </div>
          <div className="flex min-w-0 flex-col gap-0.5 pb-5">
            <p className="type-label text-fg">{event.label}</p>
            <p className="type-caption text-fg-muted">
              <time dateTime={event.at} title={formatDateTime(event.at)}>
                {formatRelative(event.at)}
              </time>
              {event.location ? ` · ${event.location}` : ''}
            </p>
            {event.note ? <p className="type-caption text-fg-muted">{event.note}</p> : null}
          </div>
        </li>
      ))}
      {upcoming.map((step, index) => (
        <li key={`${step.code}-${index}`} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="grid size-7 shrink-0 place-items-center rounded-full border border-border bg-surface text-fg-subtle [&_svg]:size-3.5">
              <StatusIcon name={TIMELINE_ICON[step.code as keyof typeof TIMELINE_ICON] ?? 'circle-dot'} />
            </span>
            {index < upcoming.length - 1 ? <span aria-hidden className="w-px flex-1 bg-border" /> : null}
          </div>
          <div className="flex min-w-0 flex-col gap-0.5 pb-5">
            <p className="type-label text-fg-muted">{step.label}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
