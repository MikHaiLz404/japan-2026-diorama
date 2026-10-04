import type { LngLat } from "../data/types";
import type { BoundingBox } from "../trips/types";

const EARTH_RADIUS_M = 6371000;
const RAD = Math.PI / 180;

/** Equirectangular distance in meters — accurate to well under 1 % at trip scale (< 100 km). */
export function distance(a: LngLat, b: LngLat): number {
  const x = (b[0] - a[0]) * RAD * Math.cos(((a[1] + b[1]) / 2) * RAD);
  const y = (b[1] - a[1]) * RAD;
  return Math.hypot(x, y) * EARTH_RADIUS_M;
}

export function pathLength(points: LngLat[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1], points[i]);
  return total;
}

/** Point at fraction t (0…1) along a polyline, measured by length. */
export function along(points: LngLat[], t: number): LngLat {
  if (points.length === 1 || t <= 0) return points[0];
  if (t >= 1) return points[points.length - 1];
  let remaining = pathLength(points) * t;
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]];
    const d = distance(a, b);
    if (remaining <= d) {
      const f = d ? remaining / d : 0;
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    }
    remaining -= d;
  }
  return points[points.length - 1];
}

/** The polyline truncated at fraction t. */
export function slicePath(points: LngLat[], t: number): LngLat[] {
  if (t >= 1) return points;
  const out: LngLat[] = [points[0]];
  let remaining = pathLength(points) * t;
  for (let i = 1; i < points.length; i++) {
    const d = distance(points[i - 1], points[i]);
    if (remaining <= d) {
      out.push(along([points[i - 1], points[i]], d ? remaining / d : 0));
      break;
    }
    out.push(points[i]);
    remaining -= d;
  }
  return out;
}

/** Gentle quadratic arc between two points — the fallback when no real rail/road geometry exists. */
export function arc(a: LngLat, b: LngLat, segments = 40): LngLat[] {
  const [x0, y0] = a;
  const [x1, y1] = b;
  const dx = x1 - x0;
  const dy = y1 - y0;
  if (Math.hypot(dx, dy) < 1e-4) return [a, b];
  const cx = (x0 + x1) / 2 - dy * 0.18;
  const cy = (y0 + y1) / 2 + dx * 0.18;
  return Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments;
    const u = 1 - t;
    return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1] as LngLat;
  });
}

/** Strictly inside the box. */
export const inBox = ([lng, lat]: LngLat, b: BoundingBox): boolean => lng > b.west && lng < b.east && lat > b.south && lat < b.north;
