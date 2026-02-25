import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Route } from "@mtl-tracker/shared";

/**
 * Typed route fetcher using Eden Treaty.
 * Response shape is inferred directly from the server's AppType.
 */
export function useRoutes() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.api.routes
      .get()
      .then(({ data, error: err }) => {
        if (err) setError(String(err));
        else if (data) setRoutes((data as any).data ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  return { routes, loading, error };
}
