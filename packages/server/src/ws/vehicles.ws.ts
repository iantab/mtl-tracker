import { Elysia } from "elysia";
import { vehicleCache } from "../cache/vehicleCache";
import { registerBroadcast } from "../poller";
import type { VehicleState, WsMessage } from "../types/transit";

import type { ServerWebSocket } from "bun";

type ElysiaWS = ServerWebSocket<{
  id: string; // from Elysia WS signature
}>;

const clients = new Set<any>(); // Elysia types get messy with pure Bun WS type, use any inside the loop for brevity, or just use Set<any> since it's an internal cache

function broadcast(vehicles: VehicleState[]) {
  if (clients.size === 0) return;
  const payload: WsMessage = { type: "vehicle_update", data: vehicles };
  const msg = JSON.stringify(payload);
  for (const ws of clients) {
    try {
      ws.send(msg);
    } catch {
      clients.delete(ws);
    }
  }
}

// Register the broadcast function with the poller (avoids circular import)
registerBroadcast(broadcast);

export const vehicleWebSocket = new Elysia().ws("/ws/vehicles", {
  open(ws) {
    clients.add(ws);
    console.log(`🔌 WS client connected (total: ${clients.size})`);

    // Send the current snapshot immediately so the client doesn't
    // have to wait up to 15 seconds for the first update
    const snapshot: WsMessage = {
      type: "snapshot",
      data: vehicleCache.getAll(),
    };
    ws.send(JSON.stringify(snapshot));
  },

  close(ws) {
    clients.delete(ws);
    console.log(`❌ WS client disconnected (total: ${clients.size})`);
  },

  message(_ws, _raw) {
    // Reserved for future client filters (e.g. subscribe to specific routes)
  },
});
