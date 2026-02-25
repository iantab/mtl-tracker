import { memo, useEffect, useState } from "react";
import { useUiStore } from "../store/uiStore";
import { api } from "../lib/api";
import type { CapacityComparison } from "@mtl-tracker/shared";

const OCCUPANCY_COLORS: Record<string, string> = {
  EMPTY: "#4caf50",
  MANY_SEATS_AVAILABLE: "#8bc34a",
  FEW_SEATS_AVAILABLE: "#ffeb3b",
  STANDING_ROOM_ONLY: "#ff9800",
  CRUSHED_STANDING_ROOM_ONLY: "#f44336",
  FULL: "#b71c1c",
  UNKNOWN: "#555",
};

const ORDER = [
  "FULL",
  "CRUSHED_STANDING_ROOM_ONLY",
  "STANDING_ROOM_ONLY",
  "FEW_SEATS_AVAILABLE",
  "MANY_SEATS_AVAILABLE",
  "EMPTY",
  "UNKNOWN",
];

function topOccupancy(rows: CapacityComparison["current"]) {
  return (
    rows
      .map((r) => r.occupancy)
      .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))[0] ?? "UNKNOWN"
  );
}

export const CapacityPanel = memo(function CapacityPanel() {
  const routeId = useUiStore((s) => s.selectedRouteId);
  const [data, setData] = useState<CapacityComparison | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!routeId) {
      setData(null);
      return;
    }
    setLoading(true);
    // Eden Treaty — fully typed, response shape inferred from AppType
    api.api.capacity
      .get({ query: { routeId } })
      .then(({ data: res }) => {
        if (res) setData(res as CapacityComparison);
      })
      .finally(() => setLoading(false));
  }, [routeId]);

  if (!routeId) return null;

  const curr = data ? topOccupancy(data.current) : "UNKNOWN";
  const yest = data ? topOccupancy(data.yesterday) : "UNKNOWN";
  const label = !data
    ? "—"
    : ORDER.indexOf(curr) < ORDER.indexOf(yest)
      ? "📈 Busier than yesterday"
      : ORDER.indexOf(curr) > ORDER.indexOf(yest)
        ? "📉 Quieter than yesterday"
        : "↔ Similar to yesterday";

  return (
    <div style={styles.card}>
      <div style={styles.title}>
        Capacity — {routeId.replace("STM-", "Route ")}
      </div>
      {loading ? (
        <div style={styles.loading}>Loading…</div>
      ) : (
        <>
          <div style={styles.row}>
            <div>
              <div style={styles.label}>Now</div>
              <div
                style={{ ...styles.badge, background: OCCUPANCY_COLORS[curr] }}
              >
                {curr.replace(/_/g, " ")}
              </div>
            </div>
            <div>
              <div style={styles.label}>Yesterday</div>
              <div
                style={{ ...styles.badge, background: OCCUPANCY_COLORS[yest] }}
              >
                {yest.replace(/_/g, " ")}
              </div>
            </div>
          </div>
          <div style={styles.summary}>{label}</div>
        </>
      )}
    </div>
  );
});

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "rgba(20,20,28,0.95)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: "16px 20px",
    backdropFilter: "blur(12px)",
  },
  title: { fontSize: 13, fontWeight: 600, color: "#aaa", marginBottom: 12 },
  loading: { color: "#666", fontSize: 13 },
  row: { display: "flex", gap: 24, marginBottom: 12 },
  label: { fontSize: 11, color: "#666", marginBottom: 4 },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    color: "#fff",
    padding: "3px 8px",
    borderRadius: 6,
    display: "inline-block",
  },
  summary: { fontSize: 13, color: "#ccc", marginTop: 4 },
};
