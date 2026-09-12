import { Bell } from 'lucide-react'
import { Link } from 'react-router'
import type { Notification } from '@/data/types'
import { IconButton } from '@/components/ui/icon-button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { StatusIcon } from '@/components/ui/status-icon'
import { cn } from '@/lib/cn'
import { formatRelative } from '@/lib/format'
import type { StatusIconKey } from '@/lib/status'

const KIND_ICON: Record<Notification['kind'], StatusIconKey> = {
  order: 'package',
  shipment: 'truck',
  payout: 'wallet',
  review: 'flag',
  stock: 'triangle-alert',
  kyc: 'shield-check',
  listing: 'file-pen',
  system: 'circle-dot',
  promo: 'badge-check',
}

interface NotificationsPopoverProps {
  items: Notification[]
  onOpen?: () => void
  size?: 'sm' | 'md'
}

export function NotificationsPopover({ items, onOpen, size = 'md' }: NotificationsPopoverProps) {
  const unread = items.filter((item) => !item.read).length

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) onOpen?.()
      }}
    >
      <PopoverTrigger asChild>
        <IconButton label="Notifications" size={size} icon={<Bell aria-hidden />} badge={unread || undefined} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-3 py-2">
          <p className="type-label">Notifications</p>
          {unread ? <span className="type-caption text-fg-muted">{unread} unread</span> : null}
        </div>
        {items.length === 0 ? (
          <p className="px-3 py-8 text-center type-body text-fg-muted">You’re all caught up.</p>
        ) : (
          <ul className="max-h-96 overflow-y-auto scrollbar-thin">
            {items.slice(0, 12).map((item) => {
              const body = (
                <>
                  <span
                    className={cn(
                      'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full [&_svg]:size-3.5',
                      item.read ? 'bg-surface-2 text-fg-muted' : 'bg-primary-subtle text-primary-subtle-fg',
                    )}
                  >
                    <StatusIcon name={KIND_ICON[item.kind]} />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className={cn('type-body', item.read ? 'text-fg-muted' : 'font-medium text-fg')}>{item.title}</span>
                    <span className="type-caption text-fg-muted">{item.body}</span>
                    <span className="type-caption text-fg-subtle">{formatRelative(item.at)}</span>
                  </span>
                </>
              )
              return (
                <li key={item.id} className="border-b border-border-subtle last:border-b-0">
                  {item.href ? (
                    <Link to={item.href} className="flex gap-2.5 px-3 py-2.5 transition-colors hover:bg-surface-2">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex gap-2.5 px-3 py-2.5">{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
