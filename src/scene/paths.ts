import * as THREE from "three";
import type { RoutePath } from "../data/types";
import { ORIGIN_TOKEN, cityById } from "../data/cities";
import { pathColor } from "./palette";

export interface RouteRenderOptions {
  /** Index among all routes — used to stagger height and lateral offset. */
  index: number;
  /** How many routes share the same city pair (for fan-out). */
  parallelCount: number;
  /** Slot within the parallel group (0..parallelCount-1). */
  parallelIndex: number;
}

function trayPoint(cityId: string): THREE.Vector3 {
  if (cityId === ORIGIN_TOKEN.id) {
    return new THREE.Vector3(ORIGIN_TOKEN.tray[0], 0.12, ORIGIN_TOKEN.tray[1]);
  }
  const city = cityById(cityId);
  if (!city) return new THREE.Vector3();
  return new THREE.Vector3(city.tray[0], 0.12, city.tray[1]);
}

function routeOffset(
  from: THREE.Vector3,
  to: THREE.Vector3,
  options: RouteRenderOptions,
): { from: THREE.Vector3; to: THREE.Vector3 } {
  const dir = to.clone().sub(from);
  const len = dir.length();
  if (len < 1e-4) return { from, to };

  dir.normalize();
  const perp = new THREE.Vector3(-dir.z, 0, dir.x);
  const slot = options.parallelIndex - (options.parallelCount - 1) / 2;
  const lateral = slot * 0.14;
  const indexLift = options.index * 0.045;

  return {
    from: from.clone().add(perp.clone().multiplyScalar(lateral)),
    to: to.clone().add(perp.clone().multiplyScalar(lateral)).add(new THREE.Vector3(0, indexLift, 0)),
  };
}

export function makeRoute(route: RoutePath, options: RouteRenderOptions): THREE.Mesh {
  let from = trayPoint(route.fromCityId);
  let to = trayPoint(route.toCityId);

  if (route.fromCityId === ORIGIN_TOKEN.id) {
    to.x -= 0.85;
    to.z += 0.35;
  } else {
    ({ from, to } = routeOffset(from, to, options));
  }

  const mid = from.clone().lerp(to, 0.5);
  const isFlight = route.type === "airplane";
  const lift = isFlight ? 1.85 + options.index * 0.12 : 0.34 + options.index * 0.07;
  mid.y += lift;

  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  const radius = isFlight ? 0.024 : 0.036;
  const geometry = new THREE.TubeGeometry(curve, isFlight ? 32 : 20, radius, 6, false);
  const color = pathColor(route.status, route.type);
  const material = new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity: route.status === "upcoming" ? 0.72 : 0.98,
    roughness: isFlight ? 0.28 : 0.32,
    metalness: isFlight ? 0.22 : 0.5,
    emissive: route.status === "today" ? color : 0x000000,
    emissiveIntensity: route.status === "today" ? 0.08 : 0,
  });
  const tube = new THREE.Mesh(geometry, material);
  tube.castShadow = true;
  tube.name = `route:${route.id}`;
  return tube;
}

/** Count parallel routes per unordered city pair for ribbon fan-out. */
export function routeParallelMeta(routes: RoutePath[]): RouteRenderOptions[] {
  const groups = new Map<string, number[]>();
  routes.forEach((route, index) => {
    if (route.fromCityId === ORIGIN_TOKEN.id || route.toCityId === ORIGIN_TOKEN.id) {
      groups.set(`origin:${route.id}`, [index]);
      return;
    }
    const key = [route.fromCityId, route.toCityId].sort().join("<->");
    const list = groups.get(key) ?? [];
    list.push(index);
    groups.set(key, list);
  });

  const parallelCount = new Array<number>(routes.length).fill(1);
  const parallelIndex = new Array<number>(routes.length).fill(0);
  for (const indices of groups.values()) {
    for (let slot = 0; slot < indices.length; slot += 1) {
      parallelCount[indices[slot]] = indices.length;
      parallelIndex[indices[slot]] = slot;
    }
  }

  return routes.map((_, index) => ({
    index,
    parallelCount: parallelCount[index],
    parallelIndex: parallelIndex[index],
  }));
}
