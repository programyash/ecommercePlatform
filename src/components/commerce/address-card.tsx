import { Home, MapPin, Briefcase } from 'lucide-react'
import type { Address } from '@/data/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'
import { formatPhone } from '@/lib/mask'

const typeIcon = { home: Home, work: Briefcase, other: MapPin } as const

interface AddressCardProps {
  address: Address
  isDefault?: boolean
  /** Renders as a radio option in checkout. */
  selectable?: boolean
  selected?: boolean
  onSelect?: (addressId: string) => void
  actions?: React.ReactNode
  className?: string
}

export function AddressCard({ address, isDefault, selectable, selected, onSelect, actions, className }: AddressCardProps) {
  const Icon = typeIcon[address.type]
  const body = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="type-label text-fg">{address.name}</span>
        <Badge tone="neutral" size="sm" icon={<Icon aria-hidden />}>
          {address.type === 'home' ? 'Home' : address.type === 'work' ? 'Work' : 'Other'}
        </Badge>
        {isDefault ? (
          <Badge tone="primary" size="sm">
            Default
          </Badge>
        ) : null}
      </div>
      <p className="type-body text-fg-muted">
        {address.line1}
        {address.line2 ? `, ${address.line2}` : ''}
        {/* Landmarks are written however people write them — "Near Carter Road",
            "Opposite the BSNL office" — so only add "near" when it isn't already there. */}
        {address.landmark
          ? `, ${/^(near|opposite|behind|beside|next to|above|below)\b/i.test(address.landmark.trim()) ? address.landmark : `near ${address.landmark}`}`
          : ''}
        <br />
        {address.city}, {address.state} {address.pin}
      </p>
      <p className="type-caption text-fg-muted">{formatPhone(address.phone)}</p>
    </>
  )

  if (selectable) {
    return (
      <label
        className={cn(
          'flex cursor-pointer gap-3 rounded-card border p-4 transition-colors',
          selected ? 'border-primary bg-primary-subtle/40' : 'border-border bg-surface hover:border-border-strong',
          className,
        )}
      >
        <input
          type="radio"
          name="address"
          value={address.id}
          checked={selected}
          onChange={() => onSelect?.(address.id)}
          className="mt-1 size-4.5 accent-primary"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          {body}
          {actions ? <span className="flex flex-wrap gap-2 pt-1">{actions}</span> : null}
        </span>
      </label>
    )
  }

  return (
    <div className={cn('flex flex-col gap-1.5 rounded-card border border-border bg-surface p-4', className)}>
      {body}
      {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
    </div>
  )
}
