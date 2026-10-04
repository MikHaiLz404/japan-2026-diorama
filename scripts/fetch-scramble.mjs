#!/usr/bin/env node
/**
 * Pull the Shibuya scramble crosswalk lines from OpenStreetMap → src/trips/japan-2026/scramble.json
 * (an array of [lng, lat] polylines) for the Japan 2026 trip. Only needed if OSM's crossing geometry changes.
 */
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outFile = join(dirname(fileURLToPath(import.meta.url)), "../src/trips/japan-2026/scramble.json");
const query = '[out:json][timeout:30];way["footway"="crossing"](around:70,35.65950,139.70050);out geom;';

const res = await fetch("https://overpass-api.de/api/interpreter", {
  method: "POST",
  headers: { "User-Agent": "trip-replay", "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ data: query }),
});
if (!res.ok) throw new Error(`Overpass ${res.status}`);
const ways = (await res.json()).elements
  .map((w) => w.geometry.map((p) => [+p.lon.toFixed(6), +p.lat.toFixed(6)]))
  .filter((line) => line.length > 1);
await writeFile(outFile, `${JSON.stringify(ways)}\n`);
console.log(`Wrote ${outFile} (${ways.length} crosswalks)`);
