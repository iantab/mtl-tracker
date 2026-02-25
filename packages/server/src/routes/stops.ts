import { Elysia, t } from "elysia";
import { getCachedStops } from "../cache/staticCache";

export const stopsRoute = new Elysia().get(
  "/api/stops",
  ({ query }) => {
    const { routeId } = query;
    const data = getCachedStops(routeId);
    return { data };
  },
  {
    query: t.Object({
      routeId: t.String({ description: "Route ID, e.g. STM-80" }),
    }),
  },
);
