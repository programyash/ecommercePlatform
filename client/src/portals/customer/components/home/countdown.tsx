import { Timer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

function parts(msLeft: number) {
  const total = Math.max(0, Math.floor(msLeft / 1000))
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
}

interface CountdownProps {
  /** ISO timestamp the deal ends at. */
  endsAt: string
  className?: string
}

/** Live "ends in 3h 12m" timer for deals. Stops at zero; no motion beyond the digits. */
export function Countdown({ endsAt, className }: CountdownProps) {
  const [msLeft, setMsLeft] = useState(() => new Date(endsAt).getTime() - Date.now())

  useEffect(() => {
    const tick = () => setMsLeft(new Date(endsAt).getTime() - Date.now())
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [endsAt])

  if (msLeft <= 0) return null
  const { hours, minutes, seconds } = parts(msLeft)
  const pad = (value: number) => String(value).padStart(2, '0')

  return (
    <p className={cn('inline-flex items-center gap-1.5 type-caption text-fg-muted', className)}>
      <Timer aria-hidden className="size-3.5 text-accent-subtle-fg" />
      <span className="sr-only">Deal ends in </span>
      <span className="tabular font-medium text-fg">
        {hours > 0 ? `${hours}h ` : ''}
        {pad(minutes)}m {pad(seconds)}s
      </span>
      <span aria-hidden>left</span>
    </p>
  )
}
