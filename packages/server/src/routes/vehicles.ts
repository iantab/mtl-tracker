import { Elysia, t } from "elysia";
import { vehicleCache } from "../cache/vehicleCache";

export const vehiclesRoute = new Elysia().get("/api/vehicles", () => {
  return { data: vehicleCache.getAll(), count: vehicleCache.size };
});
