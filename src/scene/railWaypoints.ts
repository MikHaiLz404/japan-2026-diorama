import { CITY_CATALOG } from "../data/cities";
import { geoTrayTransform } from "../lib/geo";

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
  funabashi: { name: "Keisei Funabashi", lat: 35.7017, lng: 139.9862 },
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
  "haneda<->tokyo": { anchor: "tokyo", waypoints: ["shinagawa"] },
  "narita<->tokyo": { anchor: "tokyo", waypoints: ["funabashi"] },
  "takao<->tokyo": { anchor: "tokyo", waypoints: ["shinjuku"] },
  "kawagoe<->tokyo": { anchor: "tokyo", waypoints: ["ikebukuro"] },
  /** Return leg — via Fujisawa & JR hubs, never a direct chord. */
  "enoshima<->tokyo": {
    anchor: "enoshima",
    waypoints: ["shichirigahama", "fujisawa", "ofuna", "shinagawa"],
  },
};

let trayByJunction: Map<RailJunctionId, [number, number]> | null = null;

export function junctionTray(id: RailJunctionId): [number, number] {
  if (!trayByJunction) {
    // Same transform as the cities (north up, Tokyo at the centre).
    const { project } = geoTrayTransform(CITY_CATALOG);
    trayByJunction = new Map();
    for (const [jid, junction] of Object.entries(RAIL_JUNCTIONS) as [
      RailJunctionId,
      (typeof RAIL_JUNCTIONS)[RailJunctionId],
    ][]) {
      trayByJunction.set(jid, project(junction.lat, junction.lng));
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
