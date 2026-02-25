import { treaty } from "@elysiajs/eden";
import type { AppType } from "@mtl-tracker/server";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
// treaty() expects just the host (no protocol), Elysia builds the URL internally
const host = BASE.replace(/^https?:\/\//, "");

/**
 * Type-safe Eden Treaty client.
 * All route shapes are inferred directly from the server's AppType.
 *
 * Usage:
 *   const { data, error } = await api.api.routes.get()
 *   const { data }        = await api.api.capacity.get({ query: { routeId: 'STM-80' } })
 */
export const api = treaty<AppType>(host);
