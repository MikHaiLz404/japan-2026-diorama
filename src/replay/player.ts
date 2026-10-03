// Drives the map camera and trail from a Timeline. play / pause / seek all render through stateAt(T).
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { dayStart, stateAt, stopStart, trailAt, type ReplayState, type Timeline } from "./timeline";

const MAX_FRAME_SECONDS = 0.05;
const CAMERA_FOLLOW = 3.2;
const CAMERA_FOLLOW_JUMP = 6;
const ORBIT_DEG_PER_SECOND = 5;

export interface Player {
  readonly playing: boolean;
  readonly T: number;
  readonly total: number;
  play(): void;
  pause(): void;
  stop(): void;
  seek(t: number): void;
  step(direction: 1 | -1): void;
  seekDay(day: string): void;
  setSpeed(speed: number): void;
}

export function createPlayer(
  map: MapLibreMap,
  timeline: Timeline,
  onState: (state: ReplayState, info: { playing: boolean; speed: number }) => void,
): Player {
  let T = 0;
  let playing = false;
  let speed = 1;
  let last = 0;
  let raf = 0;
  let frame = 0;
  let cam: { center: [number, number]; zoom: number; pitch: number; bearing: number } | null = null;

  function apply(state: ReplayState, smooth: boolean, dt: number) {
    const target = state.camera;
    if (!smooth || !cam) {
      cam = { center: [...target.center], zoom: target.zoom, pitch: target.pitch, bearing: map.getBearing() };
    } else {
      const k = 1 - Math.exp(-dt * (state.seg.kind === "jump" ? CAMERA_FOLLOW_JUMP : CAMERA_FOLLOW));
      cam.center = [cam.center[0] + (target.center[0] - cam.center[0]) * k, cam.center[1] + (target.center[1] - cam.center[1]) * k];
      cam.zoom += (target.zoom - cam.zoom) * k;
      cam.pitch += (target.pitch - cam.pitch) * k;
      cam.bearing += dt * ORBIT_DEG_PER_SECOND;
    }
    map.jumpTo(cam);
    // The trail only needs ~30 fps.
    if (!smooth || frame++ % 2 === 0) (map.getSource("trail") as GeoJSONSource | undefined)?.setData(trailAt(timeline, state));
    onState(state, { playing, speed });
  }

  function tick(now: number) {
    const dt = Math.min(MAX_FRAME_SECONDS, (now - last) / 1000);
    last = now;
    T = Math.min(timeline.total, T + dt * speed);
    apply(stateAt(timeline, T), true, dt);
    if (T >= timeline.total) {
      playing = false;
      onState(stateAt(timeline, T), { playing, speed });
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  const seek = (t: number) => {
    T = Math.min(timeline.total, Math.max(0, t));
    apply(stateAt(timeline, T), false, 0);
  };

  return {
    get playing() { return playing; },
    get T() { return T; },
    get total() { return timeline.total; },
    play() {
      if (playing) return;
      if (T >= timeline.total) T = 0;
      playing = true;
      last = performance.now();
      cam = null;
      raf = requestAnimationFrame(tick);
    },
    pause() {
      playing = false;
      cancelAnimationFrame(raf);
      onState(stateAt(timeline, T), { playing, speed });
    },
    stop() {
      playing = false;
      cancelAnimationFrame(raf);
    },
    seek,
    step(direction) {
      const next = stopStart(timeline, stateAt(timeline, T).i, direction);
      if (next != null) seek(next + 0.001);
    },
    seekDay(day) {
      const start = dayStart(timeline, day);
      if (start != null) seek(start);
    },
    setSpeed(v) {
      speed = v;
      onState(stateAt(timeline, T), { playing, speed });
    },
  };
}
