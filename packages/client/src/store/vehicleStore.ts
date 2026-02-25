import { create } from "zustand";
import type { VehicleState } from "../lib/toGeoJSON";

interface VehicleStore {
  vehicles: Map<string, VehicleState>;
  applySnapshot: (data: VehicleState[]) => void;
  applyDiff: (data: VehicleState[]) => void;
}

export const useVehicleStore = create<VehicleStore>((set) => ({
  vehicles: new Map(),

  applySnapshot: (data) => {
    const m = new Map<string, VehicleState>();
    for (const v of data) m.set(v.id, v);
    set({ vehicles: m });
  },

  applyDiff: (data) => {
    set((state) => {
      const m = new Map(state.vehicles);
      for (const v of data) m.set(v.id, v);
      return { vehicles: m };
    });
  },
}));
