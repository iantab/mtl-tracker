import { transit_realtime } from "gtfs-realtime-bindings";
import type { VehicleState } from "../types/transit";

const STM_API_KEY = process.env.STM_API_KEY;
const TRIP_UPDATES_URL =
  "https://api.stm.info/pub/od/gtfs-rt/ic/v2/tripUpdates";

/**
 * Fetch the STM GTFS-RT TripUpdate feed.
 *
 * The metro has no GPS — trains run underground. We use TripUpdate
 * departure predictions to infer each train's current position:
 *
 *   1. Find the next stop the train is heading toward
 *   2. Find the previous stop it just departed
 *   3. Interpolate lat/lon along the known GTFS shape between those two stops
 *      using the fraction of elapsed time vs. scheduled travel time
 *
 * Metro route IDs in GTFS are '1', '2', '4', '5' — we namespace them as 'STM-1' etc.
 */
export async function fetchStmMetroUpdates(): Promise<VehicleState[]> {
  if (!STM_API_KEY) throw new Error("STM_API_KEY is not set");

  const res = await fetch(TRIP_UPDATES_URL, {
    headers: { apiKey: STM_API_KEY },
  });

  if (!res.ok) {
    throw new Error(`STM TripUpdates feed returned ${res.status}`);
  }

  const buffer = await res.arrayBuffer();
  const feed = transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

  const vehicles: VehicleState[] = [];
  const now = Date.now();

  for (const entity of feed.entity) {
    const tu = entity.tripUpdate;
    if (!tu?.trip?.routeId) continue;

    // Only process metro routes (route IDs are '1', '2', '4', '5')
    const metroRoutes = new Set(["1", "2", "4", "5"]);
    if (!metroRoutes.has(tu.trip.routeId)) continue;

    const stopTimes = tu.stopTimeUpdate ?? [];
    if (stopTimes.length === 0) continue;

    // Find the first upcoming stop (departure time in the future)
    const nextStopIdx = stopTimes.findIndex((st) => {
      const dep = Number(st.departure?.time ?? st.arrival?.time ?? 0) * 1000;
      return dep > now;
    });

    if (nextStopIdx < 0) continue; // all stops already passed

    const nextStop = stopTimes[nextStopIdx];
    const prevStop = nextStopIdx > 0 ? stopTimes[nextStopIdx - 1] : null;

    // Calculate interpolation fraction (0 = just left prev stop, 1 = at next stop)
    let fraction = 0;
    if (prevStop) {
      const departed =
        Number(prevStop.departure?.time ?? prevStop.arrival?.time ?? 0) * 1000;
      const arrives =
        Number(nextStop.arrival?.time ?? nextStop.departure?.time ?? 0) * 1000;
      const segment = arrives - departed;
      if (segment > 0) fraction = Math.min((now - departed) / segment, 1);
    }

    // Build a synthetic vehicle ID from route + trip
    const vehicleId = `metro-${tu.trip.routeId}-${tu.trip.tripId ?? entity.id}`;
    const routeId = `STM-${tu.trip.routeId}`;

    // Calculate delay from the most recent stop time update
    const lastUpdate = prevStop ?? nextStop;
    const scheduled = Number(
      lastUpdate.arrival?.time ?? lastUpdate.departure?.time ?? 0,
    );
    const actual = Number(
      (lastUpdate.arrival?.time != null
        ? lastUpdate.arrival
        : lastUpdate.departure
      )?.delay ?? 0,
    );

    vehicles.push({
      id: vehicleId,
      tripId: tu.trip.tripId ?? null,
      routeId,
      type: "metro",
      // Lat/lon are placeholders — the frontend will interpolate along the shape
      // using nextStopSequence and fraction passed in the properties
      lat: 0,
      lon: 0,
      bearing: null,
      speed: null,
      delaySec: actual,
      occupancy: "UNKNOWN", // metro feed doesn't include occupancy
      updatedAt: new Date().toISOString(),
      // Extra fields used by the frontend position inference engine
      // (attached as non-VehicleState keys for the WS payload)
      ...({
        nextStopSequence: nextStop.stopSequence ?? null,
        interpolationFraction: fraction,
      } as any),
    });
  }

  return vehicles;
}
