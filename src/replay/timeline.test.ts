import { describe, expect, test } from "vitest";
import { buildTimeline, dayStart, stateAt, stopStart, trailAt } from "./timeline";
import { buildTrip, type Stop } from "../data/trip";
import fixture from "../data/japan-2026.json";
import routes from "../data/routes.json";
import type { RouteGeometry, TripFixture } from "../data/types";

const stop = (id: string, iso: string, lngLat: [number, number], extra: Partial<Stop> = {}): Stop => ({
  id, name: id, label: id, type: "restaurant", cat: "food", day: iso.slice(0, 10), time: "", iso, end: null, lngLat, ...extra,
});

describe("buildTimeline", () => {
  const a = stop("a", "2026-09-18T01:00:00Z", [139.7966, 35.7115]);
  const b = stop("b", "2026-09-18T02:00:00Z", [139.7975, 35.7107]);       // ~120 m away → walk
  const c = stop("c", "2026-09-19T01:00:00Z", [139.7728, 35.6862]);       // next day → jump

  test("connects close stops with a walk and a new day with a jump", () => {
    const { segs } = buildTimeline({ stops: [a, b, c], legs: [] });
    expect(segs.map((s) => s.kind)).toEqual(["jump", "stop", "walk", "stop", "jump", "stop"]);
    const dayJump = segs[4];
    expect(dayJump.kind === "jump" && dayJump.newDay).toBe(true);
  });

  test("segment starts are cumulative and the clock never runs backwards", () => {
    const overlapping = stop("d", "2026-09-18T01:10:00Z", [139.797, 35.711]);
    const { segs, total } = buildTimeline({ stops: [a, overlapping, b], legs: [] });
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].start).toBeCloseTo(segs[i - 1].start + segs[i - 1].dur, 9);
      expect(segs[i].t0).toBeGreaterThanOrEqual(segs[i - 1].t1);
    }
    expect(total).toBeCloseTo(segs.at(-1)!.start + segs.at(-1)!.dur, 9);
  });

  test("the real trip replays without the clock going backwards", () => {
    const trip = buildTrip(fixture as TripFixture, routes as RouteGeometry[]);
    const { segs } = buildTimeline(trip);
    expect(segs.length).toBeGreaterThan(trip.stops.length);
    for (let i = 1; i < segs.length; i++) expect(segs[i].t0).toBeGreaterThanOrEqual(segs[i - 1].t1);
  });
});

describe("stateAt / trailAt", () => {
  const a = stop("a", "2026-09-18T01:00:00Z", [139.7966, 35.7115]);
  const b = stop("b", "2026-09-18T02:00:00Z", [139.7975, 35.7107]);
  const timeline = buildTimeline({ stops: [a, b], legs: [] });

  test("clamps the playhead to the timeline", () => {
    expect(stateAt(timeline, -5).T).toBe(0);
    expect(stateAt(timeline, 1e9).T).toBe(timeline.total);
  });

  test("halfway through the walk the traveller is between the two stops", () => {
    const walk = timeline.segs.find((s) => s.kind === "walk")!;
    const state = stateAt(timeline, walk.start + walk.dur / 2);
    expect(state.pos[0]).toBeGreaterThan(a.lngLat[0]);
    expect(state.pos[0]).toBeLessThan(b.lngLat[0]);
    expect(trailAt(timeline, state).features).toHaveLength(1);
  });

  test("dayStart and stopStart find segment boundaries", () => {
    expect(dayStart(timeline, "2026-09-18")).toBe(timeline.segs[1].start);
    expect(dayStart(timeline, "2030-01-01")).toBeNull();
    expect(stopStart(timeline, 0, 1)).toBe(timeline.segs[1].start);
    expect(stopStart(timeline, 1, -1)).toBeNull();
  });
});
