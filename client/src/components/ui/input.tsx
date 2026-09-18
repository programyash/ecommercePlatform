import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { fieldBase } from './field-base'

const sizes = {
  sm: 'h-control-sm text-sm',
  // 16px text on phones stops iOS zooming into focused fields.
  md: 'h-control-md text-base md:text-sm',
  lg: 'h-control-lg text-base',
} as const

export interface InputProps extends Omit<ComponentProps<'input'>, 'size' | 'prefix'> {
  size?: keyof typeof sizes
  invalid?: boolean
  /** Text shown inside the field before the value, e.g. "₹" or "+91". */
  prefix?: ReactNode
  suffix?: ReactNode
  leftIcon?: ReactNode
  /** Classes for the outer wrapper (width, margins). */
  wrapperClassName?: string
}

export function Input({
  size = 'md',
  invalid,
  prefix,
  suffix,
  leftIcon,
  className,
  wrapperClassName,
  disabled,
  ...props
}: InputProps) {
  return (
    <div
      className={cn(fieldBase, 'flex items-center gap-2 px-3', sizes[size], wrapperClassName)}
      aria-invalid={invalid || undefined}
    >
      {leftIcon ? <span className="flex shrink-0 text-fg-subtle [&_svg]:size-4">{leftIcon}</span> : null}
      {prefix ? <span className="shrink-0 text-fg-muted select-none">{prefix}</span> : null}
      <input
        aria-invalid={invalid || undefined}
        disabled={disabled}
        className={cn(
          'h-full w-full min-w-0 bg-transparent outline-none placeholder:text-fg-subtle disabled:cursor-not-allowed',
          '[&::-webkit-search-cancel-button]:hidden',
          className,
        )}
        {...props}
      />
      {suffix ? <span className="flex shrink-0 items-center text-fg-muted">{suffix}</span> : null}
    </div>
  )
}

export interface TextareaProps extends ComponentProps<'textarea'> {
  invalid?: boolean
}

export function Textarea({ invalid, className, rows = 4, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        fieldBase,
        'block min-h-20 px-3 py-2 text-base md:text-sm',
        'focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/25 disabled:cursor-not-allowed disabled:bg-surface-2',
        'field-sizing-content resize-y',
        className,
      )}
      {...props}
    />
  )
}
