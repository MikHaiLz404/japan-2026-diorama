// Shibuya scramble: the real OSM crosswalks drawn as zebra lines (draped on terrain), plus pedestrians who
// flood across on the scramble phase of a ~40 s signal cycle.
import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import crosswalks from "../data/scramble.json";
import { along, distance } from "../lib/geo";
import type { LngLat } from "../data/types";

const CENTER: LngLat = [139.70048, 35.65952];
const WALK_SECONDS = 14;
const CYCLE_SECONDS = 40;
/** People wait on the far kerb until this point of the cycle, then reset. */
const RESET_SECONDS = 27;
const PEOPLE = 220;
const STRIPE_WIDTH_M = 4.5;
const ACTIVE_ZOOM = 16;
const ACTIVE_RADIUS_M = 900;

/** line-width in px for a real-world width at this latitude, across zooms (512 px tiles). */
function metersToPx(meters: number, lat: number): ExpressionSpecification {
  const metersPerPx = (z: number) => (40075016 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** z);
  return ["interpolate", ["exponential", 2], ["zoom"], 15, meters / metersPerPx(15), 22, meters / metersPerPx(22)];
}

/** Deterministic pseudo-random so the crowd looks the same on every load. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function addScramble(map: MapLibreMap): () => void {
  const walks = (crosswalks as LngLat[][]).filter((w) => w.length > 1);
  map.addSource("zebra", {
    type: "geojson",
    data: { type: "FeatureCollection", features: walks.map((c) => ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: c } })) },
  });
  map.addLayer({
    id: "zebra", type: "line", source: "zebra", minzoom: 15,
    paint: { "line-color": "#f2f2ee", "line-opacity": 0.85, "line-width": metersToPx(STRIPE_WIDTH_M, CENTER[1]), "line-dasharray": [0.12, 0.12] },
  }, "buildings");

  const random = seeded(40);
  const people = Array.from({ length: PEOPLE }, (_, i) => {
    const path = walks[i % walks.length];
    return {
      path: random() < 0.5 ? [...path].reverse() : path,
      speed: 0.75 + random() * 0.45,
      delay: random() * 2.5,
      offset: (random() - 0.5) * 3.2e-5,
      hue: Math.floor(random() * 360),
    };
  });
  map.addSource("people", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer({
    id: "people", type: "circle", source: "people", minzoom: ACTIVE_ZOOM,
    paint: {
      "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 16, 0.9, 20, 6],
      "circle-color": ["get", "c"], "circle-stroke-color": "rgba(20,24,36,.7)", "circle-stroke-width": 0.6,
      "circle-pitch-alignment": "map",
    },
  });

  let raf = 0;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (map.getZoom() < ACTIVE_ZOOM || distance(map.getCenter().toArray() as LngLat, CENTER) > ACTIVE_RADIUS_M) return;
    const t = (performance.now() / 1000) % CYCLE_SECONDS;
    const features = people.map((p) => {
      const u = t < WALK_SECONDS
        ? Math.min(1, Math.max(0, ((t - p.delay) * p.speed) / (WALK_SECONDS - 5)))
        : t < RESET_SECONDS ? 1 : 0;
      const [x, y] = along(p.path, u);
      return {
        type: "Feature" as const,
        properties: { c: `hsl(${p.hue} 45% 72%)` },
        geometry: { type: "Point" as const, coordinates: [x + p.offset, y + p.offset * 0.8] },
      };
    });
    (map.getSource("people") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features });
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
