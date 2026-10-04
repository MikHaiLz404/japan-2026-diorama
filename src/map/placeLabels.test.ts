import { describe, expect, test } from "vitest";
import { placePoints, reachedFilter } from "./placeLabels";
import type { Stop } from "../data/trip";
import type { LngLat } from "../data/types";

const stop = (lngLat: LngLat, iso: string) => ({ lngLat, iso }) as Stop;
const TOKYO = { name: "Tokyo", box: { west: 139.6, south: 35.6, east: 139.95, north: 35.85 } };
const NARITA = { name: "Narita", box: { west: 140.25, south: 35.74, east: 140.42, north: 35.8 } };
const KYOTO = { name: "Kyoto", box: { west: 135.6, south: 34.9, east: 135.85, north: 35.1 } };

describe("placePoints", () => {
  test("puts each place at its box centre with its first visit time", () => {
    const stops = [
      stop([139.7, 35.7], "2026-09-19T10:00:00+09:00"),
      stop([139.8, 35.7], "2026-09-18T09:00:00+09:00"),
      stop([140.3, 35.77], "2026-09-27T08:00:00+09:00"),
    ];
    const [tokyo, narita] = placePoints([TOKYO, NARITA], stops);
    expect(tokyo.name).toBe("Tokyo");
    expect(tokyo.at[0]).toBeCloseTo(139.775);
    expect(tokyo.at[1]).toBeCloseTo(35.725);
    expect(tokyo.first).toBe(Date.parse("2026-09-18T09:00:00+09:00"));
    expect(narita.at[0]).toBeCloseTo(140.335);
    expect(narita.at[1]).toBeCloseTo(35.77);
    expect(narita.first).toBe(Date.parse("2026-09-27T08:00:00+09:00"));
  });

  test("skips places the trip never reached", () => {
    expect(placePoints([TOKYO, KYOTO], [stop([139.7, 35.7], "2026-09-18T09:00:00+09:00")]).map((p) => p.name)).toEqual(["Tokyo"]);
  });

  test("returns nothing when the trip has no places", () => {
    expect(placePoints(undefined, [stop([139.7, 35.7], "2026-09-18T09:00:00+09:00")])).toEqual([]);
  });
});

describe("reachedFilter", () => {
  test("compares each place's first visit with the clock", () => {
    const now = new Date("2026-09-20T00:00:00+09:00");
    expect(reachedFilter(now)).toEqual(["<=", ["get", "first"], now.getTime()]);
  });
});
