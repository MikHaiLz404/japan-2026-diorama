import { describe, expect, it } from "vitest";
import { buildGroundPathSegments } from "../data/cities";
import { trip } from "../data/loadTrip";
import { ROUTE_WAYPOINTS, junctionTray, waypointsForPair } from "./railWaypoints";

describe("rail waypoints", () => {
  it("defines spline knots for every inter-city rail pair in the fixture", () => {
    const segments = buildGroundPathSegments(trip, "2026-09-20");
    for (const segment of segments) {
      const pairKey = [segment.fromCityId, segment.toCityId].sort().join("<->");
      expect(ROUTE_WAYPOINTS[pairKey]?.waypoints.length, `missing waypoints for ${pairKey}`).toBeGreaterThan(0);
    }
  });

  it("routes Kamakura–Enoshima via Hase and Shichirigahama", () => {
    expect(waypointsForPair("kamakura", "enoshima")).toEqual(["hase", "shichirigahama"]);
    expect(waypointsForPair("enoshima", "kamakura")).toEqual(["shichirigahama", "hase"]);
  });

  it("routes Enoshima–Tokyo via Fujisawa, not a direct chord", () => {
    const wps = waypointsForPair("enoshima", "tokyo");
    expect(wps).toContain("fujisawa");
    expect(wps).toContain("shinagawa");
    expect(wps[0]).toBe("shichirigahama");
  });

  it("uses Tokyo hub junction knots for spokes", () => {
    expect(waypointsForPair("tokyo", "yokohama")).toEqual(["shinagawa"]);
    expect(waypointsForPair("tokyo", "chiba")).toEqual(["makuhari"]);
    expect(waypointsForPair("tokyo", "takao")).toEqual(["shinjuku"]);
    expect(waypointsForPair("tokyo", "kawagoe")).toEqual(["ikebukuro"]);
    expect(waypointsForPair("tokyo", "kamakura")).toEqual(["shinagawa", "ofuna"]);
  });

  it("projects junctions onto the tray", () => {
    const shinagawa = junctionTray("shinagawa");
    expect(Math.abs(shinagawa[0])).toBeLessThan(5);
    expect(Math.abs(shinagawa[1])).toBeLessThan(4);
  });
});
