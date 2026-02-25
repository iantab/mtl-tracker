// Single source of truth for domain types shared between server and client.
// Both packages import from here — never duplicate these types.

export type VehicleType = "bus" | "metro";

export type OccupancyStatus =
  | "EMPTY"
  | "MANY_SEATS_AVAILABLE"
  | "FEW_SEATS_AVAILABLE"
  | "STANDING_ROOM_ONLY"
  | "CRUSHED_STANDING_ROOM_ONLY"
  | "FULL"
  | "NOT_ACCEPTING_PASSENGERS"
  | "UNKNOWN";

/**
 * Normalized vehicle state — the canonical shape used by the cache,
 * WebSocket broadcasts, and GeoJSON conversion on the client.
 */
export interface VehicleState {
  id: string; // vehicle_id from GTFS-RT
  tripId: string | null; // trip_id from GTFS-RT
  routeId: string; // e.g. 'STM-80', 'STM-1'
  type: VehicleType;
  lat: number;
  lon: number;
  bearing: number | null; // 0–359 degrees, null if unknown
  speed: number | null; // km/h, null if unknown
  delaySec: number | null; // seconds behind schedule (negative = early)
  occupancy: OccupancyStatus;
  updatedAt: string; // ISO 8601 timestamp
  // Metro-only inference fields (computed from GTFS-RT TripUpdate)
  nextStopSequence?: number | null;
  interpolationFraction?: number;
}

// ---- Static GTFS reference types ----

export interface Route {
  id: string;
  agencyId: string;
  shortName: string;
  longName: string;
  type: VehicleType;
  color?: string;
}

export interface Stop {
  id: string;
  routeId: string | null;
  name: string;
  lat: number;
  lon: number;
  sequence: number;
}

// ---- Capacity comparison ----

export interface OccupancySnapshot {
  vehicleId: string;
  occupancy: OccupancyStatus;
  recordedAt: string;
}

export interface CapacityComparison {
  routeId: string;
  at: string;
  current: OccupancySnapshot[];
  yesterday: OccupancySnapshot[];
}

// ---- WebSocket message envelope ----

export type WsMessage =
  | { type: "snapshot"; data: VehicleState[] }
  | { type: "vehicle_update"; data: VehicleState[] };
