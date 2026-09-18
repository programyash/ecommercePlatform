// Who the demo is signed in as. Defaults to the three personas so every route
// renders something real, even when a reviewer opens a deep link first.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { persisted } from './create-persisted'
import { DEMO } from '@/data/constants'
import type { ID } from '@/data/types'

export interface SessionState {
  customerId: ID
  /** The storefront works logged out; checkout asks for a sign-in. */
  customerSignedIn: boolean
  sellerId: ID
  sellerSignedIn: boolean
  adminId: ID
  adminSignedIn: boolean
  signInCustomer: (customerId?: ID) => void
  signOutCustomer: () => void
  signInSeller: (sellerId: ID) => void
  signOutSeller: () => void
  signInAdmin: (adminId?: ID) => void
  signOutAdmin: () => void
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      customerId: DEMO.customerId,
      customerSignedIn: true,
      sellerId: DEMO.sellerId,
      sellerSignedIn: true,
      adminId: DEMO.adminId,
      adminSignedIn: true,
      signInCustomer: (customerId) =>
        set((state) => ({ customerId: customerId ?? state.customerId, customerSignedIn: true })),
      signOutCustomer: () => set({ customerSignedIn: false }),
      signInSeller: (sellerId) => set({ sellerId, sellerSignedIn: true }),
      signOutSeller: () => set({ sellerSignedIn: false }),
      signInAdmin: (adminId) => set((state) => ({ adminId: adminId ?? state.adminId, adminSignedIn: true })),
      signOutAdmin: () => set({ adminSignedIn: false }),
    }),
    persisted('session', 1),
  ),
)

/** Read the session outside React (actions, demo tab). */
export function getSession(): SessionState {
  return useSession.getState()
}
