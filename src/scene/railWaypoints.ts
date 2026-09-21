import { CITY_CATALOG } from "../data/cities";
import { latLngToLocalKm } from "../lib/geo";

/** Real junction / Enoden stops projected onto the tray (same transform as cities). */
export const RAIL_JUNCTIONS = {
  shinagawa: { name: "Shinagawa", lat: 35.6284, lng: 139.7387 },
  ofuna: { name: "Ofuna", lat: 35.4188, lng: 139.4875 },
  shinjuku: { name: "Shinjuku", lat: 35.6896, lng: 139.7006 },
  ikebukuro: { name: "Ikebukuro", lat: 35.7295, lng: 139.7109 },
  makuhari: { name: "Makuhari", lat: 35.6482, lng: 140.0417 },
  hase: { name: "Hase", lat: 35.3122, lng: 139.5362 },
  shichirigahama: { name: "Shichirigahama", lat: 35.306, lng: 139.51 },
  fujisawa: { name: "Fujisawa", lat: 35.3389, lng: 139.4879 },
} as const;

export type RailJunctionId = keyof typeof RAIL_JUNCTIONS;

interface RouteDef {
  /** City from which `waypoints` are listed in travel order toward the other city. */
  anchor: string;
  waypoints: RailJunctionId[];
}

/** Intermediate knots per city pair (canonical sorted pair key). */
export const ROUTE_WAYPOINTS: Record<string, RouteDef> = {
  "enoshima<->kamakura": { anchor: "kamakura", waypoints: ["hase", "shichirigahama"] },
  "tokyo<->yokohama": { anchor: "tokyo", waypoints: ["shinagawa"] },
  "kamakura<->tokyo": { anchor: "tokyo", waypoints: ["shinagawa", "ofuna"] },
  "chiba<->tokyo": { anchor: "tokyo", waypoints: ["makuhari"] },
  "takao<->tokyo": { anchor: "tokyo", waypoints: ["shinjuku"] },
  "kawagoe<->tokyo": { anchor: "tokyo", waypoints: ["ikebukuro"] },
  /** Return leg — via Fujisawa & JR hubs, never a direct chord. */
  "enoshima<->tokyo": {
    anchor: "enoshima",
    waypoints: ["shichirigahama", "fujisawa", "ofuna", "shinagawa"],
  },
};

let trayByJunction: Map<RailJunctionId, [number, number]> | null = null;

function projectionTransform(): {
  anchorLat: number;
  anchorLng: number;
  scale: number;
  centerX: number;
  centerZ: number;
  geoCenterX: number;
  geoCenterZ: number;
} {
  const anchor = CITY_CATALOG.find((city) => city.id === "tokyo") ?? CITY_CATALOG[0];
  const locals = CITY_CATALOG.map((city) =>
    latLngToLocalKm(city.lat, city.lng, anchor.lat, anchor.lng),
  );

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const point of locals) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  }

  const spanX = Math.max(maxX - minX, 0.001);
  const spanZ = Math.max(maxZ - minZ, 0.001);
  const usableW = 4.35 - -4.35;
  const usableD = 3.05 - -3.35;
  const scale = Math.min(usableW / spanX, usableD / spanZ) * 0.88;

  return {
    anchorLat: anchor.lat,
    anchorLng: anchor.lng,
    scale,
    centerX: 0,
    centerZ: -0.15,
    geoCenterX: (minX + maxX) / 2,
    geoCenterZ: (minZ + maxZ) / 2,
  };
}

export function junctionTray(id: RailJunctionId): [number, number] {
  if (!trayByJunction) {
    const t = projectionTransform();
    trayByJunction = new Map();
    for (const [jid, junction] of Object.entries(RAIL_JUNCTIONS) as [
      RailJunctionId,
      (typeof RAIL_JUNCTIONS)[RailJunctionId],
    ][]) {
      const local = latLngToLocalKm(junction.lat, junction.lng, t.anchorLat, t.anchorLng);
      trayByJunction.set(jid, [
        t.centerX + (local.x - t.geoCenterX) * t.scale,
        t.centerZ + (local.z - t.geoCenterZ) * t.scale,
      ]);
    }
  }
  return trayByJunction.get(id) ?? [0, 0];
}

export function waypointsForPair(fromCityId: string, toCityId: string): RailJunctionId[] {
  const pairKey = [fromCityId, toCityId].sort().join("<->");
  const route = ROUTE_WAYPOINTS[pairKey];
  if (!route) return [];

  return fromCityId === route.anchor ? [...route.waypoints] : [...route.waypoints].reverse();
}
