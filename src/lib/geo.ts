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

/** Local km offsets from an anchor: x = east, z = north (tray +Z). */
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

/**
 * Project lat/lng cities onto the stylized tray.
 * Uses Tokyo as anchor, uniform scale to fit bounds, then nudges overlaps apart.
 */
export function projectGeoToTray<T extends GeoProjectable>(
  cities: T[],
  anchorId = "tokyo",
  bounds: TrayBounds = DEFAULT_TRAY_BOUNDS,
  minSeparation = 1.55,
): Map<string, [number, number]> {
  const anchor = cities.find((city) => city.id === anchorId) ?? cities[0];
  const locals = cities.map((city) => ({
    id: city.id,
    ...latLngToLocalKm(city.lat, city.lng, anchor.lat, anchor.lng),
  }));

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
  const usableW = bounds.maxX - bounds.minX;
  const usableD = bounds.maxZ - bounds.minZ;
  const scale = Math.min(usableW / spanX, usableD / spanZ) * 0.88;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const geoCenterX = (minX + maxX) / 2;
  const geoCenterZ = (minZ + maxZ) / 2;

  const tray = new Map<string, [number, number]>();
  for (const point of locals) {
    tray.set(point.id, [
      centerX + (point.x - geoCenterX) * scale,
      centerZ + (point.z - geoCenterZ) * scale,
    ]);
  }

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
        a[0] -= nx * push;
        a[1] -= nz * push;
        b[0] += nx * push;
        b[1] += nz * push;
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
