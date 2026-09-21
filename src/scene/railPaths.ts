import * as THREE from "three";
import type { GroundPathSegment, VisitStatus } from "../data/types";
import { cityById } from "../data/cities";
import { junctionTray, waypointsForPair } from "./railWaypoints";

const RAIL_Y = 0.082;
const GAUGE = 0.16;
const RAIL_RADIUS = 0.032;
const SLEEPER_SPACING = 0.25;
const SLEEPER_LENGTH = 0.2;
const SLEEPER_HEIGHT = 0.018;
const SLEEPER_DEPTH = 0.036;
const END_TRIM = 0.38;
const SAMPLE_COUNT = 48;

const RAIL_SILVER = 0xb4bac4;
const RAIL_BRONZE = 0xa87850;
const SLEEPER_WOOD = 0x4a3828;

function trayPos(cityId: string): THREE.Vector3 {
  const city = cityById(cityId);
  return new THREE.Vector3(city?.tray[0] ?? 0, RAIL_Y, city?.tray[1] ?? 0);
}

function junctionPos(junctionId: string): THREE.Vector3 {
  const [x, z] = junctionTray(junctionId as Parameters<typeof junctionTray>[0]);
  return new THREE.Vector3(x, RAIL_Y, z);
}

function trimEndpoints(from: THREE.Vector3, to: THREE.Vector3): [THREE.Vector3, THREE.Vector3] {
  const dir = to.clone().sub(from);
  const len = dir.length();
  if (len < END_TRIM * 2.2) return [from, to];
  dir.normalize();
  return [
    from.clone().addScaledVector(dir, END_TRIM),
    to.clone().addScaledVector(dir, -END_TRIM),
  ];
}

function segmentCurve(segment: GroundPathSegment): THREE.Curve<THREE.Vector3> {
  const from = trayPos(segment.fromCityId);
  const to = trayPos(segment.toCityId);
  const waypointIds = waypointsForPair(segment.fromCityId, segment.toCityId);

  const knots = [
    from,
    ...waypointIds.map((id) => junctionPos(id)),
    to,
  ];

  if (knots.length === 2) {
    const [a, b] = trimEndpoints(knots[0], knots[1]);
    return new THREE.LineCurve3(a, b);
  }

  const [trimmedFrom] = trimEndpoints(knots[0], knots[1]);
  const [, trimmedTo] = trimEndpoints(knots[knots.length - 2], knots[knots.length - 1]);
  const spline = [trimmedFrom, ...knots.slice(1, -1), trimmedTo];
  return new THREE.CatmullRomCurve3(spline, false, "catmullrom", 0.35);
}

function sampleCurve(curve: THREE.Curve<THREE.Vector3>): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= SAMPLE_COUNT; i += 1) {
    points.push(curve.getPoint(i / SAMPLE_COUNT));
  }
  return points;
}

function offsetPolyline(points: THREE.Vector3[], halfGauge: number): THREE.Vector3[] {
  const offset: THREE.Vector3[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const tangent = new THREE.Vector3(next.x - prev.x, 0, next.z - prev.z);
    if (tangent.lengthSq() < 1e-8) {
      offset.push(points[i].clone());
      continue;
    }
    tangent.normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
    offset.push(points[i].clone().addScaledVector(normal, halfGauge));
  }
  return offset;
}

function railMaterial(status: VisitStatus, bronze: boolean): THREE.MeshStandardMaterial {
  const upcoming = status === "upcoming";
  return new THREE.MeshStandardMaterial({
    color: upcoming ? (bronze ? 0xc89870 : 0xc8ccd4) : bronze ? RAIL_BRONZE : RAIL_SILVER,
    metalness: 0.74,
    roughness: 0.26,
    transparent: upcoming,
    opacity: upcoming ? 0.58 : 0.96,
  });
}

function sleeperMaterial(status: VisitStatus): THREE.MeshStandardMaterial {
  const upcoming = status === "upcoming";
  return new THREE.MeshStandardMaterial({
    color: upcoming ? 0x6a5848 : SLEEPER_WOOD,
    roughness: 0.92,
    metalness: 0.02,
    transparent: upcoming,
    opacity: upcoming ? 0.52 : 0.82,
  });
}

function addRailTube(
  parent: THREE.Group,
  points: THREE.Vector3[],
  material: THREE.Material,
  name: string,
) {
  if (points.length < 2) return;
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.2);
  const length = curve.getLength();
  if (length < 0.15) return;
  const geometry = new THREE.TubeGeometry(curve, Math.max(12, Math.round(length * 14)), RAIL_RADIUS, 5, false);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  parent.add(mesh);
}

function addSleepers(
  parent: THREE.Group,
  points: THREE.Vector3[],
  material: THREE.Material,
  name: string,
) {
  const sleeperGeo = new THREE.BoxGeometry(1, 1, 1);
  let traveled = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const segLen = a.distanceTo(b);
    traveled += segLen;
    if (traveled < SLEEPER_SPACING * 0.5) continue;
    if (traveled < SLEEPER_SPACING) continue;
    traveled = 0;

    const tangent = b.clone().sub(a);
    if (tangent.lengthSq() < 1e-8) continue;
    tangent.normalize();
    const yaw = Math.atan2(tangent.x, tangent.z);

    const sleeper = new THREE.Mesh(sleeperGeo, material);
    sleeper.scale.set(SLEEPER_LENGTH, SLEEPER_HEIGHT, SLEEPER_DEPTH);
    sleeper.position.copy(a.clone().lerp(b, 0.5));
    sleeper.position.y = RAIL_Y - SLEEPER_HEIGHT * 0.35;
    sleeper.rotation.y = yaw;
    sleeper.receiveShadow = true;
    sleeper.name = name;
    parent.add(sleeper);
  }
}

/** Twin parallel rails with wooden sleepers on the felt tray. */
export function makeRailPaths(segments: GroundPathSegment[]): THREE.Group {
  const group = new THREE.Group();
  group.name = "rail-paths";

  for (const segment of segments) {
    const curve = segmentCurve(segment);
    if (curve.getLength() < 0.2) continue;

    const track = new THREE.Group();
    track.name = segment.id;

    const centerline = sampleCurve(curve);
    const leftRail = offsetPolyline(centerline, GAUGE / 2);
    const rightRail = offsetPolyline(centerline, -GAUGE / 2);

    const leftMat = railMaterial(segment.status, false);
    const rightMat = railMaterial(segment.status, true);
    const sleeperMat = sleeperMaterial(segment.status);

    addRailTube(track, leftRail, leftMat, `${segment.id}:rail-left`);
    addRailTube(track, rightRail, rightMat, `${segment.id}:rail-right`);
    addSleepers(track, centerline, sleeperMat, `${segment.id}:sleeper`);

    group.add(track);
  }

  return group;
}
