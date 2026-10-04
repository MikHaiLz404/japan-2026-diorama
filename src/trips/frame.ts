// Default framing for a trip that doesn't hand-tune its camera: fit everything that happened.
import type { Trip } from "../data/trip";
import type { LngLat } from "../data/types";
import type { BoundingBox } from "./types";

/**
 * Extra room around the trip's extent, as a fraction of its span (at least MIN_PAD_DEG). Generous on purpose:
 * the desktop panel covers ~400 px on the left, and a tight pan limit would stop the camera from shifting far
 * enough to show the westernmost stop beside it.
 */
const PAD_FRACTION = 1;
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
  const padLng = Math.max((box.east - box.west) * PAD_FRACTION, MIN_PAD_DEG);
  const padLat = Math.max((box.north - box.south) * PAD_FRACTION, MIN_PAD_DEG);
  return [[box.west - padLng, box.south - padLat], [box.east + padLng, box.north + padLat]];
}

export const toLngLatPair = (box: BoundingBox): [LngLat, LngLat] => [[box.west, box.south], [box.east, box.north]];
