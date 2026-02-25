// STM official brand colors for metro lines + generic bus color
export const ROUTE_COLORS: Record<string, string> = {
  "STM-1": "#4db748", // Green line
  "STM-2": "#f08123", // Orange line
  "STM-4": "#ffcc00", // Yellow line
  "STM-5": "#0b4ea2", // Blue line
};

export const BUS_COLOR = "#009da5"; // STM teal
export const METRO_COLOR = "#9b59b6"; // fallback purple

export function getVehicleColor(
  routeId: string,
  type: "bus" | "metro",
): string {
  if (type === "bus") return BUS_COLOR;
  return ROUTE_COLORS[routeId] ?? METRO_COLOR;
}
