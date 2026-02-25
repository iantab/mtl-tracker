import { sql } from "../db/client";
import type { Route, Stop } from "../types/transit";

// ── In-memory static data cache ──────────────────────────────────────────
// Routes and stops are loaded once at startup and never change between
// GTFS reloads. Serving from memory eliminates all DB round-trips for
// the /api/routes and /api/stops endpoints.

let routeCache: Route[] = [];

const stopsById = new Map<string, Stop>(); // keyed by stop_id for O(1) metro lookups
const tripsById = new Map<string, { headsign: string | null }>(); // keyed by trip_id

/**
 * Loads all routes and stops from the DB into memory.
 * Called once after the GTFS seed completes.
 */
export async function warmStaticCache() {
  const routes = await sql<Route[]>`
    SELECT id, agency_id as "agencyId", short_name as "shortName",
           long_name as "longName", type
    FROM routes
    ORDER BY type, short_name
  `;
  routeCache = routes;

  const stops = await sql`
    SELECT id, name, lat, lon, sequence
    FROM stops
    ORDER BY sequence
  `;
  stopsById.clear();
  for (const stop of stops) {
    const s = stop as Stop;
    stopsById.set(s.id, s);
  }

  const metroRouteIds = new Set(
    routeCache.filter((r) => r.type === "metro").map((r) => r.id),
  );
  // Without route_id on stops, we can't trivially count metro stops here.
  // We'll just count total stops.
  const metroStopCount = "?";

  const trips = await sql`SELECT id, headsign FROM trips`;
  tripsById.clear();
  for (const trip of trips) {
    tripsById.set(trip.id, { headsign: trip.headsign });
  }

  console.log(
    `🗂  Static cache warmed: ${routeCache.length} routes, ${
      stops.length
    } stops total (${metroStopCount} metro stops), ${trips.length} trips`,
  );
}

export function getCachedRoutes(): Route[] {
  return routeCache;
}

// Route-specific stop queries aren't possible without parsing trips.txt/stop_times.txt
export function getCachedStops(routeId: string): Stop[] {
  return []; // Currently unsupported natively from GTFS stops.txt
}

/** Look up a stop's lat/lon by its GTFS stop_id. Used by the metro poller. */
export function getCachedStopById(stopId: string): Stop | undefined {
  return stopsById.get(stopId);
}

/** Look up a trip to resolve direction/headsign */
export function getCachedTripById(tripId: string) {
  return tripsById.get(tripId);
}
