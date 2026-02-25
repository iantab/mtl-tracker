// Barrel re-export — all server code continues to import from here,
// but the types now live in the canonical @mtl-tracker/shared package.
export type {
  VehicleType,
  OccupancyStatus,
  VehicleState,
  Route,
  Stop,
  OccupancySnapshot,
  CapacityComparison,
  WsMessage,
} from "@mtl-tracker/shared";
