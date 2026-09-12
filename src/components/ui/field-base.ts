import { cn } from '@/lib/cn'

/** Shared field chrome so inputs, selects and textareas look identical. */
export const fieldBase = cn(
  'w-full min-w-0 rounded-control border border-input bg-surface text-fg shadow-none transition-[border-color,box-shadow] duration-150',
  'placeholder:text-fg-subtle hover:border-border-strong',
  'focus-within:border-ring focus-within:outline-none focus-within:ring-3 focus-within:ring-ring/25',
  'aria-invalid:border-danger aria-invalid:focus-within:ring-danger/25',
  'has-[input:disabled]:cursor-not-allowed has-[input:disabled]:bg-surface-2 has-[input:disabled]:text-fg-disabled',
)
