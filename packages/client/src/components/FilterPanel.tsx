import { memo } from "react";
import { useUiStore } from "../store/uiStore";
import { useShallow } from "zustand/react/shallow";

export const FilterPanel = memo(function FilterPanel() {
  // Improvement #4: useShallow prevents re-render when unrelated store slices change
  const { filters, setFilter } = useUiStore(
    useShallow((s) => ({ filters: s.filters, setFilter: s.setFilter })),
  );

  return (
    <div style={styles.panel}>
      <div style={styles.label}>Show</div>
      <button
        style={{
          ...styles.btn,
          ...(filters.bus ? styles.active : styles.inactive),
        }}
        onClick={() => setFilter("bus", !filters.bus)}
      >
        🚌 Buses
      </button>
      <button
        style={{
          ...styles.btn,
          ...(filters.metro ? styles.active : styles.inactive),
        }}
        onClick={() => setFilter("metro", !filters.metro)}
      >
        🚇 Metro
      </button>
    </div>
  );
});

const styles: Record<string, React.CSSProperties> = {
  panel: { display: "flex", alignItems: "center", gap: 8 },
  label: { fontSize: 12, color: "#666", marginRight: 4 },
  btn: {
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 20,
    padding: "5px 12px",
    fontSize: 12,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  active: { background: "rgba(0,157,165,0.25)", color: "#fff" },
  inactive: { background: "rgba(255,255,255,0.05)", color: "#555" },
};
