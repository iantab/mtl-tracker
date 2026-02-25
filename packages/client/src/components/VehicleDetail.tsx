import { memo } from "react";
import { useUiStore } from "../store/uiStore";
import { useVehicleStore } from "../store/vehicleStore";

export const VehicleDetail = memo(function VehicleDetail() {
  const id = useUiStore((s) => s.selectedVehicleId);
  const vehicles = useVehicleStore((s) => s.vehicles);
  const close = useUiStore((s) => s.selectVehicle);

  if (!id) return null;
  const v = vehicles.get(id);
  if (!v) return null;

  const delay =
    v.delaySec != null
      ? v.delaySec > 0
        ? `+${v.delaySec}s late`
        : v.delaySec < 0
          ? `${Math.abs(v.delaySec)}s early`
          : "On time"
      : "—";

  return (
    <div style={styles.card}>
      <button style={styles.close} onClick={() => close(null)}>
        ✕
      </button>
      <div style={styles.route}>
        {v.routeId.replace("STM-", "")}
        {v.headsign ? ` - ${v.headsign}` : ""}
      </div>
      <div style={styles.type}>
        {v.type === "metro" ? "🚇 Metro" : "🚌 Bus"}
      </div>
      <div style={styles.row}>
        <span>Delay</span>
        <span style={styles.rowValue}>{delay}</span>
      </div>
      <div style={styles.row}>
        <span>Occupancy</span>
        <span style={styles.rowValue}>{v.occupancy.replace(/_/g, " ")}</span>
      </div>
      {v.speed != null && (
        <div style={styles.row}>
          <span>Speed</span>
          <span style={styles.rowValue}>{v.speed} km/h</span>
        </div>
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
    position: "relative",
    backdropFilter: "blur(12px)",
  },
  close: {
    position: "absolute",
    top: 10,
    right: 10,
    background: "none",
    border: "none",
    color: "#888",
    fontSize: 16,
    cursor: "pointer",
  },
  route: { fontSize: 28, fontWeight: 700, marginBottom: 2 },
  type: { fontSize: 13, color: "#888", marginBottom: 12 },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    fontSize: 13,
    color: "#ccc",
    padding: "3px 0",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  rowValue: {
    textAlign: "right",
    color: "#fff",
    whiteSpace: "nowrap",
  },
};
