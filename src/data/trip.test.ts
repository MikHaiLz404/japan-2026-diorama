import { describe, expect, test } from "vitest";
import { buildTrip, categoryOf, dayOf, mapLabel } from "./trip";
import type { TripFixture } from "./types";

const base: TripFixture = {
  source: "tripsy", trip_id: "1", name: "Test", starts_at: "2026-09-17", ends_at: "2026-09-27",
  timezone: "Asia/Tokyo", fetched_at: "2026-10-03T00:00:00Z", activities: [], lodging: [], transportations: [],
};
const activity = (id: string, starts_at: string | null, extra = {}) => ({
  id, name: `A${id}`, type: "restaurant", starts_at, ends_at: null, latitude: 35.7, longitude: 139.8, timezone: "Asia/Tokyo", ...extra,
});

describe("dayOf", () => {
  test("uses the Tokyo calendar day, not UTC", () => {
    expect(dayOf("2026-09-17T21:30:00Z")).toBe("2026-09-18");
  });
});

describe("mapLabel", () => {
  test("drops Thai text tile glyphs can't render", () => {
    expect(mapLabel("ฝากกระเป๋าที่โรงแรม + แวะ Sensō-ji (รอบ 2)")).toBe("Sensō-ji");
  });

  test("prefers a Latin alias for CJK-only names", () => {
    expect(mapLabel("GU 銀座店 (GU Ginza)")).toBe("GU Ginza");
    expect(mapLabel("鳥貴族 浅草六区店 (Torikizoku Yakitori)")).toBe("Torikizoku Yakitori");
  });

  test("cuts at the em dash and truncates long names", () => {
    expect(mapLabel("Bounce Luggage Storage — ฝากกระเป๋า")).toBe("Bounce Luggage Storage");
    expect(mapLabel("x".repeat(50))).toHaveLength(30);
  });
});

describe("categoryOf", () => {
  test("maps Tripsy slugs and falls back to misc", () => {
    expect(categoryOf("bakery")).toBe("food");
    expect(categoryOf("amusementPark")).toBe("sight");
    expect(categoryOf("somethingNew")).toBe("misc");
  });
});

describe("buildTrip", () => {
  test("keeps only dated stops with coordinates, sorted by time", () => {
    const trip = buildTrip({
      ...base,
      activities: [
        activity("1", "2026-09-19T01:00:00Z"),
        activity("2", null),
        activity("3", "2026-09-18T01:00:00Z"),
        activity("4", "2026-09-18T02:00:00Z", { latitude: null }),
      ],
    }, []);
    expect(trip.stops.map((s) => s.id)).toEqual(["3", "1"]);
    expect(trip.days).toEqual(["2026-09-18", "2026-09-19"]);
  });

  test("uses routed geometry when present, otherwise an arc; skips walks and flights", () => {
    const leg = (id: string, type: string) => ({
      id, type, departure_at: "2026-09-18T02:45:00Z", arrival_at: "2026-09-18T03:00:00Z",
      departure: { name: "A", latitude: 35.7148, longitude: 139.7967 },
      arrival: { name: "B", latitude: 35.7101, longitude: 139.8107 },
    });
    const trip = buildTrip(
      { ...base, transportations: [leg("bus", "bus"), leg("train", "train"), leg("w", "walk"), leg("f", "airplane")] },
      [{ id: "bus", mode: "road", coords: [[139.7967, 35.7148], [139.80, 35.712], [139.8107, 35.7101]] }],
    );
    expect(trip.legs.map((l) => [l.id, l.snapped])).toEqual([["bus", true], ["train", false]]);
    expect(trip.legs[1].coords.length).toBeGreaterThan(2);
  });

  test("estimates a missing departure from the arrival time", () => {
    const trip = buildTrip({
      ...base,
      transportations: [{
        id: "t", type: "train", departure_at: null, arrival_at: "2026-09-26T03:30:00Z",
        departure: { name: "Kuramae", latitude: 35.7044, longitude: 139.792 },
        arrival: { name: "Minato Mirai", latitude: 35.4573, longitude: 139.6323 },
      }],
    }, []);
    expect(new Date(trip.legs[0].iso).getTime()).toBeLessThan(new Date("2026-09-26T03:30:00Z").getTime());
  });
});
