#!/usr/bin/env node
/**
 * Snap each transport leg in src/data/japan-2026.json onto real geometry → src/data/routes.json
 *
 *   trains / subways: shortest path over the OSM rail network (Overpass, cached in scripts/cache/rail.json)
 *   buses:            OSRM driving route (router.project-osrm.org)
 *
 * Legs that fail or detour implausibly are left out; the app draws a gentle arc for those.
 * Run after `npm run refresh-data`:  npm run build-routes
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureFile = join(root, "src/data/japan-2026.json");
const railCache = join(root, "scripts/cache/rail.json");
const outFile = join(root, "src/data/routes.json");
const USER_AGENT = "japan-2026-replay (https://github.com/MikHaiLz404)";

const RAIL_BBOX = "35.28,139.45,35.81,140.42"; // Enoshima … Narita
const RAIL_QUERY = `[out:json][timeout:180];way["railway"~"^(rail|subway|light_rail|monorail|narrow_gauge|tram)$"]["service"!~"yard|siding|spur|crossover"](${RAIL_BBOX});(._;>;);out skel qt;`;
const RAIL_KINDS = new Set(["train", "subway"]);
const ROAD_KINDS = new Set(["bus"]);
const SNAP_RADIUS_M = 1500;
const TRANSFER_RADIUS_M = 120;
/** Station transfers cost extra so paths prefer staying on one line. */
const TRANSFER_PENALTY_M = 400;
const MAX_DETOUR = 3;
const SIMPLIFY_DEG = 0.00004;
const GRID_DEG = 0.002;

const RAD = Math.PI / 180;
const dist = (a, b) => {
  const x = (b[0] - a[0]) * RAD * Math.cos(((a[1] + b[1]) / 2) * RAD);
  return Math.hypot(x, (b[1] - a[1]) * RAD) * 6371000;
};
const length = (pts) => pts.slice(1).reduce((sum, p, i) => sum + dist(pts[i], p), 0);

async function loadRail() {
  if (!existsSync(railCache)) {
    console.log("Fetching OSM rail network from Overpass (one-off, ~10 MB)…");
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: RAIL_QUERY }),
    });
    if (!res.ok) throw new Error(`Overpass ${res.status}: ${(await res.text()).slice(0, 200)}`);
    await mkdir(dirname(railCache), { recursive: true });
    await writeFile(railCache, await res.text());
  }
  return JSON.parse(await readFile(railCache, "utf8"));
}

function buildRailGraph(rail) {
  const coord = new Map();
  const waysOf = new Map();
  const adj = new Map();
  const link = (a, b, w) => {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push([b, w]);
    adj.get(b).push([a, w]);
  };
  for (const e of rail.elements) if (e.type === "node") coord.set(e.id, [e.lon, e.lat]);
  for (const e of rail.elements) {
    if (e.type !== "way") continue;
    for (let i = 1; i < e.nodes.length; i++) {
      const [a, b] = [e.nodes[i - 1], e.nodes[i]];
      if (coord.has(a) && coord.has(b)) link(a, b, dist(coord.get(a), coord.get(b)));
    }
    for (const n of e.nodes) {
      if (!waysOf.has(n)) waysOf.set(n, new Set());
      waysOf.get(n).add(e.id);
    }
  }

  const grid = new Map();
  const cell = ([x, y]) => [Math.floor(x / GRID_DEG), Math.floor(y / GRID_DEG)];
  for (const [id, c] of coord) {
    if (!adj.has(id)) continue;
    const key = cell(c).join();
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(id);
  }
  const near = (c, r) => {
    const [cx, cy] = cell(c);
    const out = [];
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) out.push(...(grid.get(`${cx + dx},${cy + dy}`) ?? []));
    return out;
  };

  // Different lines rarely share nodes at stations, so join nearby nodes of different ways.
  for (const [id, c] of coord) {
    if (!adj.has(id)) continue;
    const mine = waysOf.get(id);
    for (const other of near(c, 1)) {
      if (other <= id || [...mine].some((w) => waysOf.get(other).has(w))) continue;
      const d = dist(c, coord.get(other));
      if (d < TRANSFER_RADIUS_M) link(id, other, d * 3 + TRANSFER_PENALTY_M);
    }
  }

  const nearest = (c) => {
    for (let r = 1; r <= 8; r++) {
      let best = null;
      let bestD = Infinity;
      for (const id of near(c, r)) {
        const d = dist(c, coord.get(id));
        if (d < bestD) { bestD = d; best = id; }
      }
      if (best) return { id: best, d: bestD };
    }
    return null;
  };
  return { coord, adj, nearest };
}

