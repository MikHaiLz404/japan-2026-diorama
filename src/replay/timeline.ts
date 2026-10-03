// Trip replay timeline: dated stops + transport legs become one deterministic list of segments
// (stop · walk · move · jump). Everything on screen is a pure function of the playhead T (seconds),
// so play, pause and scrub share one code path.
import { along, distance, pathLength, slicePath } from "../lib/geo";
import type { Leg, Stop, Trip } from "../data/trip";
import type { LngLat } from "../data/types";

const STOP_SECONDS = 1.9;
const DAY_CARD_SECONDS = 1.2;
const JUMP_SECONDS = 2.4;
/** Past this distance a gap between events is a cut, not a walk. */
const MAX_WALK_M = 4000;
const MIN_WALK_M = 40;
const DEFAULT_VISIT_MIN = 30;
const MAX_VISIT_MIN = 180;
const ESTIMATE_KMH = 35;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const easeInOut = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);
const ms = (iso: string) => new Date(iso).getTime();

interface Base { day: string; t0: number; t1: number; dur: number; start: number }
export type Segment =
  | (Base & { kind: "stop"; pos: LngLat; stop: Stop })
  | (Base & { kind: "walk"; coords: LngLat[] })
  | (Base & { kind: "move"; coords: LngLat[]; leg: Leg; km: number })
  | (Base & { kind: "jump"; from: LngLat; to: LngLat; km: number; newDay: boolean });

export interface Timeline { segs: Segment[]; total: number }

export interface CameraTarget { center: LngLat; zoom: number; pitch: number }

export interface ReplayState {
  T: number;
  i: number;
  seg: Segment;
  /** Linear progress through the current segment. */
  u: number;
  /** Eased progress — used for motion along paths. */
  e: number;
  pos: LngLat;
  clock: Date;
  camera: CameraTarget;
}

type Event =
  | { kind: "stop"; at: number; day: string; stop: Stop }
  | { kind: "move"; at: number; day: string; leg: Leg };

type Pending = Segment extends infer S ? (S extends Segment ? Omit<S, "start"> : never) : never;

export function buildTimeline({ stops, legs }: Pick<Trip, "stops" | "legs">): Timeline {
  const events: Event[] = [
    ...stops.map((stop): Event => ({ kind: "stop", at: ms(stop.iso), day: stop.day, stop })),
    ...legs.map((leg): Event => ({ kind: "move", at: ms(leg.iso), day: leg.day, leg })),
  ].sort((a, b) => a.at - b.at || (a.kind === "move" ? -1 : 1));

  const pending: Pending[] = [];
  let cursor: LngLat | null = null;
  let clock: number | null = null;
  let day: string | null = null;

  // Keep the replay clock monotonic: Tripsy entries overlap (a café inside a temple visit, etc.).
  const push = (seg: Pending) => {
    if (clock != null) seg.t0 = Math.max(seg.t0, clock);
    seg.t1 = Math.max(seg.t1, seg.t0);
    clock = seg.t1;
    pending.push(seg);
  };

  for (const ev of events) {
    const start = ev.kind === "stop" ? ev.stop.lngLat : ev.leg.coords[0];
    const newDay = ev.day !== day;
    if (!cursor) {
      push({ kind: "jump", from: start, to: start, t0: ev.at, t1: ev.at, day: ev.day, newDay: true, dur: 0.01, km: 0 });
    } else {
      const gap = distance(cursor, start);
      if (newDay || gap > MAX_WALK_M) {
        push({ kind: "jump", from: cursor, to: start, t0: clock!, t1: ev.at, day: ev.day, newDay,
          dur: JUMP_SECONDS + (newDay ? DAY_CARD_SECONDS : 0), km: gap / 1000 });
      } else if (gap > MIN_WALK_M) {
        push({ kind: "walk", coords: [cursor, start], t0: clock!, t1: ev.at, day: ev.day,
          dur: clamp(0.8 + Math.sqrt(gap / 1000) * 1.3, 0.8, 3) });
      }
    }
    if (ev.kind === "stop") {
      const isStay = ev.stop.cat === "stay";
      const end = ev.stop.end && !isStay
        ? Math.min(ms(ev.stop.end), ev.at + MAX_VISIT_MIN * 60e3)
        : ev.at + DEFAULT_VISIT_MIN * 60e3;
      push({ kind: "stop", pos: ev.stop.lngLat, stop: ev.stop, t0: ev.at, t1: end, day: ev.day, dur: STOP_SECONDS });
      cursor = ev.stop.lngLat;
    } else {
      const km = pathLength(ev.leg.coords) / 1000;
      const end = ev.leg.arrive ? ms(ev.leg.arrive) : ev.at + (km / ESTIMATE_KMH) * 3600e3;
      push({ kind: "move", coords: ev.leg.coords, leg: ev.leg, t0: ev.at, t1: end, day: ev.day, km,
        dur: clamp(1.6 + Math.sqrt(km) * 1.1, 1.6, 7) });
      cursor = ev.leg.coords[ev.leg.coords.length - 1];
    }
    day = ev.day;
  }

  let acc = 0;
  const segs = pending.map((s) => {
    const seg = { ...s, start: acc } as Segment;
    acc += s.dur;
    return seg;
  });
  return { segs, total: acc };
}

