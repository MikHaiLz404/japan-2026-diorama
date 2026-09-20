import * as THREE from "three";
import type { RoutePath } from "../data/types";
import { ORIGIN_TOKEN, cityById } from "../data/cities";
import { pathColor } from "./palette";

function trayPoint(cityId: string): THREE.Vector3 {
  if (cityId === ORIGIN_TOKEN.id) {
    return new THREE.Vector3(ORIGIN_TOKEN.tray[0], 0.12, ORIGIN_TOKEN.tray[1]);
  }
  const city = cityById(cityId);
  if (!city) return new THREE.Vector3();
  return new THREE.Vector3(city.tray[0], 0.12, city.tray[1]);
}

export function makeRoute(route: RoutePath): THREE.Mesh {
  const from = trayPoint(route.fromCityId);
  const to = trayPoint(route.toCityId);
  if (route.fromCityId === ORIGIN_TOKEN.id) {
    to.x -= 0.85;
    to.z += 0.35;
  }
  const mid = from.clone().lerp(to, 0.5);
  const lift = route.type === "airplane" ? 1.55 : 0.28;
  mid.y += lift;
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  const geometry = new THREE.TubeGeometry(
    curve,
    route.type === "airplane" ? 28 : 18,
    route.type === "airplane" ? 0.03 : 0.045,
    6,
    false,
  );
  const material = new THREE.MeshStandardMaterial({
    color: pathColor(route.status, route.type),
    transparent: true,
    opacity: route.status === "upcoming" ? 0.62 : 0.95,
    roughness: 0.35,
    metalness: route.type === "airplane" ? 0.15 : 0.45,
  });
  const tube = new THREE.Mesh(geometry, material);
  tube.castShadow = true;
  tube.name = `route:${route.id}`;
  return tube;
}