class MinHeap {
  a = [];
  get size() { return this.a.length; }
  push(x) {
    const a = this.a;
    a.push(x);
    for (let i = a.length - 1; i;) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

function shortestPath({ adj, coord }, from, to) {
  const best = new Map([[from, 0]]);
  const prev = new Map();
  const heap = new MinHeap();
  heap.push([0, from]);
  while (heap.size) {
    const [d, u] = heap.pop();
    if (u === to) break;
    if (d > best.get(u)) continue;
    for (const [v, w] of adj.get(u)) {
      const nd = d + w;
      if (nd < (best.get(v) ?? Infinity)) {
        best.set(v, nd);
        prev.set(v, u);
        heap.push([nd, v]);
      }
    }
  }
  if (!prev.has(to)) return null;
  const path = [to];
  while (path.at(-1) !== from) path.push(prev.get(path.at(-1)));
  return path.reverse().map((id) => coord.get(id));
}

function simplify(pts, tolerance) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop();
    const [[ax, ay], [bx, by]] = [pts[i], pts[j]];
    let maxD = 0;
    let at = -1;
    for (let k = i + 1; k < j; k++) {
      const [px, py] = pts[k];
      const dx = bx - ax;
      const dy = by - ay;
      const l2 = dx * dx + dy * dy;
      const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
      const d = Math.hypot(px - ax - t * dx, py - ay - t * dy);
      if (d > maxD) { maxD = d; at = k; }
    }
    if (maxD > tolerance) {
      keep[at] = 1;
      stack.push([i, at], [at, j]);
    }
  }
  return pts.filter((_, k) => keep[k]).map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)]);
}

async function roadRoute(a, b) {
  const url = `https://router.project-osrm.org/route/v1/driving/${a.join(",")};${b.join(",")}?overview=full&geometries=geojson`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  return (await res.json()).routes?.[0]?.geometry.coordinates ?? null;
}

const fixture = JSON.parse(await readFile(fixtureFile, "utf8"));
const legs = fixture.transportations.filter((t) =>
  (RAIL_KINDS.has(t.type) || ROAD_KINDS.has(t.type))
  && Number.isFinite(t.departure.latitude) && Number.isFinite(t.arrival.latitude));
const graph = legs.some((t) => RAIL_KINDS.has(t.type)) ? buildRailGraph(await loadRail()) : null;

const out = [];
for (const t of legs) {
  const from = [t.departure.longitude, t.departure.latitude];
  const to = [t.arrival.longitude, t.arrival.latitude];
  const straight = dist(from, to);
  let coords = null;
  let note = "";
  try {
    if (RAIL_KINDS.has(t.type)) {
      const [s, e] = [graph.nearest(from), graph.nearest(to)];
      if (s && e && s.d < SNAP_RADIUS_M && e.d < SNAP_RADIUS_M) {
        const path = shortestPath(graph, s.id, e.id);
        if (path) coords = [from, ...path, to];
      } else note = "no station nearby";
    } else {
      const road = await roadRoute(from, to);
      if (road) coords = [from, ...road, to];
    }
  } catch (err) {
    note = err.message;
  }
  if (coords && straight > 800 && length(coords) / straight > MAX_DETOUR) {
    note = `detour ×${(length(coords) / straight).toFixed(1)}`;
    coords = null;
  }
  const label = `${t.departure.name} → ${t.arrival.name}`.slice(0, 60);
  console.log(`${t.id} ${t.type.padEnd(6)} ${(straight / 1000).toFixed(1).padStart(5)} km  ${coords ? "✓" : "· arc"} ${note} ${label}`);
  if (coords) out.push({ id: t.id, mode: RAIL_KINDS.has(t.type) ? "rail" : "road", coords: simplify(coords, SIMPLIFY_DEG) });
}
await writeFile(outFile, `${JSON.stringify(out)}\n`);
console.log(`Wrote ${outFile} (${out.length}/${legs.length} legs snapped)`);
