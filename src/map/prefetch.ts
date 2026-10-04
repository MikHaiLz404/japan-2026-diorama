// Warm the HTTP cache with the vector tiles of the day the reader will most likely open next. The tile host is slow on a
// cold edge (~1 s per tile), and a pitched camera needs many tiles at once, so the first view of a day shows empty ground.
import type { Map as MapLibreMap } from "maplibre-gl";
import type { Stop } from "../data/trip";

/** OpenFreeMap's maxzoom: a pitched day view at zoom 15–16 is built from these. */
const TILE_ZOOM = 14;
/** Above this a day is too spread out to prefetch as a block; only the tiles under its stops are fetched. */
const MAX_BLOCK_TILES = 12;

export interface Tile { x: number; y: number; z: number }

export function lngLatToTile([lng, lat]: readonly [number, number], z = TILE_ZOOM): Tile {
  const n = 2 ** z;
  const rad = (lat * Math.PI) / 180;
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
  return { x: Math.min(n - 1, Math.max(0, x)), y: Math.min(n - 1, Math.max(0, y)), z };
}

/** Tiles a day's camera will need: the block covering all its stops, or just the stop tiles when that block is large. */
export function tilesForStops(stops: readonly Stop[]): Tile[] {
  if (!stops.length) return [];
  const own = stops.map((s) => lngLatToTile(s.lngLat));
  const xs = own.map((t) => t.x);
  const ys = own.map((t) => t.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  if ((x1 - x0 + 1) * (y1 - y0 + 1) > MAX_BLOCK_TILES) {
    const seen = new Map(own.map((t) => [`${t.x}/${t.y}`, t]));
    return [...seen.values()];
  }
  const block: Tile[] = [];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) block.push({ x, y, z: TILE_ZOOM });
  return block;
}

export function tileUrl(template: string, { x, y, z }: Tile): string {
  return template.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));
}

const requested = new Set<string>();

function wantsLessData(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

/** Fetch (and discard) the tiles for `stops`, one at a time while the browser is idle. Safe to call repeatedly. */
export function prefetchTiles(map: MapLibreMap, stops: readonly Stop[]): void {
  if (wantsLessData()) return;
  const template = (map.getSource("omt") as { tiles?: string[] } | undefined)?.tiles?.[0];
  if (!template) return;
  const urls = tilesForStops(stops).map((t) => tileUrl(template, t)).filter((u) => !requested.has(u));
  for (const u of urls) requested.add(u);
  const idle = (cb: () => void) => ("requestIdleCallback" in window ? requestIdleCallback(cb, { timeout: 2000 }) : setTimeout(cb, 300));
  const next = () => {
    const url = urls.shift();
    if (!url) return;
    fetch(url, { priority: "low" } as RequestInit)
      .then((r) => r.arrayBuffer())
      .catch(() => requested.delete(url))
      .finally(() => idle(next));
  };
  idle(next);
}
