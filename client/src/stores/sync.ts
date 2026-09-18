// Two tabs, one demo. When another tab writes to localStorage, the store that
// owns that key rehydrates — so placing an order in the storefront makes it appear
// in the Seller Hub tab without a refresh.

import { storageKey } from './create-persisted'
import { useCart } from './cart'
import { useDemo } from './demo'
import { useMockDb } from './mock-db'
import { useRecent } from './recent'
import { useSession } from './session'
import { useUiStore } from './ui'
import { useWishlist } from './wishlist'

type Rehydratable = { persist: { rehydrate: () => void | Promise<void> } }

const STORES: Record<string, Rehydratable> = {
  [storageKey('mock-db')]: useMockDb,
  [storageKey('cart')]: useCart,
  [storageKey('wishlist')]: useWishlist,
  [storageKey('recent')]: useRecent,
  [storageKey('session')]: useSession,
  [storageKey('demo')]: useDemo,
  [storageKey('ui')]: useUiStore,
}

/** Start listening for changes from other tabs. Returns an unsubscribe function. */
export function initCrossTabSync(): () => void {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (event: StorageEvent) => {
    // `key === null` means the whole store was cleared (a demo reset elsewhere).
    if (event.key === null) {
      for (const store of Object.values(STORES)) void store.persist.rehydrate()
      return
    }
    const store = STORES[event.key]
    if (store) void store.persist.rehydrate()
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}
