// Landmark catalogue. Positions are checked against OSM; `hide` lists the OSM way ids whose extrusions a model
// replaces, `osm` the basemap buildings that are tinted instead of modelled. Only landmarks the trip actually
// reached are shown (see visitedLandmarks).
import type * as THREE from "three";
import * as B from "./builders";
import { distance } from "../lib/geo";
import type { LngLat } from "../data/types";
import type { BuildingHighlights } from "./style";

export type LandmarkIcon =
  | "needle" | "pagoda" | "gate" | "temple" | "buddha" | "light" | "wheel" | "cross" | "orbs" | "glass" | "brick";

export interface Landmark {
  id: string;
  name: string;
  at: LngLat;
  /** Badge anchor height in model meters (before `scale`). */
  top: number;
  /** Lower wins badge collisions. */
  rank: number;
  icon: LandmarkIcon;
  scale?: number;
  rotate?: number;
  /** No badge (a secondary model under another landmark's badge). */
  quiet?: boolean;
  build?: () => THREE.Object3D;
  hide?: number[];
  osm?: number[];
  tint?: string;
  /** Stop-name pattern that counts as a visit when the Tripsy pin sits far from the landmark. */
  match?: RegExp;
}

export const LANDMARKS: Landmark[] = [
  { id: "skytree", name: "Tokyo Skytree", at: [139.81071, 35.71005], top: 650, rank: 0, icon: "needle", build: B.skytree,
    hide: [288269147, 288269148, 362351415] },
  { id: "sensoji", name: "Sensō-ji", at: [139.79604, 35.7141], top: 58, scale: 1.25, rank: 1, icon: "pagoda",
    build: () => B.pagoda(5, 11, 8.4), hide: [173154770] },
  { id: "hozomon", name: "Hōzōmon", at: [139.79666, 35.71393], top: 22, rank: 9, icon: "gate", quiet: true,
    build: () => B.gate(22, 21.7, 2.2), rotate: 0.12, hide: [573271561] },
  { id: "kaminarimon", name: "Kaminarimon", at: [139.79637, 35.71113], top: 12, scale: 1.6, rank: 2, icon: "gate",
    build: () => B.gate(12, 11.7, 1.9), rotate: 0.12, hide: [173154849] },
  // Crosswalks + pedestrians are map layers (scramble.ts); this entry is the badge only.
  { id: "scramble", name: "Shibuya Scramble", at: [139.70048, 35.65952], top: 18, rank: 1, icon: "cross" },
  { id: "shibuyasky", name: "Shibuya Sky", at: [139.70222, 35.65838], top: 230, rank: 2, icon: "glass", tint: "#8ea6d6", osm: [617560918] },
  { id: "teamlab", name: "teamLab Planets", at: [139.78973, 35.64938], top: 44, rank: 2, icon: "orbs", build: B.orbs, match: /teamlab/i },
  { id: "daibutsu", name: "Kamakura Daibutsu", at: [139.53572, 35.31685], top: 19, scale: 3.5, rank: 0, icon: "buddha", build: B.daibutsu },
  { id: "hasedera", name: "Hase-dera", at: [139.533, 35.31246], top: 15, scale: 1.4, rank: 1, icon: "temple",
    build: () => B.hall(22, 16, 14), hide: [767740070] },
  { id: "seacandle", name: "Enoshima Sea Candle", at: [139.47848, 35.29976], top: 62, scale: 1.4, rank: 0, icon: "light", build: B.seaCandle },
  { id: "cosmoclock", name: "Cosmo Clock 21", at: [139.63677, 35.45539], top: 118, rank: 0, icon: "wheel", build: B.cosmoClock,
    rotate: 2.1, hide: [363854124] },
  { id: "redbrick", name: "Red Brick Warehouse", at: [139.64292, 35.4524], top: 22, rank: 1, icon: "brick", tint: "#b9553c", osm: [72998296] },
];

const VISIT_RADIUS_M = 400;

/** Landmarks the trip reached: a dated stop within VISIT_RADIUS_M, or a stop named after it. */
export function visitedLandmarks(
  stops: { lngLat: LngLat; name: string }[],
  catalogue: Landmark[] = LANDMARKS,
): Landmark[] {
  return catalogue.filter((lm) =>
    stops.some((s) => distance(s.lngLat, lm.at) <= VISIT_RADIUS_M || lm.match?.test(s.name)));
}

export const hiddenBuildings = (list: Landmark[]): number[] => list.flatMap((l) => l.hide ?? []);

export function buildingHighlights(list: Landmark[]): BuildingHighlights {
  return list.filter((l) => l.osm?.length && l.tint).flatMap((l) => [l.osm!, l.tint!]);
}
