// Landmark model: a 3D model and/or tinted basemap building with an Apple-style badge.
// Each trip defines its own catalogue (src/trips/<slug>/landmarks.ts); only landmarks the trip
// actually reached are shown.
import type * as THREE from "three";
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
  /** OSM way ids whose basemap extrusions the model replaces. */
  hide?: number[];
  /** OSM way ids of basemap buildings to tint instead of modelling. */
  osm?: number[];
  tint?: string;
  /** Stop-name pattern that counts as a visit when the Tripsy pin sits far from the landmark. */
  match?: RegExp;
}

const VISIT_RADIUS_M = 400;

/** Landmarks the trip reached: a dated stop within VISIT_RADIUS_M, or a stop named after it. */
export function visitedLandmarks(stops: { lngLat: LngLat; name: string }[], catalogue: Landmark[]): Landmark[] {
  return catalogue.filter((lm) =>
    stops.some((s) => distance(s.lngLat, lm.at) <= VISIT_RADIUS_M || lm.match?.test(s.name)));
}

export const hiddenBuildings = (list: Landmark[]): number[] => list.flatMap((l) => l.hide ?? []);

export function buildingHighlights(list: Landmark[]): BuildingHighlights {
  return list.filter((l) => l.osm?.length && l.tint).flatMap((l) => [l.osm!, l.tint!]);
}
