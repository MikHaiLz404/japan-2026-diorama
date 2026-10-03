import { describe, expect, it } from "vitest";
import * as THREE from "three";
import type { RoutePath } from "../data/types";
import { ROUTE_LOOK, makeRoute, setRouteEmphasis, updateRoute } from "./paths";

const route: RoutePath = {
  id: "r1",
  type: "train",
  fromCityId: "tokyo",
  toCityId: "yokohama",
  status: "visited",
  label: "train",
  date: "2026-09-20",
};

function build(): THREE.Mesh {
  return makeRoute(route, { index: 0, parallelCount: 1, parallelIndex: 0 });
}

function uniform(mesh: THREE.Mesh, name: string): number {
  return (mesh.material as THREE.ShaderMaterial).uniforms[name].value as number;
}

describe("route lines", () => {
  it("draw thin: radius stays under a hair of the old 0.036 ribbon", () => {
    expect(ROUTE_LOOK.groundRadius).toBeLessThan(0.02);
    expect(ROUTE_LOOK.flightRadius).toBeLessThan(0.015);
    expect(ROUTE_LOOK.faintAlpha).toBeLessThan(0.5);
  });

  it("starts faint and fully drawn", () => {
    const mesh = build();
    updateRoute(mesh, 0.016, 1, false);
    expect(uniform(mesh, "uEmphasis")).toBe(0);
    expect(uniform(mesh, "uGrow")).toBe(1);
  });

  it("grows from nothing when a day is picked, then holds full length", () => {
    const mesh = build();
    setRouteEmphasis(mesh, true, true);
    updateRoute(mesh, 0.016, 1, false);
    const early = uniform(mesh, "uGrow");
    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(0.2);

    updateRoute(mesh, ROUTE_LOOK.growSeconds / 2, 1.5, false);
    expect(uniform(mesh, "uGrow")).toBeGreaterThan(early);
    updateRoute(mesh, ROUTE_LOOK.growSeconds, 3, false);
    expect(uniform(mesh, "uGrow")).toBe(1);
    expect(uniform(mesh, "uEmphasis")).toBe(1);
  });

  it("replays the draw-in when the pick changes and drops back to faint on deselect", () => {
    const mesh = build();
    setRouteEmphasis(mesh, true, true);
    updateRoute(mesh, 5, 5, false);
    setRouteEmphasis(mesh, true, false);
    expect((mesh.userData.anim as { grow: number }).grow).toBe(1);
    setRouteEmphasis(mesh, true, true);
    expect((mesh.userData.anim as { grow: number }).grow).toBe(0);

    setRouteEmphasis(mesh, false, false);
    updateRoute(mesh, 5, 10, false);
    expect(uniform(mesh, "uEmphasis")).toBe(0);
    expect(uniform(mesh, "uGrow")).toBe(1);
  });

  it("keeps the light still and snaps states under reduced motion", () => {
    const mesh = build();
    setRouteEmphasis(mesh, true, true);
    updateRoute(mesh, 0.016, 2, true);
    expect(uniform(mesh, "uGrow")).toBe(1);
    expect(uniform(mesh, "uEmphasis")).toBe(1);
    expect(uniform(mesh, "uPulseAmount")).toBe(0);
  });
});
