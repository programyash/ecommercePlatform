import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/cn'

interface InlineNumberProps {
  value: number
  /** Called on blur or Enter, only when the value really changed. */
  onCommit: (next: number) => void
  label: string
  prefix?: string
  suffix?: string
  min?: number
  step?: number
  disabled?: boolean
  className?: string
}

/**
 * A table cell you can type in. The draft lives locally until blur or Enter, and
 * resets during render whenever the row's value changes underneath it.
 */
export function InlineNumber({ value, onCommit, label, prefix, suffix, min = 0, step = 1, disabled, className }: InlineNumberProps) {
  const [draft, setDraft] = useState(String(value))
  const [seen, setSeen] = useState(value)

  // The row changed under us (an undo, a bulk update): follow it.
  if (value !== seen) {
    setSeen(value)
    setDraft(String(value))
  }

  const commit = () => {
    const next = Number(draft)
    if (!Number.isFinite(next) || next < min) {
      setDraft(String(value))
      return
    }
    if (next === value) return
    onCommit(next)
  }

  return (
    <Input
      size="sm"
      aria-label={label}
      inputMode="numeric"
      step={step}
      min={min}
      disabled={disabled}
      value={draft}
      prefix={prefix}
      suffix={suffix ? <span className="type-caption">{suffix}</span> : undefined}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        }
        if (event.key === 'Escape') {
          setDraft(String(value))
          event.currentTarget.blur()
        }
      }}
      wrapperClassName={cn('w-24 tabular', className)}
    />
  )
}
