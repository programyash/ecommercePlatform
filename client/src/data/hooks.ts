// The two hooks every page uses.
//
//   useDb(selector, deps)        — read the merged world; re-renders only on a change
//   useDemoQuery(selector, deps) — the same read, wrapped in loading / empty / error
//
// `useDemoQuery` simulates latency (Demo tab) and honours a forced state from the
// Demo tab or from `?demo=loading|empty|error`, which is how `/screens` shows every
// state of every page.

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { currentLatencyMs, useDemo, type ForcedState } from '@/stores/demo'
import { useMockDb } from '@/stores/mock-db'
import { getView, type View } from './view'
import type { Page } from './types'

/** Stable string for a dependency list, so selectors can be written inline. */
function depsKey(deps: readonly unknown[]): string {
  let key = ''
  for (const dep of deps) {
    key += typeof dep === 'object' && dep !== null ? JSON.stringify(dep) : String(dep)
    key += '|'
  }
  return key
}

const NO_DEPS: readonly unknown[] = []

/**
 * Read from the merged seed ⊕ overlay world. The result is memoised on the
 * overlay and on `deps`, so an inline selector does not cause extra renders.
 */
export function useDb<T>(selector: (view: View) => T, deps: readonly unknown[] = NO_DEPS): T {
  const overlay = useMockDb((state) => state.overlay)
  const key = depsKey(deps)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `deps` (as `key`) controls when the selector re-runs
  return useMemo(() => selector(getView(overlay)), [overlay, key])
}

/** Read the whole view once (rare: prefer a selector). */
export function useView(): View {
  const overlay = useMockDb((state) => state.overlay)
  return useMemo(() => getView(overlay), [overlay])
}

// ── Forced state from the URL ─────────────────────────────────────────────

function subscribeToLocation(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('popstate', onChange)
  window.addEventListener('hashchange', onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener('hashchange', onChange)
  }
}

function readDemoParam(): ForcedState | null {
  if (typeof window === 'undefined') return null
  const search = window.location.search || (window.location.hash.includes('?') ? `?${window.location.hash.split('?')[1]}` : '')
  const value = new URLSearchParams(search).get('demo')
  return value === 'loading' || value === 'empty' || value === 'error' ? value : null
}

/** `?demo=loading|empty|error`, read outside render through an external store. */
export function useDemoParam(): ForcedState | null {
  return useSyncExternalStore(subscribeToLocation, readDemoParam, () => null)
}

// ── Query wrapper ─────────────────────────────────────────────────────────

export type QueryStatus = 'loading' | 'success' | 'empty' | 'error'

export interface DemoQuery<T> {
  status: QueryStatus
  data: T | undefined
  /** Try again after an error, or re-run the simulated request. */
  retry: () => void
  isLoading: boolean
  isError: boolean
  isEmpty: boolean
}

function isEmptyResult(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object' && 'items' in (value as Page<unknown>)) {
    const page = value as Page<unknown>
    return Array.isArray(page.items) && page.items.length === 0
  }
  return false
}

/**
 * A read with the states a real screen has to handle. `deps` behaves like a
 * dependency array: change them and the "request" runs again.
 */
export function useDemoQuery<T>(selector: (view: View) => T, deps: readonly unknown[] = NO_DEPS): DemoQuery<T> {
  const data = useDb(selector, deps)
  const key = depsKey(deps)
  const latency = useDemo((state) => state.latency)
  const forcedFromStore = useDemo((state) => state.forcedState)
  const forcedFromUrl = useDemoParam()
  const forced: ForcedState = forcedFromUrl ?? forcedFromStore

  const [attempt, setAttempt] = useState(0)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const instant = currentLatencyMs() === 0

  useEffect(() => {
    const wait = currentLatencyMs()
    if (wait === 0) return
    // The state change happens in the timer, never synchronously in the effect.
    const timer = setTimeout(() => setLoadedKey(key), wait)
    return () => clearTimeout(timer)
  }, [key, latency, attempt])

  const retry = useCallback(() => {
    setLoadedKey(null)
    setAttempt((value) => value + 1)
  }, [])

  const waiting = !instant && loadedKey !== key

  let status: QueryStatus
  if (forced === 'error') status = 'error'
  else if (forced === 'loading' || waiting) status = 'loading'
  else if (forced === 'empty' || isEmptyResult(data)) status = 'empty'
  else status = 'success'

  return {
    status,
    data: status === 'error' || status === 'loading' ? undefined : data,
    retry,
    isLoading: status === 'loading',
    isError: status === 'error',
    isEmpty: status === 'empty',
  }
}
