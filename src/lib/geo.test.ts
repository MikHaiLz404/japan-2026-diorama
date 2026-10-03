import { describe, expect, test } from "vitest";
import { along, arc, distance, pathLength, slicePath } from "./geo";
import type { LngLat } from "../data/types";

const asakusa: LngLat = [139.7966, 35.7115];
const skytree: LngLat = [139.8107, 35.7101];

describe("distance", () => {
  test("Asakusa Station to Tokyo Skytree is about 1.3 km", () => {
    expect(distance(asakusa, skytree)).toBeGreaterThan(1200);
    expect(distance(asakusa, skytree)).toBeLessThan(1350);
  });

  test("is zero for the same point", () => {
    expect(distance(asakusa, asakusa)).toBe(0);
  });
});

describe("along / slicePath", () => {
  const line: LngLat[] = [[0, 0], [0.001, 0], [0.002, 0]];

  test("halfway along a two-segment line lands on the middle vertex", () => {
    const [x, y] = along(line, 0.5);
    expect(x).toBeCloseTo(0.001, 6);
    expect(y).toBe(0);
  });

  test("clamps outside 0…1", () => {
    expect(along(line, -1)).toEqual(line[0]);
    expect(along(line, 2)).toEqual(line[2]);
  });

  test("slicePath keeps the length proportional to t", () => {
    const part = slicePath(line, 0.25);
    expect(pathLength(part) / pathLength(line)).toBeCloseTo(0.25, 5);
    expect(slicePath(line, 1)).toBe(line);
  });
});

describe("arc", () => {
  test("starts and ends at the endpoints", () => {
    const a = arc(asakusa, skytree);
    expect(a[0][0]).toBeCloseTo(asakusa[0], 9);
    expect(a.at(-1)![1]).toBeCloseTo(skytree[1], 9);
  });

  test("collapses to a straight pair for coincident points", () => {
    expect(arc(asakusa, asakusa)).toHaveLength(2);
  });
});
