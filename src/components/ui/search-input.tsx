import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { Input, type InputProps } from './input'
import { Kbd } from './kbd'

interface SearchInputProps extends Omit<InputProps, 'onChange' | 'value' | 'type' | 'leftIcon' | 'suffix'> {
  value: string
  onValueChange: (value: string) => void
  /** Called after the user stops typing (default 250 ms). */
  onDebouncedChange?: (value: string) => void
  debounceMs?: number
  shortcutHint?: ReactNode
  onClear?: () => void
}

export function SearchInput({
  value,
  onValueChange,
  onDebouncedChange,
  debounceMs = 250,
  shortcutHint,
  onClear,
  placeholder = 'Search',
  className,
  ...props
}: SearchInputProps) {
  const [inner, setInner] = useState(value)
  const [lastExternal, setLastExternal] = useState(value)
  const debounced = useDebouncedValue(inner, debounceMs)
  const lastSent = useRef(value)

  // Adjust state during render when the controlled value changes elsewhere
  // (filters cleared, URL navigation) — no effect, no cascading render.
  if (value !== lastExternal) {
    setLastExternal(value)
    setInner(value)
  }

  useEffect(() => {
    if (!onDebouncedChange || debounced === lastSent.current) return
    lastSent.current = debounced
    onDebouncedChange(debounced)
  }, [debounced, onDebouncedChange])

  const clear = () => {
    setInner('')
    onValueChange('')
    onClear?.()
  }

  return (
    <Input
      type="search"
      role="searchbox"
      value={inner}
      placeholder={placeholder}
      leftIcon={<Search aria-hidden />}
      className={className}
      onChange={(event) => {
        setInner(event.target.value)
        onValueChange(event.target.value)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && inner) {
          event.stopPropagation()
          clear()
        }
      }}
      suffix={
        inner ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="grid size-6 place-items-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X aria-hidden className="size-4" />
          </button>
        ) : shortcutHint ? (
          <Kbd className="hidden sm:inline-flex">{shortcutHint}</Kbd>
        ) : null
      }
      {...props}
    />
  )
}
