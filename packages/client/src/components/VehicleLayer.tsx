import { useCallback, useRef, memo } from "react";
import { useMap } from "react-map-gl/maplibre";
import { Source, Layer } from "react-map-gl/maplibre";
import type { CircleLayerSpecification } from "maplibre-gl";
import { useVehicleStore } from "../store/vehicleStore";
import { useUiStore } from "../store/uiStore";
import { useInterpolation } from "../hooks/useInterpolation";
import { BUS_COLOR, ROUTE_COLORS } from "../lib/colors";

const busLayer: CircleLayerSpecification = {
  id: "vehicles-bus",
  type: "circle",
  filter: ["==", ["get", "type"], "bus"],
  paint: {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 4, 14, 8],
    "circle-color": BUS_COLOR,
    "circle-stroke-width": 1.5,
    "circle-stroke-color": "#ffffff",
    "circle-opacity": 0.92,
  },
};

const metroLayer: CircleLayerSpecification = {
  id: "vehicles-metro",
  type: "circle",
  filter: ["==", ["get", "type"], "metro"],
  paint: {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 6, 14, 12],
    "circle-color": [
      "match",
      ["get", "routeId"],
      "STM-1",
      ROUTE_COLORS["STM-1"],
      "STM-2",
      ROUTE_COLORS["STM-2"],
      "STM-4",
      ROUTE_COLORS["STM-4"],
      "STM-5",
      ROUTE_COLORS["STM-5"],
      "#9b59b6",
    ],
    "circle-stroke-width": 2,
    "circle-stroke-color": "#ffffff",
  },
};

// Empty GeoJSON to register the source on mount — rAF loop fills it imperatively
const EMPTY_GEOJSON = { type: "FeatureCollection" as const, features: [] };

export const VehicleLayer = memo(function VehicleLayer() {
  const vehicles = useVehicleStore((s) => s.vehicles);
  const filters = useUiStore((s) => s.filters);
  const selectVehicle = useUiStore((s) => s.selectVehicle);

  // Get access to the MapLibre map instance for imperative setData() calls
  const { current: mapRef } = useMap();
  const getMap = useCallback(() => mapRef?.getMap(), [mapRef]);

  // Filtered view for the animation loop
  const filteredVehicles = useRef(new Map());
  filteredVehicles.current = new Map(
    [...vehicles].filter(
      ([, v]) =>
        (v.type === "bus" && filters.bus) ||
        (v.type === "metro" && filters.metro),
    ),
  );

  // Improvement #1/#2: imperative animation — zero React re-renders per frame
  useInterpolation(filteredVehicles.current, getMap);

  const onClick = useCallback(
    (e: any) => {
      const feature = e.features?.[0];
      if (feature) selectVehicle(feature.properties.id);
    },
    [selectVehicle],
  );

  return (
    // Source starts empty; setData() fills it each rAF tick
    <Source id="vehicles" type="geojson" data={EMPTY_GEOJSON}>
      <Layer {...busLayer} onClick={onClick} />
      <Layer {...metroLayer} onClick={onClick} />
    </Source>
  );
});
