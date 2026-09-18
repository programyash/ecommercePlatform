import { create } from 'zustand';

interface SocketStore {
  orderTick: number;
  inventoryTick: number;
  bumpOrderTick: () => void;
  bumpInventoryTick: () => void;
}

export const useSocketStore = create<SocketStore>((set) => ({
  orderTick: 0,
  inventoryTick: 0,
  bumpOrderTick: () => set((state) => ({ orderTick: state.orderTick + 1 })),
  bumpInventoryTick: () => set((state) => ({ inventoryTick: state.inventoryTick + 1 })),
}));
