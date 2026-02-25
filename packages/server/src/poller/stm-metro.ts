import { transit_realtime } from "gtfs-realtime-bindings";
import type { VehicleState } from "../types/transit";
import { getCachedStopById, getCachedTripById } from "../cache/staticCache";

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

    // Calculate delay from the most recent stop time update.
    // `.delay` is the signed seconds offset from schedule (per GTFS-RT spec);
    // it is a separate field from `.time` (unix epoch seconds).
    const lastUpdate = prevStop ?? nextStop;
    const actual =
      lastUpdate.arrival?.delay ?? lastUpdate.departure?.delay ?? 0;

    // Look up stop coordinates directly by stopId from the GTFS-RT feed
    const nextStopData = getCachedStopById(nextStop.stopId ?? "");
    const prevStopData =
      nextStopIdx > 0
        ? getCachedStopById(stopTimes[nextStopIdx - 1].stopId ?? "")
        : null;

    // Guard: if we couldn't resolve the next stop's coordinates, skip this
    // vehicle entirely rather than emitting it at (0, 0) in the ocean.
    if (!nextStopData) continue;

    // Lerp between prev and next stop; fall back to next stop position alone
    let lat = nextStopData.lat;
    let lon = nextStopData.lon;
    if (prevStopData && fraction < 1) {
      lat = prevStopData.lat + (nextStopData.lat - prevStopData.lat) * fraction;
      lon = prevStopData.lon + (nextStopData.lon - prevStopData.lon) * fraction;
    }

    // Compute bearing from prev→next stop
    let bearing: number | null = null;
    if (prevStopData) {
      const dLon = ((nextStopData.lon - prevStopData.lon) * Math.PI) / 180;
      const lat1 = (prevStopData.lat * Math.PI) / 180;
      const lat2 = (nextStopData.lat * Math.PI) / 180;
      const y = Math.sin(dLon) * Math.cos(lat2);
      const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
      bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
    }

    vehicles.push({
      id: vehicleId,
      tripId: tu.trip.tripId ?? null,
      routeId,
      type: "metro",
      lat,
      lon,
      bearing,
      speed: null,
      delaySec: actual,
      occupancy: "UNKNOWN",
      updatedAt: new Date().toISOString(),
      headsign: tu.trip.tripId
        ? (getCachedTripById(tu.trip.tripId)?.headsign ?? null)
        : null,
      nextStopSequence: nextStop.stopSequence ?? null,
      interpolationFraction: fraction,
    });
  }

  return vehicles;
}
