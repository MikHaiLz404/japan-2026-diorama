const EARTH_KM = 6371;
const KM_PER_DEG_LAT = 111.32;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function kmPerDegLng(lat: number): number {
  return KM_PER_DEG_LAT * Math.cos(toRad(lat));
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Local km offsets from an anchor: x = east, z = north (the tray flips z so north is up). */
export function latLngToLocalKm(
  lat: number,
  lng: number,
  anchorLat: number,
  anchorLng: number,
): { x: number; z: number } {
  return {
    x: (lng - anchorLng) * kmPerDegLng(anchorLat),
    z: (lat - anchorLat) * KM_PER_DEG_LAT,
  };
}

export interface TrayBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface GeoProjectable {
  id: string;
  lat: number;
  lng: number;
}

/** Default felt play area inside the wooden rim (see `makeTray`). */
export const DEFAULT_TRAY_BOUNDS: TrayBounds = {
  minX: -4.35,
  maxX: 4.35,
  minZ: -3.35,
  maxZ: 3.05,
};

export interface GeoTrayTransform {
  /** Tray (x, z) for a lat/lng: east is +x, north is -z (top of the screen). */
  project(lat: number, lng: number): [number, number];
  scale: number;
}

/**
 * Map orientation for the tray: north is the top of the screen (-z), east is right (+x),
 * and the anchor (Tokyo) sits at the centre of the play area. The scale is the largest
 * that still fits every city on its side of the anchor.
 */
export function geoTrayTransform(
  cities: GeoProjectable[],
  anchorId = "tokyo",
  bounds: TrayBounds = DEFAULT_TRAY_BOUNDS,
): GeoTrayTransform {
  const anchor = cities.find((city) => city.id === anchorId) ?? cities[0];
  const locals = cities.map((city) => latLngToLocalKm(city.lat, city.lng, anchor.lat, anchor.lng));
  const reachX = Math.max(0.001, ...locals.map((point) => Math.abs(point.x)));
  const reachZ = Math.max(0.001, ...locals.map((point) => Math.abs(point.z)));
  const halfW = (bounds.maxX - bounds.minX) / 2;
  const halfD = (bounds.maxZ - bounds.minZ) / 2;
  const scale = Math.min(halfW / reachX, halfD / reachZ) * 0.88;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  return {
    scale,
    project(lat, lng) {
      const local = latLngToLocalKm(lat, lng, anchor.lat, anchor.lng);
      return [centerX + local.x * scale, centerZ - local.z * scale];
    },
  };
}

/**
 * Project lat/lng cities onto the stylized tray (north up, anchor at the centre),
 * then nudge overlaps apart. The anchor never moves.
 */
export function projectGeoToTray<T extends GeoProjectable>(
  cities: T[],
  anchorId = "tokyo",
  bounds: TrayBounds = DEFAULT_TRAY_BOUNDS,
  minSeparation = 1.55,
): Map<string, [number, number]> {
  const anchor = cities.find((city) => city.id === anchorId) ?? cities[0];
  const { project } = geoTrayTransform(cities, anchor.id, bounds);

  const tray = new Map<string, [number, number]>();
  for (const city of cities) tray.set(city.id, project(city.lat, city.lng));

  const ids = [...tray.keys()];
  for (let pass = 0; pass < 12; pass += 1) {
    let moved = false;
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const a = tray.get(ids[i])!;
        const b = tray.get(ids[j])!;
        const dx = b[0] - a[0];
        const dz = b[1] - a[1];
        const dist = Math.hypot(dx, dz);
        if (dist >= minSeparation || dist < 1e-6) continue;
        const push = (minSeparation - dist) / 2;
        const nx = dx / dist;
        const nz = dz / dist;
        const aFixed = ids[i] === anchor.id;
        const bFixed = ids[j] === anchor.id;
        if (!aFixed) {
          a[0] -= nx * push * (bFixed ? 2 : 1);
          a[1] -= nz * push * (bFixed ? 2 : 1);
        }
        if (!bFixed) {
          b[0] += nx * push * (aFixed ? 2 : 1);
          b[1] += nz * push * (aFixed ? 2 : 1);
        }
        moved = true;
      }
    }
    if (!moved) break;
  }

  for (const [id, [x, z]] of tray) {
    tray.set(id, [
      Math.min(bounds.maxX, Math.max(bounds.minX, x)),
      Math.min(bounds.maxZ, Math.max(bounds.minZ, z)),
    ]);
  }

  return tray;
}
