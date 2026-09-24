import { describe, expect, it } from "vitest";
import { buildGroundPathSegments, buildRoutePaths, CITY_CATALOG } from "./cities";
import { trip } from "./loadTrip";

describe("rail path segments", () => {
  it("skips walks, flights, and buses but keeps inter-city rail links", () => {
    const segments = buildGroundPathSegments(trip, "2026-09-20");
    expect(segments.length).toBeGreaterThan(3);
    expect(segments.every((segment) => segment.type !== "walk")).toBe(true);
    expect(segments.every((segment) => segment.type !== "airplane")).toBe(true);
    expect(segments.every((segment) => segment.type !== "bus")).toBe(true);
    expect(segments.every((segment) => segment.fromCityId !== "bangkok")).toBe(true);
  });

  it("dedupes bidirectional city pairs", () => {
    const segments = buildGroundPathSegments(trip, "2026-09-20");
    const keys = segments.map((segment) =>
      [segment.fromCityId, segment.toCityId].sort().join("<->"),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("includes Enoshima–Tokyo for hub-routed spline rendering", () => {
    const segments = buildGroundPathSegments(trip, "2026-09-20");
    const pairs = segments.map((segment) =>
      [segment.fromCityId, segment.toCityId].sort().join("<->"),
    );
    expect(pairs).toContain("enoshima<->tokyo");
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

describe("dropped stops", () => {
  it("keeps a city with only undated activities off the tray, along with its routes", async () => {
    const { prepareTrip } = await import("./loadTrip");
    const prepared = prepareTrip(new Date("2026-09-24T03:00:00Z"));
    expect(prepared.cities.map((city) => city.id)).not.toContain("takao");
    const touchesTakao = (leg: { fromCityId: string; toCityId: string }) =>
      leg.fromCityId === "takao" || leg.toCityId === "takao";
    expect(prepared.routes.some(touchesTakao)).toBe(false);
    expect(prepared.groundPaths.some(touchesTakao)).toBe(false);
  });
});

describe("route dates", () => {
  it("tags each arc with its day so the tray can show one day's journey", () => {
    const routes = buildRoutePaths(trip, "2026-09-24");
    const day = routes.filter((route) => route.date === "2026-09-24");
    expect(day.some((route) => [route.fromCityId, route.toCityId].includes("kamakura"))).toBe(true);
    const flight = routes.find((route) => route.type === "airplane");
    expect(flight?.date).toBe("2026-09-17");
  });
});
