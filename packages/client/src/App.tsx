import { MapView } from "./components/MapView";
import { VehicleDetail } from "./components/VehicleDetail";
import { CapacityPanel } from "./components/CapacityPanel";
import { FilterPanel } from "./components/FilterPanel";
import { StatusBar } from "./components/StatusBar";

export default function App() {
  return (
    <div style={styles.root}>
      {/* Full-bleed map */}
      <div style={styles.map}>
        <MapView />
      </div>

      {/* Top-left: status */}
      <div style={{ ...styles.overlay, top: 16, left: 16 }}>
        <StatusBar />
      </div>

      {/* Top-right: filter toggles */}
      <div style={{ ...styles.overlay, top: 16, right: 16 }}>
        <FilterPanel />
      </div>

      {/* Bottom-left: vehicle detail + capacity */}
      <div
        style={{
          ...styles.overlay,
          bottom: 24,
          left: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          maxWidth: 280,
        }}
      >
        <VehicleDetail />
        <CapacityPanel />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { position: "relative", width: "100%", height: "100%" },
  map: { position: "absolute", inset: 0 },
  overlay: { position: "absolute", zIndex: 10 },
};
