import { create } from "zustand";

interface UiStore {
  selectedVehicleId: string | null;
  selectedRouteId: string | null;
  filters: { bus: boolean; metro: boolean };
  isConnected: boolean;
  lastUpdated: Date | null;

  selectVehicle: (id: string | null) => void;
  selectRoute: (id: string | null) => void;
  setFilter: (type: "bus" | "metro", on: boolean) => void;
  setConnected: (v: boolean) => void;
  setLastUpdated: (d: Date) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  selectedVehicleId: null,
  selectedRouteId: null,
  filters: { bus: true, metro: true },
  isConnected: false,
  lastUpdated: null,

  selectVehicle: (id) => set({ selectedVehicleId: id }),
  selectRoute: (id) => set({ selectedRouteId: id }),
  setFilter: (type, on) =>
    set((s) => ({ filters: { ...s.filters, [type]: on } })),
  setConnected: (v) => set({ isConnected: v }),
  setLastUpdated: (d) => set({ lastUpdated: d }),
}));
