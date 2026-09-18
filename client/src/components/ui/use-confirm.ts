import type { ReactNode } from 'react'
import { create } from 'zustand'

export interface ConfirmOptions {
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
}

interface ConfirmState {
  open: boolean
  options: ConfirmOptions | null
  resolve: ((value: boolean) => void) | null
  ask: (options: ConfirmOptions) => Promise<boolean>
  settle: (value: boolean) => void
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  options: null,
  resolve: null,
  ask: (options) =>
    new Promise<boolean>((resolve) => {
      // A second ask while one is open resolves the first as "cancelled".
      get().resolve?.(false)
      set({ open: true, options, resolve })
    }),
  settle: (value) => {
    get().resolve?.(value)
    set({ open: false, resolve: null })
  },
}))

/** `if (await confirm({ title: 'Cancel this order?' })) …` */
export function useConfirm() {
  return useConfirmStore((state) => state.ask)
}
