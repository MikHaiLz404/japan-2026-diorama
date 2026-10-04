// Real-sun lighting: one clock drives the basemap palette, sky, extrusion light, and 3D models. The UI theme is not touched: it follows the system.
//
// Replay compresses hours into a second (a walk from 16:30 to 19:00, a whole night), so painting the clock
// directly strobes day → night → day. The clock only sets a *target*; the light eases toward it.
import type { Map as MapLibreMap } from "maplibre-gl";
import { phaseWeights, sunPosition, sunVector, type PhaseWeights, type SunPosition } from "./sun";
import { blendPalette, paintFor, skyFor, type BuildingHighlights } from "./style";
import type { LandmarkLayer } from "./landmarkLayer";
import { prefersReducedMotion } from "../lib/motion";

const DEG = 180 / Math.PI;
/** Time constant of the light easing; ~95 % settled after 3τ. */
const EASE_SECONDS = 0.9;
const SETTLED = 0.004;
/** Weight steps below this are not worth a style update. */
const PAINT_STEPS = 60;
const CLOCK_TWEEN_MS = 1400;

export interface Lighting {
  apply(date: Date, force?: boolean): void;
  goTo(date: Date, options?: { animate?: boolean }): void;
  readonly clock: Date;
  stop(): void;
  /** Call once on style.load — style setters throw before that. */
  ready(): void;
}

export function createLighting(
  map: MapLibreMap,
  { highlight, landmarks, onChange, initial }: {
    highlight: BuildingHighlights;
    landmarks: LandmarkLayer;
    onChange?: (date: Date, weights: PhaseWeights) => void;
    initial: Date;
  },
): Lighting {
  let clock = initial;
  let target: PhaseWeights | null = null;
  let shown: PhaseWeights | null = null;
  let sun: SunPosition | null = null;
  let applied = "";
  let tween = 0;
  let settleRaf = 0;
  let last = 0;
  let isReady = false;

  function paint(weights: PhaseWeights) {
    landmarks.setLighting({ sunDir: sunVector(sun!), weights });
    if (!isReady) return;
    const signature = [weights.night, weights.dusk, weights.day].map((w) => Math.round(w * PAINT_STEPS)).join();
    if (signature === applied) return;
    applied = signature;
    const palette = blendPalette(weights);
    for (const [layerId, props] of Object.entries(paintFor(palette, highlight))) {
      if (!map.getLayer(layerId)) continue;
      for (const [prop, value] of Object.entries(props)) map.setPaintProperty(layerId, prop, value);
    }
    map.setSky(skyFor(palette));
    const azimuthFromNorth = (sun!.azimuth * DEG + 180 + 360) % 360;
    const polar = Math.min(80, Math.max(25, 90 - sun!.altitude * DEG));
    // MapLibre: higher light intensity = stronger shading contrast, so daylight stays low for bright walls.
    map.setLight({
      anchor: "map",
      position: [1.3, weights.night > 0.6 ? 210 : azimuthFromNorth, polar],
      color: weights.dusk > 0.5 ? "#ffd2b8" : weights.night > 0.6 ? "#d4dcff" : "#ffffff",
      intensity: 0.38 * weights.night + 0.3 * weights.dusk + 0.16 * weights.day,
    });
  }

  function settle(now: number) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const k = 1 - Math.exp(-dt / EASE_SECONDS);
    let diff = 0;
    for (const key of ["night", "dusk", "day"] as const) {
      shown![key] += (target![key] - shown![key]) * k;
      diff = Math.max(diff, Math.abs(target![key] - shown![key]));
    }
    if (diff < SETTLED) shown = { ...target! };
    paint(shown!);
    settleRaf = diff < SETTLED ? 0 : requestAnimationFrame(settle);
  }

  function apply(date: Date, force = false) {
    clock = date;
    const center = map.getCenter();
    sun = sunPosition(date, center.lat, center.lng);
    target = phaseWeights(sun.altitude);
    onChange?.(date, target);
    if (force || !shown || prefersReducedMotion()) {
      cancelAnimationFrame(settleRaf);
      settleRaf = 0;
      shown = { ...target };
      if (force) applied = "";
      paint(shown);
      return;
    }
    if (!settleRaf) {
      last = performance.now();
      settleRaf = requestAnimationFrame(settle);
    }
  }

  function goTo(to: Date, { animate = true } = {}) {
    cancelAnimationFrame(tween);
    const from = clock.getTime();
    const end = to.getTime();
    if (!animate || prefersReducedMotion() || from === end) {
      apply(to);
      return;
    }
    const t0 = performance.now();
    const step = (now: number) => {
      const u = Math.min(1, Math.max(0, (now - t0) / CLOCK_TWEEN_MS));
      const e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
      apply(new Date(from + (end - from) * e));
      if (u < 1) tween = requestAnimationFrame(step);
    };
    tween = requestAnimationFrame(step);
  }

  return {
    apply,
    goTo,
    get clock() { return clock; },
    stop() { cancelAnimationFrame(tween); },
    ready() {
      isReady = true;
      apply(clock, true);
    },
  };
}
