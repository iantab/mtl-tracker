import { Elysia } from "elysia";
import { getCachedRoutes } from "../cache/staticCache";

export const routesRoute = new Elysia().get("/api/routes", () => {
  const data = getCachedRoutes();
  return { data };
});
