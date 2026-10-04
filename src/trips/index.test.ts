import { describe, expect, test } from "vitest";
import { TRIPS, findTrip, slugFromPath, tripsByDate } from "./index";
import { buildTrip } from "../data/trip";

describe("trip registry", () => {
  test("slugs are unique and URL-safe", () => {
    const slugs = TRIPS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  test("every trip's config loads and matches its summary", async () => {
    for (const summary of TRIPS) {
      const config = await summary.load();
      expect(config.slug).toBe(summary.slug);
      expect(config.fixture.activities.length).toBeGreaterThan(0);
      // Every listed trip must have at least one real (dated, timed) stop to show.
      expect(buildTrip(config.fixture, config.routes).stops.length).toBeGreaterThan(0);
      if (config.bounds) {
        const [[west, south], [east, north]] = config.bounds;
        expect(west).toBeLessThan(east);
        expect(south).toBeLessThan(north);
      }
    }
  });

  test("tripsByDate puts the newest trip first", () => {
    const dates = tripsByDate().map((t) => t.startsAt);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});

describe("routing helpers", () => {
  test("slugFromPath reads the first path segment", () => {
    expect(slugFromPath("/")).toBeNull();
    expect(slugFromPath("/japan-2026")).toBe("japan-2026");
    expect(slugFromPath("/japan-2026/")).toBe("japan-2026");
  });

  test("findTrip returns undefined for unknown slugs", () => {
    expect(findTrip("japan-2026")?.title).toBe("Japan 2026");
    expect(findTrip("nowhere")).toBeUndefined();
  });
});
