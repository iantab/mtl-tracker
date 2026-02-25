import { memo } from "react";
import { useUiStore } from "../store/uiStore";
import { useVehicleStore } from "../store/vehicleStore";
import { formatDistanceToNow } from "date-fns";

export const StatusBar = memo(function StatusBar() {
  const isConnected = useUiStore((s) => s.isConnected);
  const lastUpdated = useUiStore((s) => s.lastUpdated);
  const vehicleCount = useVehicleStore((s) => s.vehicles.size);

  return (
    <div style={styles.bar}>
      <span
        style={{
          ...styles.dot,
          background: isConnected ? "#4caf50" : "#f44336",
        }}
      />
      <span style={styles.text}>{isConnected ? "Live" : "Reconnecting…"}</span>
      <span style={styles.sep}>·</span>
      <span style={styles.text}>{vehicleCount.toLocaleString()} vehicles</span>
      {lastUpdated && (
        <>
          <span style={styles.sep}>·</span>
          <span style={styles.text}>
            Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
          </span>
        </>
      )}
    </div>
  );
});

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    background: "rgba(20,20,28,0.75)",
    borderRadius: 20,
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  dot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  text: { fontSize: 12, color: "#aaa" },
  sep: { fontSize: 12, color: "#444" },
};
