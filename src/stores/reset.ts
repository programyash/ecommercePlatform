// "Reset demo data": throw away everything the demo has remembered and reload.
// This restores the original products, orders, carts, sellers and approvals in all
// three portals.

import { BRAND } from '@/config/brand'
import { demoStorage } from './create-persisted'
import { useCart } from './cart'
import { useDemo } from './demo'
import { useMockDb } from './mock-db'
import { useRecent } from './recent'
import { useSession } from './session'
import { useWishlist } from './wishlist'

/** Every `chowk:` key currently in localStorage. */
export function demoStorageKeys(): string[] {
  const keys: string[] = []
  try {
    if (typeof window === 'undefined') return keys
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (key && key.startsWith(BRAND.storagePrefix)) keys.push(key)
    }
  } catch {
    /* storage blocked: nothing to clear */
  }
  return keys
}

/**
 * Clear the persisted demo state. Pass `reload: false` to keep the current page
 * (used by tests); by default the portal home is reloaded so every screen re-reads
 * the seed data.
 */
export function resetDemo(options: { reload?: boolean; to?: string } = {}): void {
  for (const key of demoStorageKeys()) demoStorage.removeItem(key)

  // Clear the live stores too, in case the page is not reloaded.
  useMockDb.getState().resetOverlay()
  useCart.getState().clear()
  useCart.getState().setPin(null)
  useWishlist.getState().clear()
  useRecent.getState().clear()
  useDemo.getState().setForcedState('none')
  useSession.setState({ customerSignedIn: true, sellerSignedIn: true, adminSignedIn: true })

  if (options.reload === false || typeof window === 'undefined') return
  const target = options.to ?? portalHome(window.location.pathname)
  window.location.assign(target)
}

function portalHome(pathname: string): string {
  if (pathname.startsWith('/seller')) return '/seller'
  if (pathname.startsWith('/admin')) return '/admin'
  return '/'
}
