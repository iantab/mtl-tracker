import { useEffect, useRef } from "react";
import { useVehicleStore } from "../store/vehicleStore";
import { useUiStore } from "../store/uiStore";
// Types from the canonical shared package
import type { VehicleState, WsMessage } from "@mtl-tracker/shared";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:3001/ws/vehicles";

/**
 * Opens a WebSocket connection to the vehicle stream and writes updates
 * to the Zustand vehicleStore. Reconnects automatically with exponential
 * backoff (500ms → 30s).
 */
export function useVehicleSocket() {
  const applySnapshot = useVehicleStore((s) => s.applySnapshot);
  const applyDiff = useVehicleStore((s) => s.applyDiff);
  const setConnected = useUiStore((s) => s.setConnected);
  const setLastUpdated = useUiStore((s) => s.setLastUpdated);

  const retryDelay = useRef(500);
  const wsRef = useRef<WebSocket | null>(null);
  const unmounted = useRef(false);

  useEffect(() => {
    unmounted.current = false;

    function connect() {
      if (unmounted.current) return;
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        retryDelay.current = 500;
      };

      ws.onmessage = (e) => {
        try {
          const msg: WsMessage = JSON.parse(e.data);
          if (msg.type === "snapshot") applySnapshot(msg.data);
          else if (msg.type === "vehicle_update") applyDiff(msg.data);
          setLastUpdated(new Date());
        } catch {
          console.error("WS parse error", e.data);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (!unmounted.current) {
          setTimeout(connect, retryDelay.current);
          retryDelay.current = Math.min(retryDelay.current * 2, 30_000);
        }
      };

      ws.onerror = () => ws.close();
    }

    connect();
    return () => {
      unmounted.current = true;
      wsRef.current?.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
