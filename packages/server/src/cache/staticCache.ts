import { sql } from "../db/client";
import type { Route, Stop } from "../types/transit";

// ── In-memory static data cache ──────────────────────────────────────────
// Routes and stops are loaded once at startup and never change between
// GTFS reloads. Serving from memory eliminates all DB round-trips for
// the /api/routes and /api/stops endpoints.

let routeCache: Route[] = [];
const stopsByRoute = new Map<string, Stop[]>();

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
    SELECT id, route_id as "routeId", name, lat, lon, sequence
    FROM stops
    ORDER BY route_id, sequence
  `;
  stopsByRoute.clear();
  for (const stop of stops) {
    const list = stopsByRoute.get(stop.routeId) ?? [];
    list.push(stop as Stop);
    stopsByRoute.set(stop.routeId, list);
  }

  console.log(
    `🗂  Static cache warmed: ${routeCache.length} routes, ${stops.length} stops`,
  );
}

export function getCachedRoutes(): Route[] {
  return routeCache;
}

export function getCachedStops(routeId: string): Stop[] {
  return stopsByRoute.get(routeId) ?? [];
}
