# MTL Tracker 🚌🚇

A high-performance, real-time transit tracking application for the Société de transport de Montréal (STM). MTL Tracker visualizes the live positions, delays, and occupancy statuses of buses and metro trains across the city on an interactive MapLibre map.

## ✨ Features

- **Live Vehicle Tracking:** View the real-time locations of STM buses and metro trains.
- **High-Performance Rendering:** 60fps smooth animations utilizing MapLibre GL JS and an imperative WebGL rendering loop that bypasses React re-rendering bottlenecks.
- **Smart Data Sync:** Highly optimized WebSocket architecture that only broadcasts positional diffs (vehicles that have actually moved) to strictly minimize payload sizes and bandwidth.
- **Inferred Metro Positions:** Since underground metro trains lack live GPS, MTL Tracker infers their exact locations by interpolating elapsed time along track geometries between scheduled static GTFS stops.
- **Live Diagnostics:** Shows current delay times (seconds early/late), trip directions (headsigns), and crowdedness/occupancy data per vehicle.
- **Monorepo Architecture:** Clean separation of concerns with a shared types package (`@mtl-tracker/shared`) ensuring strict contract parity between the client and server.

## 🛠️ Tech Stack

### Full-Stack

- **Runtime:** [Bun](https://bun.sh/)
- **Language:** TypeScript

### Backend (`packages/server`)

- **Framework:** [Elysia.js](https://elysiajs.com/) (Ultra-fast Bun web framework)
- **Database:** PostgreSQL (with `postgres.js`)
- **Transit Data:** STM API (`gtfs-realtime-bindings` for decoding Protobuf feeds)

### Frontend (`packages/client`)

- **Framework:** React + Vite
- **API Client:** [Eden Treaty](https://elysiajs.com/eden/treaty.html) (End-to-end type safety directly from the Elysia server)
- **Mapping:** [MapLibre GL JS](https://maplibre.org/) & `react-map-gl`
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.0+
- PostgreSQL database
- STM API Key (can be requested from the STM Developer portal)

### 1. Database Setup

Create a PostgreSQL database (e.g., `mtl_tracker`).
The backend will automatically create the required schemas (`schema.sql`) and download/seed the static GTFS zip on its first boot.

### 2. Environment Variables

Create `.env` files in both the client and server packages.

**`packages/server/.env`**

```env
# Database connection string
DATABASE_URL="postgres://postgres:password@localhost:5432/mtl_tracker"

# Get this from https://developer.stm.info/
STM_API_KEY="your_stm_api_key_here"
```

**`packages/client/.env`**

```env
VITE_WS_URL="ws://localhost:3001/ws/vehicles"
VITE_MAPTILER_KEY="your_maptiler_key_here"
```

### 3. Install Dependencies

Install packages concurrently across the monorepo from the root:

```bash
bun install
```

### 4. Running the Application

You'll need two terminal windows to run the frontend and backend servers.

**Terminal 1: Start the Backend (Poller & WebSocket Server)**

```bash
cd packages/server
bun run dev
```

_(On first run, the backend will download an ~80MB GTFS zip from the STM and seed the database. This may take a minute.)_

**Terminal 2: Start the Frontend (Vite Dev Server)**

```bash
cd packages/client
bun run dev
```

The application will be available at `http://localhost:5173`.

---

## 🧠 System Architecture

- **Static Cache:** Static GTFS files (`routes.txt`, `stops.txt`, `trips.txt`, `shapes.txt`) are persisted in PostgreSQL but fully loaded into a high-speed JavaScript `Map` on boot.
- **Real-time Poller:** Every 15 seconds, the server polls the STM APIs for `VehiclePositions` (Buses) and `TripUpdates` (Metros). The Protobuf streams are decoded, normalized into bounded `VehicleState` primitives, mapped to their static directions/stops, and cached.
- **WebSocket Diffing:** The server compares the updated vehicles against the previous cache tick. Immobile vehicles are skipped. Only vehicles that have structurally moved are passed down the WebSocket.
- **Client Rendering:** Zustand manages the incoming diffs. A `requestAnimationFrame` interpolation hook calculates delta fractions to smoothly glide map markers across the map without triggering React's reconciliation engine.
