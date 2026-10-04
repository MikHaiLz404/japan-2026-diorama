import { describe, expect, it } from "vitest";
import type { Stop } from "../data/trip";
import { lngLatToTile, tilesForStops, tileUrl } from "./prefetch";

const stop = (lng: number, lat: number) => ({ lngLat: [lng, lat] }) as unknown as Stop;

describe("lngLatToTile", () => {
  it("matches the standard slippy-map tile for Senso-ji at z14", () => {
    expect(lngLatToTile([139.7966, 35.7148])).toEqual({ x: 14554, y: 6449, z: 14 });
  });
});

describe("tilesForStops", () => {
  it("returns nothing for an empty day", () => {
    expect(tilesForStops([])).toEqual([]);
  });
  it("covers the whole block between nearby stops", () => {
    const tiles = tilesForStops([stop(139.7966, 35.7148), stop(139.8107, 35.7101)]);
    expect(tiles.length).toBeGreaterThan(1);
    expect(new Set(tiles.map((t) => `${t.x}/${t.y}`)).size).toBe(tiles.length);
  });
  it("falls back to the stop tiles when the day is spread over a large area", () => {
    const tiles = tilesForStops([stop(139.7966, 35.7148), stop(139.5, 35.3), stop(139.9, 35.8)]);
    expect(tiles).toHaveLength(3);
  });
});

describe("tileUrl", () => {
  it("fills the template", () => {
    expect(tileUrl("https://x/{z}/{x}/{y}.pbf", { x: 1, y: 2, z: 3 })).toBe("https://x/3/1/2.pbf");
  });
});
