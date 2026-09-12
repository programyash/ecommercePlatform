// Recently viewed products and recent searches, for the home rail and the search
// suggestions. Newest first, oldest dropped.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { persisted } from './create-persisted'
import type { ID } from '@/data/types'

const MAX_PRODUCTS = 12
const MAX_SEARCHES = 8

export interface RecentState {
  products: ID[]
  searches: string[]
  viewProduct: (productId: ID) => void
  addSearch: (query: string) => void
  clear: () => void
}

export const useRecent = create<RecentState>()(
  persist(
    (set) => ({
      products: [],
      searches: [],
      viewProduct: (productId) =>
        set((state) => ({
          products: [productId, ...state.products.filter((id) => id !== productId)].slice(0, MAX_PRODUCTS),
        })),
      addSearch: (query) =>
        set((state) => {
          const trimmed = query.trim()
          if (trimmed.length < 2) return state
          return {
            searches: [trimmed, ...state.searches.filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase())].slice(
              0,
              MAX_SEARCHES,
            ),
          }
        }),
      clear: () => set({ products: [], searches: [] }),
    }),
    persisted<RecentState, Pick<RecentState, 'products' | 'searches'>>('recent', 1, (state) => ({
      products: state.products,
      searches: state.searches,
    })),
  ),
)
