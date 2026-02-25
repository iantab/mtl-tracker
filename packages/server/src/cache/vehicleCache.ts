import type { VehicleState } from "../types/transit";

// Threshold for considering a vehicle's position "changed"
// (avoids broadcasting GPS noise when a vehicle is stationary)
const POSITION_THRESHOLD_DEG = 0.00005; // ~5 metres

class VehicleCache {
  private store = new Map<string, VehicleState>();

  updateAll(vehicles: VehicleState[]) {
    for (const v of vehicles) {
      this.store.set(v.id, v);
    }
  }

  /**
   * Returns only vehicles whose position or bearing has meaningfully changed
   * since the last update, then updates the store with the full incoming set.
   *
   * Use this for WebSocket broadcasts — unchanged vehicles are skipped,
   * reducing payload size by ~80–90% on a typical tick.
   */
  getDiff(incoming: VehicleState[]): VehicleState[] {
    const changed: VehicleState[] = [];

    for (const v of incoming) {
      const prev = this.store.get(v.id);
      if (!prev) {
        // New vehicle — always include
        changed.push(v);
        continue;
      }

      const latDelta = Math.abs(v.lat - prev.lat);
      const lonDelta = Math.abs(v.lon - prev.lon);
      const bearingChanged = v.bearing !== prev.bearing;

      if (
        latDelta > POSITION_THRESHOLD_DEG ||
        lonDelta > POSITION_THRESHOLD_DEG ||
        bearingChanged
      ) {
        changed.push(v);
      }
    }

    // Update the store with the full set (so next diff has accurate baselines)
    this.updateAll(incoming);

    return changed;
  }

  getAll(): VehicleState[] {
    return [...this.store.values()];
  }

  get size() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }
}

export const vehicleCache = new VehicleCache();
