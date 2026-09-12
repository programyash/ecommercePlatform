import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { Input, type InputProps } from '@/components/ui/input'
import { cn } from '@/lib/cn'

/** ₹ prefix, digits only, tabular figures. */
export function CurrencyInput({ className, ...props }: InputProps) {
  return (
    <Input
      inputMode="numeric"
      autoComplete="off"
      prefix="₹"
      className={cn('tabular', className)}
      onKeyDown={(event) => {
        if (/^[a-zA-Z]$/.test(event.key)) event.preventDefault()
        props.onKeyDown?.(event)
      }}
      {...props}
    />
  )
}

/** +91 prefix, 10 digits, correct mobile keyboard and autofill. */
export function PhoneInput({ className, ...props }: InputProps) {
  return (
    <Input
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      maxLength={10}
      prefix="+91"
      placeholder="98765 43210"
      className={cn('tabular', className)}
      {...props}
    />
  )
}

/** Six digits; pairs with the PIN lookup that fills city and state. */
export function PinCodeInput({ className, ...props }: InputProps) {
  return (
    <Input
      inputMode="numeric"
      autoComplete="postal-code"
      maxLength={6}
      placeholder="682020"
      className={cn('tabular', className)}
      {...props}
    />
  )
}

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  invalid?: boolean
  'aria-label'?: string
  autoFocus?: boolean
  id?: string
  'aria-describedby'?: string
}

/** Six single-character boxes that behave like one field: paste, arrows, backspace. */
export function OtpInput({
  value,
  onChange,
  length = 6,
  invalid,
  autoFocus,
  id,
  ...aria
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const setChar = (index: number, char: string) => {
    const next = value.padEnd(length, ' ').split('')
    next[index] = char || ' '
    onChange(next.join('').replace(/\s/g, ' ').trimEnd())
    if (char && index < length - 1) refs.current[index + 1]?.focus()
  }

  const onKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !value[index] && index > 0) refs.current[index - 1]?.focus()
    if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus()
    if (event.key === 'ArrowRight' && index < length - 1) refs.current[index + 1]?.focus()
  }

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!digits) return
    event.preventDefault()
    onChange(digits)
    refs.current[Math.min(digits.length, length - 1)]?.focus()
  }

  return (
    <div className="flex gap-2" role="group" {...aria}>
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node
          }}
          id={index === 0 ? id : undefined}
          value={value[index]?.trim() ?? ''}
          onChange={(event) => setChar(index, event.target.value.replace(/\D/g, '').slice(-1))}
          onKeyDown={onKeyDown(index)}
          onPaste={onPaste}
          autoFocus={autoFocus && index === 0}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          aria-label={`Digit ${index + 1}`}
          aria-invalid={invalid || undefined}
          className={cn(
            'size-11 rounded-control border border-input bg-surface text-center text-lg font-semibold text-fg tabular',
            'focus:border-ring focus:ring-3 focus:ring-ring/25 focus:outline-none',
            invalid && 'border-danger',
          )}
        />
      ))}
    </div>
  )
}
