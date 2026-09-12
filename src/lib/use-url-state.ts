import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

type ParamValue = string | number | boolean | readonly string[] | null | undefined

/**
 * Tabs, filters, sort and pagination live in the URL so back/forward and deep links
 * restore the exact view. Updates replace the history entry and keep the scroll position.
 */
export function useUrlParams() {
  const [params, setSearchParams] = useSearchParams()

  const setParams = useCallback(
    (patch: Record<string, ParamValue>, options: { resetPage?: boolean } = {}) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(patch)) {
            next.delete(key)
            if (value === null || value === undefined || value === false || value === '') continue
            if (Array.isArray(value)) {
              for (const item of value) next.append(key, item)
            } else {
              next.set(key, String(value))
            }
          }
          if (options.resetPage) next.delete('page')
          return next
        },
        { replace: true, preventScrollReset: true },
      )
    },
    [setSearchParams],
  )

  return { params, setParams }
}

/** A single string param with a default. Writing the default removes it from the URL. */
export function useUrlState<T extends string>(key: string, defaultValue: T): [T, (next: T) => void] {
  const { params, setParams } = useUrlParams()
  const value = (params.get(key) as T | null) ?? defaultValue
  const setValue = useCallback(
    (next: T) => setParams({ [key]: next === defaultValue ? null : next }),
    [key, defaultValue, setParams],
  )
  return [value, setValue]
}

/** Current page number from `?page=`, 1-based. */
export function useUrlPage(): [number, (page: number) => void] {
  const { params, setParams } = useUrlParams()
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)
  const setPage = useCallback((next: number) => setParams({ page: next <= 1 ? null : next }), [setParams])
  return [page, setPage]
}
