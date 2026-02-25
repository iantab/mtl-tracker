import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { runMigrations } from "./db/client";
import { loadGtfsStatic } from "./gtfs/loader";
import { startPoller } from "./poller";
import { vehicleWebSocket } from "./ws/vehicles.ws";
import { vehiclesRoute } from "./routes/vehicles";
import { routesRoute } from "./routes/routes";
import { stopsRoute } from "./routes/stops";
import { capacityRoute } from "./routes/capacity";

// ── Startup ──────────────────────────────────────────────────
await runMigrations();
await loadGtfsStatic();
startPoller();

// ── App ──────────────────────────────────────────────────────
const app = new Elysia()
  .use(cors())
  .use(swagger({ path: "/docs" }))
  .use(vehicleWebSocket)
  .use(vehiclesRoute)
  .use(routesRoute)
  .use(stopsRoute)
  .use(capacityRoute)
  .get("/", () => ({ status: "ok", service: "mtl-tracker-server" }))
  .listen(Number(process.env.PORT ?? 3001));

console.log(
  `🚌 MTL Tracker server running at http://localhost:${app.server?.port}`,
);
console.log(`📖 API docs at http://localhost:${app.server?.port}/docs`);

// Eden Treaty: export the full app type so the client can derive its API types
export type AppType = typeof app;
