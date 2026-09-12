import { CircleAlert } from 'lucide-react'
import {
  Controller,
  FormProvider,
  useFormContext,
  type Control,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form'
import type { ComponentProps, ReactNode } from 'react'
import { Label } from '@/components/ui/field'
import { cn } from '@/lib/cn'

export { Controller, useFormContext }

interface FormProps<T extends FieldValues> extends Omit<ComponentProps<'form'>, 'onSubmit'> {
  form: UseFormReturn<T>
  onSubmit: (values: T) => void | Promise<void>
}

export function Form<T extends FieldValues>({ form, onSubmit, className, children, ...props }: FormProps<T>) {
  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className={cn('flex flex-col gap-5', className)} {...props}>
        {children}
      </form>
    </FormProvider>
  )
}

interface FormFieldProps<T extends FieldValues> {
  name: FieldPath<T>
  control?: Control<T>
  label: ReactNode
  /** Required fields carry no marker; optional ones say so. */
  optional?: boolean
  hint?: ReactNode
  labelAction?: ReactNode
  className?: string
  children: (field: {
    id: string
    name: string
    value: unknown
    onChange: (...event: unknown[]) => void
    onBlur: () => void
    invalid: boolean
    describedBy?: string
    ref: (instance: unknown) => void
  }) => ReactNode
}

/** Label, control, hint and error wired together with the right aria attributes. */
export function FormField<T extends FieldValues>({
  name,
  control,
  label,
  optional,
  hint,
  labelAction,
  className,
  children,
}: FormFieldProps<T>) {
  const context = useFormContext<T>()
  const resolvedControl = control ?? context.control
  const id = `field-${String(name).replace(/\W+/g, '-')}`
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = `${id}-error`

  return (
    <Controller
      name={name}
      control={resolvedControl}
      render={({ field, fieldState }) => {
        const invalid = Boolean(fieldState.error)
        const describedBy = [invalid ? errorId : null, hintId].filter(Boolean).join(' ') || undefined
        return (
          <div className={cn('flex flex-col gap-1.5', className)}>
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor={id}>
                {label}
                {optional ? <span className="font-normal text-fg-muted"> (optional)</span> : null}
              </Label>
              {labelAction}
            </div>
            {children({
              id,
              name: field.name,
              value: field.value,
              onChange: field.onChange,
              onBlur: field.onBlur,
              invalid,
              describedBy,
              ref: field.ref as (instance: unknown) => void,
            })}
            {invalid ? (
              <p id={errorId} className="flex items-start gap-1.5 type-caption text-danger-subtle-fg">
                <CircleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
                <span>{fieldState.error?.message}</span>
              </p>
            ) : hint ? (
              <p id={hintId} className="type-caption text-fg-muted">
                {hint}
              </p>
            ) : null}
          </div>
        )
      }}
    />
  )
}

interface FormSectionProps {
  title: string
  description?: ReactNode
  /** Right-aligned status, e.g. "3 errors" or a completion tick. */
  meta?: ReactNode
  id?: string
  children: ReactNode
  className?: string
}

/** A titled block of fields; long forms are a stack of these. */
export function FormSection({ title, description, meta, id, children, className }: FormSectionProps) {
  return (
    <section id={id} className={cn('flex flex-col gap-4 border-b border-border-subtle pb-6 last:border-b-0 last:pb-0', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="type-title text-fg">{title}</h2>
          {description ? <p className="type-caption text-fg-muted">{description}</p> : null}
        </div>
        {meta}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}

/** Two columns from lg; single column on phones. */
export function FormRow({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('grid gap-4 sm:grid-cols-2', className)} {...props} />
}

interface FormActionsProps {
  children: ReactNode
  /** Sticks to the bottom on phones so the primary action is always reachable. */
  sticky?: boolean
  /** Left-aligned note, e.g. "Draft saved · 2 min ago". */
  note?: ReactNode
  className?: string
}

export function FormActions({ children, sticky = false, note, className }: FormActionsProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-end gap-2',
        sticky &&
          'sticky bottom-0 -mx-4 border-t border-border bg-surface/95 px-4 py-3 pb-safe backdrop-blur-sm sm:-mx-5 sm:px-5',
        className,
      )}
    >
      {note ? <span className="mr-auto type-caption text-fg-muted">{note}</span> : null}
      {children}
    </div>
  )
}

interface ErrorSummaryProps {
  /** Field name → message, in the order the fields appear. */
  errors: { name: string; message: string }[]
  className?: string
}

/** Focus lands here on a failed submit; each link jumps to its field. */
export function ErrorSummary({ errors, className }: ErrorSummaryProps) {
  if (errors.length === 0) return null
  return (
    <div
      tabIndex={-1}
      role="alert"
      className={cn('flex flex-col gap-2 rounded-card border border-danger-border bg-danger-subtle p-4', className)}
    >
      <p className="flex items-center gap-2 type-label text-danger-subtle-fg">
        <CircleAlert aria-hidden className="size-4" />
        {errors.length === 1 ? 'Fix 1 field to continue' : `Fix ${errors.length} fields to continue`}
      </p>
      <ul className="flex flex-col gap-1 pl-6">
        {errors.map((error) => (
          <li key={error.name}>
            <a
              href={`#field-${error.name.replace(/\W+/g, '-')}`}
              className="type-caption text-danger-subtle-fg underline underline-offset-2"
            >
              {error.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
