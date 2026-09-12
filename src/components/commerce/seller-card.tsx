import { BadgeCheck, MapPin, Store } from 'lucide-react'
import { Link } from 'react-router'
import type { Seller } from '@/data/types'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import { Rating } from './rating'

interface SellerCardProps {
  seller: Seller
  /** Compact line for the buy box; full card for the store page and listings. */
  variant?: 'inline' | 'card'
  /** e.g. "3 other sellers from ₹17,749" */
  otherOffers?: React.ReactNode
  className?: string
}

export function SellerCard({ seller, variant = 'inline', otherOffers, className }: SellerCardProps) {
  const verified = seller.status === 'active'

  if (variant === 'inline') {
    return (
      <div className={cn('flex flex-col gap-1.5 rounded-card border border-border bg-surface p-3', className)}>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 type-body">
          <span className="text-fg-muted">Sold by</span>
          <Link to={`/store/${seller.slug}`} className="type-label text-link hover:underline underline-offset-2">
            {seller.displayName}
          </Link>
          {verified ? (
            <span className="inline-flex items-center gap-1 type-caption text-success-subtle-fg">
              <BadgeCheck aria-hidden className="size-3.5" />
              Verified
            </span>
          ) : null}
          {seller.rating ? <Rating value={seller.rating} count={seller.ratingCount} /> : null}
        </p>
        <p className="flex items-center gap-1.5 type-caption text-fg-muted">
          <MapPin aria-hidden className="size-3.5" />
          Ships from {seller.city}, {seller.state}
        </p>
        {otherOffers}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-4 rounded-card border border-border bg-surface p-4', className)}>
      <Avatar name={seller.displayName} size="lg" shape="square" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="type-h3 text-fg">{seller.displayName}</h2>
          {verified ? (
            <Badge tone="success" size="sm" icon={<BadgeCheck aria-hidden />}>
              Verified seller
            </Badge>
          ) : null}
        </div>
        <p className="type-body text-fg-muted">{seller.tagline}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 type-caption text-fg-muted">
          {seller.rating ? <Rating value={seller.rating} count={seller.ratingCount} /> : null}
          <span className="flex items-center gap-1.5">
            <MapPin aria-hidden className="size-3.5" />
            {seller.city}, {seller.state}
          </span>
          <span className="flex items-center gap-1.5">
            <Store aria-hidden className="size-3.5" />
            Selling since {formatDate(seller.joinedAt)}
          </span>
        </div>
      </div>
    </div>
  )
}
