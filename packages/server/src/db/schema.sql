-- ============================================================
-- MTL Tracker — PostgreSQL Schema
-- ============================================================

-- Enable PostGIS for future spatial queries (optional but recommended)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- -----------------------------------------------------------
-- Static GTFS reference data (seeded at startup, rarely changes)
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS agencies (
  id    TEXT PRIMARY KEY,  -- 'STM'
  name  TEXT NOT NULL,
  color TEXT               -- brand hex color (unused for STM but keeps schema extensible)
);

CREATE TABLE IF NOT EXISTS routes (
  id         TEXT PRIMARY KEY, -- e.g. 'STM-1', 'STM-80'
  agency_id  TEXT NOT NULL REFERENCES agencies(id),
  short_name TEXT NOT NULL,
  long_name  TEXT NOT NULL,
  type       TEXT NOT NULL     -- 'metro' | 'bus'
);

CREATE TABLE IF NOT EXISTS stops (
  id        TEXT PRIMARY KEY,
  route_id  TEXT REFERENCES routes(id),  -- nullable: GTFS stops serve multiple routes
  name      TEXT NOT NULL,
  lat       DOUBLE PRECISION NOT NULL,
  lon       DOUBLE PRECISION NOT NULL,
  sequence  INT NOT NULL DEFAULT 0
);

-- Shape points for metro line animation (fixed track geometry)
CREATE TABLE IF NOT EXISTS shapes (
  shape_id  TEXT NOT NULL,
  lat       DOUBLE PRECISION NOT NULL,
  lon       DOUBLE PRECISION NOT NULL,
  sequence  INT NOT NULL,
  PRIMARY KEY (shape_id, sequence)
);

-- -----------------------------------------------------------
-- Real-time write log  (retained for 48h, then pruned)
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS vehicle_positions (
  id          BIGSERIAL PRIMARY KEY,
  vehicle_id  TEXT NOT NULL,
  route_id    TEXT REFERENCES routes(id),
  trip_id     TEXT,
  lat         DOUBLE PRECISION,
  lon         DOUBLE PRECISION,
  bearing     SMALLINT,
  speed       REAL,            -- km/h
  delay_sec   INT,             -- seconds behind schedule (negative = early)
  occupancy   TEXT,            -- OccupancyStatus enum value
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast range lookups for the 24h capacity comparison query
CREATE INDEX IF NOT EXISTS idx_vp_route_time ON vehicle_positions (route_id, recorded_at DESC);
-- Wide column-min/max scans (prune / retention queries)
CREATE INDEX IF NOT EXISTS idx_vp_time_brin ON vehicle_positions USING BRIN (recorded_at);
