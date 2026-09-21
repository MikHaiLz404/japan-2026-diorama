import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildGroundPathSegments } from "../data/cities";
import { trip } from "../data/loadTrip";
import { junctionTray } from "./railWaypoints";
import { makeRailPaths } from "./railPaths";

describe("makeRailPaths", () => {
  it("builds twin-rail geometry for every segment", () => {
    const segments = buildGroundPathSegments(trip, "2026-09-20");
    const rails = makeRailPaths(segments);
    expect(rails.name).toBe("rail-paths");
    expect(rails.children.length).toBe(segments.length);
    for (const track of rails.children) {
      const left = track.getObjectByName(`${track.name}:rail-left`);
      const right = track.getObjectByName(`${track.name}:rail-right`);
      expect(left).toBeTruthy();
      expect(right).toBeTruthy();
      expect(left).toBeInstanceOf(THREE.Mesh);
      expect(right).toBeInstanceOf(THREE.Mesh);
    }
  });

  it("uses a spline with coastal bulge for Kamakura–Enoshima", () => {
    const segments = buildGroundPathSegments(trip, "2026-09-20");
    const coastal = segments.find(
      (segment) =>
        [segment.fromCityId, segment.toCityId].sort().join("<->") === "enoshima<->kamakura",
    );
    expect(coastal).toBeTruthy();
    const rails = makeRailPaths(coastal ? [coastal] : []);
    expect(rails.children.length).toBe(1);
    const left = rails.children[0].getObjectByName(`${rails.children[0].name}:rail-left`) as THREE.Mesh;
    const geometry = left.geometry as THREE.TubeGeometry;
    const curve = geometry.parameters.path as THREE.Curve<THREE.Vector3>;
    const hase = junctionTray("hase");
    let nearestHase = Infinity;
    for (let i = 0; i <= 24; i += 1) {
      const p = curve.getPoint(i / 24);
      nearestHase = Math.min(nearestHase, Math.hypot(p.x - hase[0], p.z - hase[1]));
    }
    expect(nearestHase).toBeLessThan(0.2);
  });

  it("uses rail tubes thick enough to read at diorama zoom", () => {
    const segments = buildGroundPathSegments(trip, "2026-09-20");
    const rails = makeRailPaths(segments);
    const radii: number[] = [];
    rails.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      if (!child.name.endsWith(":rail-left") && !child.name.endsWith(":rail-right")) return;
      const geometry = child.geometry as THREE.TubeGeometry;
      radii.push(geometry.parameters.radius);
    });
    expect(radii.length).toBeGreaterThan(0);
    expect(Math.min(...radii)).toBeGreaterThanOrEqual(0.01);
  });

  it("routes Enoshima–Tokyo through Fujisawa, not a straight chord", () => {
    const segments = buildGroundPathSegments(trip, "2026-09-20");
    const leg = segments.find(
      (segment) =>
        [segment.fromCityId, segment.toCityId].sort().join("<->") === "enoshima<->tokyo",
    );
    expect(leg).toBeTruthy();
    const rails = makeRailPaths(leg ? [leg] : []);
    const left = rails.children[0].getObjectByName(`${rails.children[0].name}:rail-left`) as THREE.Mesh;
    const curve = (left.geometry as THREE.TubeGeometry).parameters.path as THREE.Curve<THREE.Vector3>;
    const direct = new THREE.Line3(
      new THREE.Vector3(-1.73, 0, -3.07),
      new THREE.Vector3(0.94, 0, 0.47),
    );
    const directDist = direct.distance();
    const sample = curve.getPoint(0.35);
    const closest = new THREE.Vector3();
    direct.closestPointToPoint(sample, true, closest);
    expect(closest.distanceTo(sample)).toBeGreaterThan(directDist * 0.04);
  });
});
