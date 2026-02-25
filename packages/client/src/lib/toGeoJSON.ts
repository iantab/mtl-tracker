import type { Feature, FeatureCollection, Point } from "geojson";
// VehicleState now lives in the canonical shared package — no duplication
export type { VehicleState } from "@mtl-tracker/shared";
import type { VehicleState } from "@mtl-tracker/shared";

/**
 * Builds a mutable GeoJSON FeatureCollection from a vehicle map.
 * Called once per WS update (every 15s), NOT per animation frame.
 * The rAF loop then mutates coordinates in-place on the returned array.
 */
export function buildGeoJSON(
  vehicles: VehicleState[],
): FeatureCollection<Point> {
  const features: Feature<Point>[] = vehicles
    .filter((v) => v.type !== "metro" || (v.lat !== 0 && v.lon !== 0))
    .map((v) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [v.lon, v.lat] },
      properties: {
        id: v.id,
        routeId: v.routeId,
        type: v.type,
        bearing: v.bearing ?? 0,
        occupancy: v.occupancy,
        delaySec: v.delaySec,
        updatedAt: v.updatedAt,
        headsign: v.headsign,
      },
    }));

  return { type: "FeatureCollection", features };
}
