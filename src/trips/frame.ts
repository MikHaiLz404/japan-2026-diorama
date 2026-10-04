// Default framing for a trip that doesn't hand-tune its camera: fit everything that happened.
import type { Trip } from "../data/trip";
import type { LngLat } from "../data/types";
import type { BoundingBox } from "./types";

/**
 * Extra room on every side of the trip's extent, as a multiple of its larger span (at least MIN_PAD_DEG).
 * Generous on purpose: maxBounds also caps how far the camera can zoom out, and a tall phone screen tilted to
 * 45° sees far more than the extent — a tight limit clamps the zoom and leaves the outer stops off-screen. It
 * also lets the camera shift far enough to show the westernmost stop beside the desktop panel.
 */
const PAD_FRACTION = 3;
const MIN_PAD_DEG = 0.15;

export function tripExtent({ stops, legs }: Pick<Trip, "stops" | "legs">): BoundingBox {
  const points: LngLat[] = [...stops.map((s) => s.lngLat), ...legs.flatMap((l) => l.coords)];
  if (!points.length) throw new Error("Trip has no dated stops or legs to frame");
  const lngs = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  return { west: Math.min(...lngs), south: Math.min(...lats), east: Math.max(...lngs), north: Math.max(...lats) };
}

/** The extent grown on every side — used as the pan/zoom-out limit. */
export function paddedBounds(box: BoundingBox): [LngLat, LngLat] {
  const pad = Math.max(Math.max(box.east - box.west, box.north - box.south) * PAD_FRACTION, MIN_PAD_DEG);
  return [[box.west - pad, box.south - pad], [box.east + pad, box.north + pad]];
}

export const toLngLatPair = (box: BoundingBox): [LngLat, LngLat] => [[box.west, box.south], [box.east, box.north]];
