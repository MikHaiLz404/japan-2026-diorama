import { describe, expect, it } from "vitest";
import { buildCityBlocks, buildGroundPathSegments, buildRoutePaths, CITY_CATALOG, ORIGIN_TOKEN } from "./cities";
import { trip } from "./loadTrip";

describe("rail path segments", () => {
  it("skips walks, flights, and buses but keeps inter-city rail links", () => {
    const segments = buildGroundPathSegments(trip, "2026-09-20");
    expect(segments.length).toBeGreaterThanOrEqual(3);
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
  it("places every catalog city inside the tray", () => {
    for (const city of CITY_CATALOG) {
      expect(Number.isFinite(city.tray[0]) && Number.isFinite(city.tray[1])).toBe(true);
      expect(Math.abs(city.tray[0])).toBeLessThan(5);
      expect(Math.abs(city.tray[1])).toBeLessThan(4);
    }
  });

  it("is a north-up map with Tokyo at the centre of the screen", () => {
    const at = (id: string) => CITY_CATALOG.find((city) => city.id === id)!.tray;
    const tokyo = at("tokyo");
    expect(tokyo[0]).toBeCloseTo(0, 5);
    // -z is the top of the screen: north of Tokyo is up, south is down.
    expect(at("kawagoe")[1]).toBeLessThan(tokyo[1]);
    for (const south of ["yokohama", "haneda", "kamakura", "enoshima"]) {
      expect(at(south)[1], south).toBeGreaterThan(tokyo[1]);
    }
    // East is right, west is left.
    expect(at("narita")[0]).toBeGreaterThan(tokyo[0]);
    expect(at("yokohama")[0]).toBeLessThan(tokyo[0]);
    expect(at("enoshima")[0]).toBeLessThan(at("kamakura")[0]);
    expect(at("haneda")[0]).toBeGreaterThan(at("yokohama")[0]);
    // Bangkok is far to the south-west: bottom-left corner.
    expect(ORIGIN_TOKEN.tray[0]).toBeLessThan(-4);
    expect(ORIGIN_TOKEN.tray[1]).toBeGreaterThan(2);
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

describe("airports", () => {
  it("puts Haneda on the tray for the arrival flight and Narita for the flight home", () => {
    const cities = buildCityBlocks(trip, "2026-09-28");
    const haneda = cities.find((city) => city.id === "haneda");
    const narita = cities.find((city) => city.id === "narita");
    expect(haneda?.dates).toEqual(["2026-09-18"]);
    expect(haneda?.activities[0]?.name).toContain("NH850");
    expect(narita?.dates).toContain("2026-09-27");
  });

  it("routes the arrival flight Bangkok → Haneda and the return Narita → Bangkok", () => {
    const flights = buildRoutePaths(trip, "2026-09-24").filter((route) => route.type === "airplane");
    expect(flights.map((f) => [f.fromCityId, f.toCityId])).toEqual([
      ["bangkok", "haneda"],
      ["narita", "bangkok"],
    ]);
  });
});

describe("flight home", () => {
  it("lands the return flight on the Bangkok token, not a Japanese city", () => {
    const flights = buildRoutePaths(trip, "2026-09-24").filter((route) => route.type === "airplane");
    const home = flights.find((route) => route.date === "2026-09-27");
    expect(home?.toCityId).toBe("bangkok");
    expect(home?.fromCityId).toBe("narita");
  });
});
