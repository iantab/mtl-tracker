import { transit_realtime } from "gtfs-realtime-bindings";
import type { VehicleState, OccupancyStatus } from "../types/transit";

const STM_API_KEY = process.env.STM_API_KEY;
const VEHICLE_POSITIONS_URL =
  "https://api.stm.info/pub/od/gtfs-rt/ic/v2/vehiclePositions";

const OCCUPANCY_MAP: Record<number, OccupancyStatus> = {
  0: "EMPTY",
  1: "MANY_SEATS_AVAILABLE",
  2: "FEW_SEATS_AVAILABLE",
  3: "STANDING_ROOM_ONLY",
  4: "CRUSHED_STANDING_ROOM_ONLY",
  5: "FULL",
  6: "NOT_ACCEPTING_PASSENGERS",
};

/**
 * Fetch and decode the STM GTFS-RT VehiclePosition binary feed.
 * Returns a normalized VehicleState[] for all active buses.
 */
export async function fetchStmBusVehicles(): Promise<VehicleState[]> {
  if (!STM_API_KEY) throw new Error("STM_API_KEY is not set");

  const res = await fetch(VEHICLE_POSITIONS_URL, {
    headers: { apiKey: STM_API_KEY },
  });

  if (!res.ok) {
    throw new Error(`STM VehiclePositions feed returned ${res.status}`);
  }

  const buffer = await res.arrayBuffer();
  const feed = transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

  const vehicles: VehicleState[] = [];

  for (const entity of feed.entity) {
    const v = entity.vehicle;
    if (!v?.position || !v.vehicle?.id) continue;

    const routeId = v.trip?.routeId ? `STM-${v.trip.routeId}` : "STM-unknown";

    vehicles.push({
      id: v.vehicle.id,
      tripId: v.trip?.tripId ?? null,
      routeId,
      type: "bus",
      lat: v.position.latitude,
      lon: v.position.longitude,
      bearing:
        v.position.bearing != null ? Math.round(v.position.bearing) : null,
      speed:
        v.position.speed != null
          ? Math.round(v.position.speed * 3.6) // m/s → km/h
          : null,
      delaySec: null, // buses get delay from TripUpdate, not VehiclePosition
      occupancy: OCCUPANCY_MAP[v.occupancyStatus ?? -1] ?? "UNKNOWN",
      updatedAt: new Date().toISOString(),
    });
  }

  return vehicles;
}
