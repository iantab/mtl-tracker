import Map from "react-map-gl/maplibre";
import { VehicleLayer } from "./VehicleLayer";
import { useVehicleSocket } from "../hooks/useVehicleSocket";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY ?? "";
const MAP_STYLE = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`
  : "https://demotiles.maplibre.org/style.json";

const MONTREAL: [number, number] = [-73.57, 45.505];

// Hard-lock pan/zoom to the greater Montreal region
// [west, south, east, north]
const MTL_BOUNDS: [[number, number], [number, number]] = [
  [-74.2, 45.3], // SW — past Île-Perrot / Châteauguay
  [-73.2, 45.75], // NE — Laval / Repentigny
];

export function MapView() {
  useVehicleSocket();

  return (
    <Map
      initialViewState={{
        longitude: MONTREAL[0],
        latitude: MONTREAL[1],
        zoom: 12,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={MAP_STYLE}
      cursor="auto"
      interactiveLayerIds={["vehicles-bus", "vehicles-metro"]}
      maxBounds={MTL_BOUNDS}
      minZoom={10}
      maxZoom={18}
    >
      <VehicleLayer />
    </Map>
  );
}
