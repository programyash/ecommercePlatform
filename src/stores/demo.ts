// Demo harness settings: how slow the mock "network" is, whether a screen is
// forced into a loading, empty or error state, and whether the floating demo tab
// is showing.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { persisted } from './create-persisted'

export type Latency = 'off' | 'fast' | 'slow'
export type ForcedState = 'none' | 'loading' | 'empty' | 'error'

export const LATENCY_MS: Record<Latency, number> = { off: 0, fast: 350, slow: 1200 }

export interface DemoState {
  latency: Latency
  forcedState: ForcedState
  /** `?chrome=0` and the demo tab's own hide button set this. */
  chromeHidden: boolean
  setLatency: (latency: Latency) => void
  setForcedState: (state: ForcedState) => void
  setChromeHidden: (hidden: boolean) => void
}

export const useDemo = create<DemoState>()(
  persist(
    (set) => ({
      latency: 'fast',
      forcedState: 'none',
      chromeHidden: false,
      setLatency: (latency) => set({ latency }),
      setForcedState: (forcedState) => set({ forcedState }),
      setChromeHidden: (chromeHidden) => set({ chromeHidden }),
    }),
    persisted('demo', 1),
  ),
)

/** Simulated latency in milliseconds; automation (and `latency: 'off'`) gets none. */
export function currentLatencyMs(): number {
  if (typeof navigator !== 'undefined' && navigator.webdriver) return 0
  return LATENCY_MS[useDemo.getState().latency]
}