function cameraFor(seg: Segment, u: number, pos: LngLat): CameraTarget {
  switch (seg.kind) {
    case "stop": return { center: pos, zoom: 16.4, pitch: 62 };
    case "walk": return { center: pos, zoom: 16.1, pitch: 60 };
    case "move": return { center: pos, zoom: clamp(15.4 - Math.log2(Math.max(seg.km, 0.2) / 1.5), 10.6, 15.6), pitch: 56 };
    case "jump": {
      // Pull out and back in, deeper for longer hops.
      const dip = clamp(Math.log2(Math.max(seg.km, 0.5)) + 1.2, 1, 4.8);
      return { center: pos, zoom: 16 - dip * Math.sin(Math.PI * u), pitch: 60 - 25 * Math.sin(Math.PI * u) };
    }
  }
}

export function stateAt(timeline: Timeline, time: number): ReplayState {
  const { segs, total } = timeline;
  const T = clamp(time, 0, total);
  let i = segs.findIndex((s) => T < s.start + s.dur);
  if (i < 0) i = segs.length - 1;
  const seg = segs[i];
  const u = clamp((T - seg.start) / seg.dur, 0, 1);
  const e = easeInOut(u);
  let pos: LngLat;
  if (seg.kind === "stop") pos = seg.pos;
  else if (seg.kind === "jump") pos = [seg.from[0] + (seg.to[0] - seg.from[0]) * e, seg.from[1] + (seg.to[1] - seg.from[1]) * e];
  else pos = along(seg.coords, e);
  // A stop's clock only runs halfway through its visit so the next leg still starts on time.
  const clock = new Date(seg.t0 + (seg.t1 - seg.t0) * (seg.kind === "stop" ? u * 0.5 : e));
  return { T, i, seg, u, e, pos, clock, camera: cameraFor(seg, u, pos) };
}

/** Trail drawn so far: completed walk/move segments plus the partial current one. */
export function trailAt(timeline: Timeline, state: ReplayState): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
  for (let k = 0; k <= state.i; k++) {
    const s = timeline.segs[k];
    if (s.kind !== "walk" && s.kind !== "move") continue;
    const coords = k < state.i ? s.coords : slicePath(s.coords, state.e);
    if (coords.length > 1) {
      features.push({
        type: "Feature",
        properties: { kind: s.kind, today: s.day === state.seg.day },
        geometry: { type: "LineString", coordinates: coords },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

/** Start of the first non-jump segment of a day (or its jump when the day has nothing else). */
export function dayStart(timeline: Timeline, day: string): number | null {
  const seg = timeline.segs.find((s) => s.day === day && s.kind !== "jump") ?? timeline.segs.find((s) => s.day === day);
  return seg ? seg.start : null;
}

/** Start of the next/previous stop segment relative to segment index `from`. */
export function stopStart(timeline: Timeline, from: number, direction: 1 | -1): number | null {
  const { segs } = timeline;
  const idx = direction > 0
    ? segs.findIndex((s, k) => k > from && s.kind === "stop")
    : segs.findLastIndex((s, k) => k < from && s.kind === "stop");
  return idx >= 0 ? segs[idx].start : null;
}
