import { describe, expect, it } from "vitest";
import { buildGroundPathSegments, buildRoutePaths, CITY_CATALOG } from "./cities";
import { trip } from "./loadTrip";

describe("ground path segments", () => {
  it("skips walks and flights but keeps inter-city rail/bus links", () => {
    const segments = buildGroundPathSegments(trip, "2026-09-20");
    expect(segments.length).toBeGreaterThan(3);
    expect(segments.every((segment) => segment.type !== "walk")).toBe(true);
    expect(segments.every((segment) => segment.type !== "airplane")).toBe(true);
    expect(segments.every((segment) => segment.fromCityId !== "bangkok")).toBe(true);
  });

  it("dedupes bidirectional city pairs", () => {
    const segments = buildGroundPathSegments(trip, "2026-09-20");
    const keys = segments.map((segment) =>
      [segment.fromCityId, segment.toCityId].sort().join("<->"),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("geo tray layout", () => {
  it("derives tray positions from lat/lng for every catalog city", () => {
    for (const city of CITY_CATALOG) {
      expect(city.tray[0]).not.toBe(0);
      expect(Math.abs(city.tray[0])).toBeLessThan(5);
      expect(Math.abs(city.tray[1])).toBeLessThan(4);
    }
  });

  it("builds ribbon routes separately from ground segments", () => {
    const routes = buildRoutePaths(trip, "2026-09-20");
    const ground = buildGroundPathSegments(trip, "2026-09-20");
    expect(routes.some((route) => route.type === "airplane")).toBe(true);
    expect(ground.every((segment) => segment.type !== "airplane")).toBe(true);
  });
});
