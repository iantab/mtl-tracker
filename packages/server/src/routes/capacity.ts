import { Elysia, t } from "elysia";
import { getCurrentOccupancy, getYesterdayOccupancy } from "../db/queries";

export const capacityRoute = new Elysia().get(
  "/api/capacity",
  async ({ query }) => {
    const { routeId, at } = query;
    const atDate = at ? new Date(at) : new Date();

    const [current, yesterday] = await Promise.all([
      getCurrentOccupancy(routeId),
      getYesterdayOccupancy(routeId, atDate),
    ]);

    return {
      routeId,
      at: atDate.toISOString(),
      current,
      yesterday,
    };
  },
  {
    query: t.Object({
      routeId: t.String({ description: "Route ID, e.g. STM-80" }),
      at: t.Optional(
        t.String({ description: "ISO 8601 timestamp (defaults to now)" }),
      ),
    }),
  },
);
