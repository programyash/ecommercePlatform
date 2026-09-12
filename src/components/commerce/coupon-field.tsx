import { BadgePercent, Check, X } from 'lucide-react'
import { useState } from 'react'
import type { Coupon } from '@/data/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'

export interface CouponResult {
  ok: boolean
  discount?: number
  /** Exact reason shown to the shopper when it does not apply. */
  reason?: string
}

export interface AvailableCoupon {
  coupon: Coupon
  result: CouponResult
}

interface CouponFieldProps {
  applied?: { code: string; discount: number }
  onApply: (code: string) => CouponResult
  onRemove: () => void
  available: AvailableCoupon[]
  className?: string
}

export function CouponField({ applied, onApply, onRemove, available, className }: CouponFieldProps) {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<CouponResult | null>(null)

  const apply = (next: string) => {
    const outcome = onApply(next.trim().toUpperCase())
    setResult(outcome)
    if (outcome.ok) setCode('')
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {applied ? (
        <div className="flex items-center justify-between gap-3 rounded-control border border-success-border bg-success-subtle px-3 py-2">
          <p className="flex min-w-0 items-center gap-2 type-label text-success-subtle-fg">
            <Check aria-hidden className="size-4 shrink-0" />
            <span className="truncate">
              {applied.code} applied · you save {formatINR(applied.discount)}
            </span>
          </p>
          <button
            type="button"
            onClick={() => {
              onRemove()
              setResult(null)
            }}
            aria-label={`Remove coupon ${applied.code}`}
            className="grid size-6 shrink-0 place-items-center rounded-badge text-success-subtle-fg hover:bg-surface focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            onKeyDown={(event) => event.key === 'Enter' && code.trim() && apply(code)}
            placeholder="Coupon code"
            aria-label="Coupon code"
            invalid={result?.ok === false}
            wrapperClassName="flex-1"
            className="uppercase"
          />
          <Button variant="outline" disabled={!code.trim()} onClick={() => apply(code)}>
            Apply
          </Button>
        </div>
      )}

      {result && !result.ok ? <p className="type-caption text-danger-subtle-fg">{result.reason}</p> : null}

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="link" size="sm" leftIcon={<BadgePercent aria-hidden />} className="self-start">
            View available coupons
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" title="Coupons" description="Tap a coupon to apply it to this order." className="mx-auto max-w-md">
          <ul className="flex flex-col gap-3">
            {available.map(({ coupon, result: check }) => (
              <li
                key={coupon.code}
                className={cn('flex flex-col gap-1 rounded-card border p-3', check.ok ? 'border-border' : 'border-border-subtle bg-surface-2')}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-badge border border-dashed border-border-strong px-2 py-0.5 type-label tracking-wide">
                    {coupon.code}
                  </span>
                  <Button size="sm" variant={check.ok ? 'primary' : 'ghost'} disabled={!check.ok} onClick={() => apply(coupon.code)}>
                    {check.ok ? `Save ${formatINR(check.discount ?? 0)}` : 'Not applicable'}
                  </Button>
                </div>
                <p className="type-body text-fg">{coupon.title}</p>
                <p className="type-caption text-fg-muted">{check.ok ? coupon.description : check.reason}</p>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </div>
  )
}
