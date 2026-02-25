import { vehicleCache } from "../cache/vehicleCache";
import { insertVehiclePositions, pruneOldPositions } from "../db/queries";
import { fetchStmBusVehicles } from "./stm-bus";
import { fetchStmMetroUpdates } from "./stm-metro";
import type { VehicleState } from "../types/transit";

// Populated by the WebSocket module to avoid a circular import
let broadcastFn: ((vehicles: VehicleState[]) => void) | null = null;

export function registerBroadcast(fn: typeof broadcastFn) {
  broadcastFn = fn;
}

const POLL_INTERVAL_MS = 15_000; // fetch every 15 seconds
const DB_WRITE_INTERVAL = 5 * 60 * 1000; // write to DB every 5 minutes
const PRUNE_INTERVAL_MS = 60 * 60 * 1000; // prune old rows every hour

let lastDbWrite = 0;

export function startPoller() {
  console.log(
    "🔄 Starting STM GTFS-RT poller (every 15s, DB writes every 5min)",
  );

  setInterval(async () => {
    try {
      const [busResult, metroResult] = await Promise.allSettled([
        fetchStmBusVehicles(),
        fetchStmMetroUpdates(),
      ]);

      const buses = busResult.status === "fulfilled" ? busResult.value : [];
      const metros =
        metroResult.status === "fulfilled" ? metroResult.value : [];

      if (busResult.status === "rejected")
        console.error("Bus poller error:", busResult.reason);
      if (metroResult.status === "rejected")
        console.error("Metro poller error:", metroResult.reason);
      if (metroResult.status === "fulfilled" && metros.length === 0)
        console.warn(
          "⚠️  Metro feed returned 0 vehicles — off-peak, stop ID mismatch, or empty feed",
        );

      const all = [...buses, ...metros];
      if (all.length === 0) return;

      // Improvement 2: only broadcast vehicles that actually moved
      const diff = vehicleCache.getDiff(all); // also calls updateAll internally
      if (diff.length > 0) {
        broadcastFn?.(diff);
      }

      // Improvement 3: write to DB on a 5-minute cadence, not every 15s
      const now = Date.now();
      if (now - lastDbWrite >= DB_WRITE_INTERVAL) {
        lastDbWrite = now;
        insertVehiclePositions(all).catch((err) =>
          console.error("DB insert error:", err),
        );
        console.log(`💾 DB write: ${all.length} vehicle positions persisted`);
      }

      console.log(
        `✅ Poll: ${buses.length} buses, ${metros.length} metro | diff: ${diff.length} changed`,
      );
    } catch (err) {
      console.error("Poller error:", err);
    }
  }, POLL_INTERVAL_MS);

  // Prune old DB rows once an hour
  setInterval(() => {
    pruneOldPositions().catch((err) => console.error("Prune error:", err));
  }, PRUNE_INTERVAL_MS);
}
