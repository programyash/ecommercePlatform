// Saved products. Ids only — the product itself is read through `@/data`.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { persisted } from './create-persisted'
import type { ID } from '@/data/types'

export interface WishlistState {
  ids: ID[]
  toggle: (productId: ID) => void
  add: (productId: ID) => void
  remove: (productId: ID) => void
  clear: () => void
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (productId) =>
        set((state) => ({
          ids: state.ids.includes(productId) ? state.ids.filter((id) => id !== productId) : [productId, ...state.ids],
        })),
      add: (productId) =>
        set((state) => (state.ids.includes(productId) ? state : { ids: [productId, ...state.ids] })),
      remove: (productId) => set((state) => ({ ids: state.ids.filter((id) => id !== productId) })),
      clear: () => set({ ids: [] }),
    }),
    persisted<WishlistState, Pick<WishlistState, 'ids'>>('wishlist', 1, (state) => ({ ids: state.ids })),
  ),
)

export function isWishlisted(state: WishlistState, productId: ID): boolean {
  return state.ids.includes(productId)
}
