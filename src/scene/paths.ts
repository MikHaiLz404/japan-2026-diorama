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

export function makeRoute(route: RoutePath): THREE.Line {
  const from = trayPoint(route.fromCityId);
  const to = trayPoint(route.toCityId);
  const mid = from.clone().lerp(to, 0.5);
  const lift = route.type === "airplane" ? 1.55 : 0.28;
  mid.y += lift;
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  const points = curve.getPoints(route.type === "airplane" ? 28 : 16);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: pathColor(route.status, route.type),
    transparent: true,
    opacity: route.status === "upcoming" ? 0.35 : 0.85,
  });
  const line = new THREE.Line(geometry, material);
  line.name = `route:${route.id}`;
  return line;
}
