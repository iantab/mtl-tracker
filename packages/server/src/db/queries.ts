import { sql } from "./client";
import type { VehicleState, OccupancySnapshot } from "../types/transit";

// -----------------------------------------------------------
// Writes
// -----------------------------------------------------------

/**
 * Bulk-insert vehicle positions.
 * postgres.js sql() for VALUES requires undefined (not null) for NULLable columns.
 */
export async function insertVehiclePositions(vehicles: VehicleState[]) {
  if (vehicles.length === 0) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[][] = vehicles.map((v) => [
    v.id,
    v.routeId,
    v.tripId ?? null,
    v.lat,
    v.lon,
    v.bearing ?? null,
    v.speed ?? null,
    v.delaySec ?? null,
    v.occupancy,
  ]);

  await sql`
    INSERT INTO vehicle_positions
      (vehicle_id, route_id, trip_id, lat, lon, bearing, speed, delay_sec, occupancy)
    VALUES ${sql(rows)}
  `;
}

// -----------------------------------------------------------
// Capacity comparison
// -----------------------------------------------------------

/** Current occupancy for a route (within the last 2 minutes) */
export async function getCurrentOccupancy(
  routeId: string,
): Promise<OccupancySnapshot[]> {
  const rows = await sql<OccupancySnapshot[]>`
    SELECT vehicle_id as "vehicleId", occupancy, recorded_at as "recordedAt"
    FROM vehicle_positions
    WHERE route_id = ${routeId}
      AND recorded_at >= now() - interval '2 minutes'
    ORDER BY recorded_at DESC
  `;
  return rows;
}

/** Same route, same clock-time ±5 minutes, exactly 24 hours ago */
export async function getYesterdayOccupancy(
  routeId: string,
  at: Date,
): Promise<OccupancySnapshot[]> {
  const ago24h = new Date(at.getTime() - 24 * 60 * 60 * 1000);
  const from = new Date(ago24h.getTime() - 5 * 60 * 1000);
  const to = new Date(ago24h.getTime() + 5 * 60 * 1000);

  const rows = await sql<OccupancySnapshot[]>`
    SELECT vehicle_id as "vehicleId", occupancy, recorded_at as "recordedAt"
    FROM vehicle_positions
    WHERE route_id = ${routeId}
      AND recorded_at BETWEEN ${from} AND ${to}
    ORDER BY recorded_at DESC
  `;
  return rows;
}

// -----------------------------------------------------------
// Maintenance
// -----------------------------------------------------------

/** Delete rows older than 48 hours — run periodically to keep the table small */
export async function pruneOldPositions() {
  const result = await sql`
    DELETE FROM vehicle_positions
    WHERE recorded_at < now() - interval '48 hours'
  `;
  console.log(`🗑  Pruned ${result.count} old vehicle position rows`);
}
