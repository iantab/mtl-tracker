import { useCallback, useRef, memo, useState, useEffect, useMemo } from "react";
import { useMap } from "react-map-gl/maplibre";
import { Source, Layer, Popup } from "react-map-gl/maplibre";
import { useVehicleStore } from "../store/vehicleStore";
import { useUiStore } from "../store/uiStore";
import { useInterpolation } from "../hooks/useInterpolation";
import { BUS_COLOR, ROUTE_COLORS } from "../lib/colors";

const INTERACTIVE_LAYERS = ["vehicles-bus", "vehicles-metro"];

const busLayer = {
  id: "vehicles-bus",
  type: "circle" as const,
  filter: ["==", ["get", "type"], "bus"],
  paint: {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 4, 14, 8],
    "circle-color": BUS_COLOR,
    "circle-stroke-width": 1.5,
    "circle-stroke-color": "#ffffff",
    "circle-opacity": 0.92,
  },
};

const metroLayer = {
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

const EMPTY_GEOJSON = { type: "FeatureCollection" as const, features: [] };

interface HoverInfo {
  lng: number;
  lat: number;
  routeId: string;
  type: string;
  occupancy: string;
  delaySec: number | null;
  speed: number | null;
  headsign: string | null;
}

export const VehicleLayer = memo(function VehicleLayer() {
  const vehicles = useVehicleStore((s) => s.vehicles);
  const filters = useUiStore((s) => s.filters);
  const selectVehicle = useUiStore((s) => s.selectVehicle);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  const { current: mapRef } = useMap();
  const getMap = useCallback(() => mapRef?.getMap(), [mapRef]);

  // Filtered view for the animation loop
  const filteredVehicles = useRef(new Map());

  // Update the ref inside a useMemo so we only do work when vehicles/filters change
  // and we don't create intermediate Maps on every unrelated render.
  useMemo(() => {
    filteredVehicles.current = new Map(
      [...vehicles].filter(
        ([, v]) =>
          (v.type === "bus" && filters.bus) ||
          (v.type === "metro" && filters.metro),
      ),
    );
  }, [vehicles, filters.bus, filters.metro]);

  useInterpolation(filteredVehicles.current, getMap);

  // ── Imperative hover & click listeners ──────────────────────────────────
  // react-map-gl Layer event props are unreliable for non-fill layers.
  // We attach directly to the MapLibre map object instead.
  useEffect(() => {
    const map = getMap();
    if (!map) return;

    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: INTERACTIVE_LAYERS,
      });
      if (features.length > 0) {
        map.getCanvas().style.cursor = "pointer";
        const p = features[0].properties as any;

        // Prevent setting state if the same vehicle is already hovered
        setHoverInfo((prev) => {
          if (
            prev?.routeId === p.routeId &&
            prev?.type === p.type &&
            prev?.delaySec === p.delaySec &&
            prev?.speed === p.speed
          ) {
            return prev;
          }
          return {
            lng: e.lngLat.lng,
            lat: e.lngLat.lat,
            routeId: p.routeId ?? "",
            type: p.type ?? "",
            occupancy: p.occupancy ?? "UNKNOWN",
            delaySec: p.delaySec ?? null,
            speed: p.speed ?? null,
            headsign: p.headsign ?? null,
          };
        });
      } else {
        map.getCanvas().style.cursor = "";
        setHoverInfo((prev) => (prev === null ? null : null));
      }
    };

    const onClick = (e: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: INTERACTIVE_LAYERS,
      });
      if (features.length > 0) {
        const p = features[0].properties as any;
        selectVehicle(p.id);
      }
    };

    map.on("mousemove", onMouseMove);
    map.on("click", onClick);
    return () => {
      map.off("mousemove", onMouseMove);
      map.off("click", onClick);
    };
  }, [getMap, selectVehicle]);

  return (
    <>
      <Source id="vehicles" type="geojson" data={EMPTY_GEOJSON}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Layer {...(busLayer as any)} />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Layer {...(metroLayer as any)} />
      </Source>

      {hoverInfo && (
        <Popup
          longitude={hoverInfo.lng}
          latitude={hoverInfo.lat}
          closeButton={false}
          closeOnClick={false}
          anchor="bottom"
          offset={14}
        >
          <div style={popupStyles.card}>
            <div style={popupStyles.route}>
              {hoverInfo.type === "metro" ? "🚇" : "🚌"}{" "}
              {hoverInfo.routeId.replace("STM-", "Route ")}
              {hoverInfo.headsign ? ` - ${hoverInfo.headsign}` : ""}
            </div>
            {hoverInfo.occupancy !== "UNKNOWN" && (
              <div style={popupStyles.detail}>
                {hoverInfo.occupancy.replace(/_/g, " ")}
              </div>
            )}
            {hoverInfo.delaySec != null && hoverInfo.delaySec !== 0 && (
              <div style={popupStyles.delay}>
                {hoverInfo.delaySec > 0
                  ? `+${hoverInfo.delaySec}s late`
                  : `${Math.abs(hoverInfo.delaySec)}s early`}
              </div>
            )}
            {hoverInfo.speed != null && (
              <div style={popupStyles.detail}>{hoverInfo.speed} km/h</div>
            )}
            <div style={popupStyles.hint}>Click to pin details</div>
          </div>
        </Popup>
      )}
    </>
  );
});

const popupStyles: Record<string, React.CSSProperties> = {
  card: {
    background: "rgba(15,15,20,0.97)",
    borderRadius: 8,
    padding: "8px 12px",
    minWidth: 130,
  },
  route: {
    fontSize: 14,
    fontWeight: 700,
    color: "#fff",
    marginBottom: 4,
  },
  detail: {
    fontSize: 11,
    color: "#aaa",
    textTransform: "capitalize",
  },
  delay: {
    fontSize: 11,
    color: "#ff9800",
    marginTop: 2,
  },
  hint: {
    fontSize: 10,
    color: "#555",
    marginTop: 6,
    fontStyle: "italic",
  },
};
