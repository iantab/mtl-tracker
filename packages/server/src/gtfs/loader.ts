import { unzipSync, strFromU8 } from "fflate";
import { sql } from "../db/client";
import { warmStaticCache } from "../cache/staticCache";

const GTFS_ZIP_URL =
  "https://www.stm.info/sites/default/files/gtfs/gtfs_stm.zip";
const METRO_ROUTES = new Set(["1", "2", "4", "5"]);

/**
 * Downloads the STM GTFS zip and seeds agencies, routes, stops, and shapes.
 * Skips entirely if routes are already present in the DB (i.e. not first run).
 * To force a re-seed, truncate the routes table and restart.
 */
export async function loadGtfsStatic() {
  const [{ count }] = await sql<
    [{ count: number }]
  >`SELECT COUNT(*)::int AS count FROM routes`;
  if (count > 0) {
    console.log(
      `🗂  GTFS already seeded (${count} routes) — skipping download`,
    );
    await warmStaticCache();
    return;
  }

  console.log("📦 Downloading STM static GTFS...");
  const res = await fetch(GTFS_ZIP_URL);
  if (!res.ok) throw new Error(`Failed to fetch GTFS zip: ${res.status}`);
  const buffer = await res.arrayBuffer();
  console.log(
    `📦 Downloaded ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB, extracting...`,
  );

  // Decompress the entire zip in memory using fflate
  const files = unzipSync(new Uint8Array(buffer));
  const read = (name: string) => strFromU8(files[name] ?? new Uint8Array());

  await seedAgency();
  await seedRoutes(read("routes.txt"));
  await seedTrips(read("trips.txt"));
  await seedStops(read("stops.txt"));
  await seedShapes(read("shapes.txt"));
  await warmStaticCache();
  console.log("✅ GTFS static data loaded");
}

// ── CSV parser ────────────────────────────────────────────────────────────

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(
      headers.map((h, i) => [h, (values[i] ?? "").trim()]),
    );
  });
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "",
    inQuote = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

// ── Seed functions ────────────────────────────────────────────────────────

async function seedAgency() {
  await sql`
    INSERT INTO agencies (id, name, color)
    VALUES ('STM', 'Société de transport de Montréal', '#009da5')
    ON CONFLICT (id) DO NOTHING
  `;
  console.log("  ✔ agency seeded");
}

async function seedRoutes(routesCsv: string) {
  const rows = parseCsv(routesCsv);
  const routes = rows.map((r) => ({
    id: `STM-${r.route_id}`,
    agency_id: "STM",
    short_name: r.route_short_name || r.route_id,
    long_name: r.route_long_name || "",
    type: METRO_ROUTES.has(r.route_id) ? "metro" : "bus",
  }));

  for (let i = 0; i < routes.length; i += 500) {
    await sql`
      INSERT INTO routes ${sql(routes.slice(i, i + 500), "id", "agency_id", "short_name", "long_name", "type")}
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(`  ✔ ${routes.length} routes seeded`);
}

async function seedTrips(tripsCsv: string) {
  const rows = parseCsv(tripsCsv);
  const trips = rows.map((t) => ({
    id: t.trip_id,
    route_id: `STM-${t.route_id}`,
    headsign: t.trip_headsign || null,
  }));

  for (let i = 0; i < trips.length; i += 2000) {
    await sql`
      INSERT INTO trips ${sql(trips.slice(i, i + 2000), "id", "route_id", "headsign")}
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(`  ✔ ${trips.length} trips seeded`);
}

async function seedStops(stopsCsv: string) {
  const rows = parseCsv(stopsCsv);
  const stops = rows
    .filter((s) => s.stop_lat && s.stop_lon)
    .map((s) => [
      s.stop_id,
      s.stop_name || s.stop_id,
      parseFloat(s.stop_lat),
      parseFloat(s.stop_lon),
      0,
    ]);

  for (let i = 0; i < stops.length; i += 500) {
    await sql`
      INSERT INTO stops (id, name, lat, lon, sequence)
      VALUES ${sql(stops.slice(i, i + 500))}
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(`  ✔ ${stops.length} stops seeded`);
}

async function seedShapes(shapesCsv: string) {
  const rows = parseCsv(shapesCsv);
  const shapes = rows
    .filter((s) => s.shape_pt_lat && s.shape_pt_lon)
    .map((s) => [
      s.shape_id,
      parseFloat(s.shape_pt_lat),
      parseFloat(s.shape_pt_lon),
      parseInt(s.shape_pt_sequence, 10),
    ]);

  for (let i = 0; i < shapes.length; i += 2000) {
    await sql`
      INSERT INTO shapes (shape_id, lat, lon, sequence)
      VALUES ${sql(shapes.slice(i, i + 2000))}
      ON CONFLICT (shape_id, sequence) DO NOTHING
    `;
  }
  console.log(`  ✔ ${shapes.length} shape points seeded`);
}
