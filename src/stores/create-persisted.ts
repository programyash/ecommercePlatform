// Shared setup for every persisted store: one storage key prefix, a version that
// throws away stale demo data instead of trying to migrate it, and a storage
// adapter that survives private browsing, blocked cookies and plain Node (the
// data layer is exercised in a Node smoke test with no `window`).

import { createJSONStorage } from 'zustand/middleware'
import type { PersistOptions, StateStorage } from 'zustand/middleware'
import { BRAND } from '@/config/brand'

const memory = new Map<string, string>()

function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

/** localStorage when it exists and works, an in-memory map otherwise. */
export const demoStorage: StateStorage = {
  getItem: (name) => {
    try {
      return hasLocalStorage() ? window.localStorage.getItem(name) : (memory.get(name) ?? null)
    } catch {
      return memory.get(name) ?? null
    }
  },
  setItem: (name, value) => {
    memory.set(name, value)
    try {
      if (hasLocalStorage()) window.localStorage.setItem(name, value)
    } catch {
      /* storage full or blocked: the value still lives for this session */
    }
  },
  removeItem: (name) => {
    memory.delete(name)
    try {
      if (hasLocalStorage()) window.localStorage.removeItem(name)
    } catch {
      /* nothing to do */
    }
  },
}

/** `chowk:cart`, `chowk:mock-db`… — one prefix so "Reset demo" can find them all. */
export function storageKey(key: string): string {
  return `${BRAND.storagePrefix}${key}`
}

/**
 * Persist options for a demo store. A version bump discards whatever was stored:
 * the seed data may have changed shape, and stale ids are worse than a fresh start.
 */
export function persisted<T, P = T>(
  key: string,
  version: number,
  partialize?: (state: T) => P,
): PersistOptions<T, P> {
  return {
    name: storageKey(key),
    version,
    storage: createJSONStorage<P>(() => demoStorage),
    migrate: () => undefined as unknown as P,
    ...(partialize ? { partialize } : {}),
  } as PersistOptions<T, P>
}
