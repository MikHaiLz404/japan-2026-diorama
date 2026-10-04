import { describe, expect, test } from "vitest";
import { paddedBounds, tripExtent } from "./frame";
import type { Stop } from "../data/trip";
import type { LngLat } from "../data/types";

const stop = (lngLat: LngLat) => ({ lngLat }) as Stop;

describe("tripExtent", () => {
  test("covers stops and leg geometry", () => {
    const box = tripExtent({
      stops: [stop([100.9, 13.3]), stop([101.0, 13.4])],
      legs: [{ coords: [[100.5, 13.7], [100.7, 13.6]] } as never],
    });
    expect(box).toEqual({ west: 100.5, south: 13.3, east: 101.0, north: 13.7 });
  });

  test("throws when there is nothing to frame", () => {
    expect(() => tripExtent({ stops: [], legs: [] })).toThrow();
  });
});

describe("paddedBounds", () => {
  test("grows by a fraction of the span", () => {
    const [[w, s], [e, n]] = paddedBounds({ west: 100, south: 13, east: 101, north: 14 });
    expect(w).toBeCloseTo(99);
    expect(e).toBeCloseTo(102);
    expect(s).toBeCloseTo(12);
    expect(n).toBeCloseTo(15);
  });

  test("a single-spot trip still gets a minimum margin", () => {
    const [[w], [e]] = paddedBounds({ west: 100.52, south: 13.74, east: 100.52, north: 13.74 });
    expect(e - w).toBeCloseTo(0.3);
  });
});
