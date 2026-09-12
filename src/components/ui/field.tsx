import { Label as LabelPrimitive } from 'radix-ui'
import { useId, type ComponentProps, type ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root className={cn('type-label text-fg', className)} {...props} />
}

export function FieldHint({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('type-caption text-fg-muted', className)} {...props} />
}

export function FieldError({ className, children, ...props }: ComponentProps<'p'>) {
  if (!children) return null
  return (
    <p className={cn('flex items-start gap-1.5 type-caption text-danger-subtle-fg', className)} {...props}>
      <CircleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

interface FieldProps {
  label: ReactNode
  /** Marks the field "(optional)" — required fields carry no marker. */
  optional?: boolean
  hint?: ReactNode
  error?: ReactNode
  /** Render prop receives the ids to wire onto the control. */
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode
  className?: string
  labelAction?: ReactNode
}

/** Label above the control, hint and error below, all wired for assistive tech. */
export function Field({ label, optional, hint, error, children, className, labelAction }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {optional ? <span className="font-normal text-fg-muted"> (optional)</span> : null}
        </Label>
        {labelAction}
      </div>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? <FieldError id={errorId}>{error}</FieldError> : hint ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
    </div>
  )
}
