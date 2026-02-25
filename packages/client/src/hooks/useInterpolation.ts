import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import type { VehicleState } from "../lib/toGeoJSON";
import { buildGeoJSON } from "../lib/toGeoJSON";

const POLL_MS = 15_000;
const SOURCE_ID = "vehicles";

/**
 * Improvement #1 + #2: Imperative animation loop that bypasses React state.
 *
 * Instead of calling setState 60 times/second (triggering React reconciliation
 * on every frame), we:
 *   1. Build the GeoJSON template once per WS update (every 15s)
 *   2. Mutate coordinates in-place on each rAF tick
 *   3. Push directly to MapLibre via map.getSource().setData()
 *
 * React re-renders from the animation loop: 60/s → 0/s
 * GeoJSON allocations: 60/s → 1 per 15s poll
 */
export function useInterpolation(
  vehicles: Map<string, VehicleState>,
  getMap: () => MapLibreMap | undefined,
) {
  // Snapshot of positions at the moment the latest WS update arrived
  const prevPositions = useRef<Map<string, [number, number]>>(new Map());
  // Mutable GeoJSON updated once per WS diff, then mutated per frame
  const geojsonRef = useRef<FeatureCollection<Point>>({
    type: "FeatureCollection",
    features: [],
  });
  // Timestamp of the latest WS update for interpolation progress
  const updateTime = useRef<number>(Date.now());

  // Rebuild the GeoJSON template whenever the vehicle set changes (every 15s)
  useEffect(() => {
    const arr = [...vehicles.values()];

    // Save current interpolated positions as the new "previous" baseline
    const prev = new Map<string, [number, number]>();
    for (const f of geojsonRef.current.features) {
      const [lon, lat] = f.geometry.coordinates;
      prev.set(f.properties!.id, [lat, lon]);
    }
    prevPositions.current = prev;
    updateTime.current = Date.now();

    geojsonRef.current = buildGeoJSON(arr);
  }, [vehicles]);

  // rAF loop: mutate coordinates in-place + push to MapLibre imperatively
  useEffect(() => {
    let raf: number;

    const tick = () => {
      const t = Math.min((Date.now() - updateTime.current) / POLL_MS, 1);
      const map = getMap();

      for (const f of geojsonRef.current.features) {
        const id = f.properties!.id;
        const v = vehicles.get(id);
        if (!v) continue;

        const prev = prevPositions.current.get(id) ?? [v.lat, v.lon];
        const lat = prev[0] + (v.lat - prev[0]) * t;
        const lon = prev[1] + (v.lon - prev[1]) * t;
        f.geometry.coordinates = [lon, lat];
      }

      // Push directly to MapLibre — no React state, no reconciliation
      if (map) {
        const src = map.getSource(SOURCE_ID) as any;
        src?.setData(geojsonRef.current);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles, getMap]);
}
