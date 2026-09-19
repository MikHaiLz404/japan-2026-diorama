#!/usr/bin/env node
/**
 * Refresh src/data/japan-2026.json from Tripsy dumps.
 *
 * Local demo never needs a token. To refresh:
 *   1. In Cursor, use Tripsy MCP (trip id 1213687):
 *        tripsy_trips_show
 *        tripsy_activities_list
 *        tripsy_hostings_list
 *        tripsy_transportations_list
 *   2. Save the raw MCP JSON envelopes to scripts/cache/:
 *        trip.json, activities.json, hostings.json, transportations.json
 *   3. npm run refresh-data
 *
 * Optional live pull (not required for build/dev):
 *   TRIPSY_API_BASE=... TRIPSY_API_TOKEN=... TRIP_ID=1213687 npm run refresh-data
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = join(root, "scripts/cache");
const outFile = join(root, "src/data/japan-2026.json");
const tripId = process.env.TRIP_ID ?? "1213687";

function unwrap(payload) {
  if (payload?.data?.results) return payload.data.results;
  if (payload?.results) return payload.results;
  if (payload?.data && !Array.isArray(payload.data)) return payload.data;
  return payload;
}

function compactActivity(row) {
  return {
    id: String(row.id),
    name: row.name ?? "",
    type: row.activity_type ?? row.type ?? "general",
    starts_at: row.starts_at ?? null,
    ends_at: row.ends_at ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address ? String(row.address).replaceAll("\n", ", ") : null,
    timezone: row.timezone ?? "Asia/Tokyo",
    notes: row.notes ?? null,
    website: row.website ?? null,
  };
}

function compactLodging(row) {
  return {
    id: String(row.id),
    name: row.name ?? "",
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address ? String(row.address).replaceAll("\n", ", ") : null,
    timezone: row.timezone ?? "Asia/Tokyo",
    notes: row.notes ?? null,
    website: row.website ?? null,
  };
}

function compactTransport(row) {
  return {
    id: String(row.id),
    type: row.transportation_type ?? row.type ?? "walk",
    name: row.name ?? null,
    transport_number: row.transport_number ?? null,
    departure_at: row.departure_at ?? null,
    arrival_at: row.arrival_at ?? null,
    departure: {
      name: row.departure_description ?? row.departure?.name ?? "Departure",
      latitude: row.departure_latitude ?? row.departure?.latitude ?? null,
      longitude: row.departure_longitude ?? row.departure?.longitude ?? null,
    },
    arrival: {
      name: row.arrival_description ?? row.arrival?.name ?? "Arrival",
      latitude: row.arrival_latitude ?? row.arrival?.latitude ?? null,
      longitude: row.arrival_longitude ?? row.arrival?.longitude ?? null,
    },
  };
}

async function readJson(name) {
  return JSON.parse(await readFile(join(cacheDir, name), "utf8"));
}

async function fetchLive() {
  const base = process.env.TRIPSY_API_BASE;
  const token = process.env.TRIPSY_API_TOKEN;
  if (!base || !token) return null;
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  const get = async (path) => {
    const res = await fetch(new URL(path, base), { headers });
    if (!res.ok) throw new Error(`Tripsy ${path} failed (${res.status})`);
    return res.json();
  };
  return {
    trip: await get(`/trips/${tripId}`),
    activities: await get(`/trips/${tripId}/activities`),
    hostings: await get(`/trips/${tripId}/hostings`),
    transportations: await get(`/trips/${tripId}/transportations`),
  };
}

async function loadFromCache() {
  try {
    return {
      trip: await readJson("trip.json"),
      activities: await readJson("activities.json"),
      hostings: await readJson("hostings.json"),
      transportations: await readJson("transportations.json"),
    };
  } catch {
    return null;
  }
}

const live = await fetchLive();
const raw = live ?? (await loadFromCache());

if (!raw) {
  console.log(`No refresh input found.

Checked:
  - TRIPSY_API_BASE / TRIPSY_API_TOKEN (optional live fetch)
  - ${cacheDir}/trip.json
  - ${cacheDir}/activities.json
  - ${cacheDir}/hostings.json
  - ${cacheDir}/transportations.json

The committed fixture at src/data/japan-2026.json is enough to run locally.
To refresh from Tripsy MCP, dump those four JSON files into scripts/cache/ and re-run.
`);
  process.exit(0);
}

const trip = unwrap(raw.trip);
const fixture = {
  source: "tripsy",
  trip_id: String(trip.id ?? tripId),
  name: trip.name ?? "Japan 2026",
  starts_at: String(trip.starts_at).slice(0, 10),
  ends_at: String(trip.ends_at).slice(0, 10),
  timezone: "Asia/Tokyo",
  fetched_at: new Date().toISOString(),
  activities: unwrap(raw.activities).map(compactActivity),
  lodging: unwrap(raw.hostings).map(compactLodging),
  transportations: unwrap(raw.transportations).map(compactTransport),
};

await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, `${JSON.stringify(fixture, null, 2)}\n`);
console.log(
  `Wrote ${outFile} (${fixture.activities.length} activities, ${fixture.lodging.length} lodging, ${fixture.transportations.length} transports)`,
);
