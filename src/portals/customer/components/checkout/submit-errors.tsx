import { useEffect, useRef } from 'react'
import { ErrorSummary } from '@/components/forms/form'

interface SubmitErrorsProps {
  /** Field name → message, in the order the fields appear on screen. */
  errors: { name: string; message: string }[]
  /** `formState.submitCount` — focus moves here each time a submit fails. */
  submitCount: number
}

/** The error summary every form shows on a failed submit, with focus moved onto it. */
export function SubmitErrors({ errors, submitCount }: SubmitErrorsProps) {
  const ref = useRef<HTMLDivElement>(null)
  const hasErrors = errors.length > 0

  useEffect(() => {
    if (!hasErrors || submitCount === 0) return
    ref.current?.querySelector<HTMLElement>('[role="alert"]')?.focus()
  }, [hasErrors, submitCount])

  return (
    <div ref={ref}>
      <ErrorSummary errors={errors} />
    </div>
  )
}
