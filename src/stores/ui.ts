import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { PortalId } from '@/config/portals'

export type Density = 'comfortable' | 'compact'

export interface TablePrefs {
  density: Density
  /** `null` until the reader picks columns themselves — that's when a table's own defaults apply. */
  hidden: string[] | null
  pageSize: 10 | 20 | 50
}

const DEFAULT_TABLE_PREFS: TablePrefs = { density: 'comfortable', hidden: null, pageSize: 20 }

interface UiState {
  sidebarCollapsed: Record<Exclude<PortalId, 'customer'>, boolean>
  tablePrefs: Record<string, TablePrefs>
  dismissed: string[]
  /** Last date-range preset chosen per portal (reports, dashboards). */
  rangePreset: Record<Exclude<PortalId, 'customer'>, string>
  setSidebarCollapsed: (portal: Exclude<PortalId, 'customer'>, collapsed: boolean) => void
  setTablePrefs: (tableId: string, patch: Partial<TablePrefs>) => void
  dismiss: (id: string) => void
  setRangePreset: (portal: Exclude<PortalId, 'customer'>, preset: string) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: { seller: false, admin: false },
      tablePrefs: {},
      dismissed: [],
      rangePreset: { seller: '30d', admin: '30d' },
      setSidebarCollapsed: (portal, collapsed) =>
        set((state) => ({ sidebarCollapsed: { ...state.sidebarCollapsed, [portal]: collapsed } })),
      setTablePrefs: (tableId, patch) =>
        set((state) => ({
          tablePrefs: {
            ...state.tablePrefs,
            [tableId]: { ...DEFAULT_TABLE_PREFS, ...state.tablePrefs[tableId], ...patch },
          },
        })),
      dismiss: (id) => set((state) => (state.dismissed.includes(id) ? state : { dismissed: [...state.dismissed, id] })),
      setRangePreset: (portal, preset) => set((state) => ({ rangePreset: { ...state.rangePreset, [portal]: preset } })),
    }),
    {
      name: 'chowk:ui',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: () => undefined as unknown as UiState,
    },
  ),
)

export function useTablePrefs(tableId: string): TablePrefs {
  return useUiStore((state) => state.tablePrefs[tableId] ?? DEFAULT_TABLE_PREFS)
}
