import { useCallback, useSyncExternalStore } from 'react'

/** Subscribe to a CSS media query. Server/first render falls back to `false`. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Tailwind's `md` breakpoint (48rem). */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 48rem)')
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
