// Trip place names (Tokyo, Kamakura…) over the basemap. Every place stays labelled at any screen size;
// places the trip hasn't reached yet — by the real clock, or the replay clock while replaying — are dimmed.
import type { ExpressionSpecification, Map as MapLibreMap } from "maplibre-gl";
import type { Stop } from "../data/trip";
import type { LngLat } from "../data/types";
import { inBox } from "../lib/geo";
import type { BoundingBox } from "../trips/types";

export interface PlacePoint {
  name: string;
  at: LngLat;
  /** Epoch ms of the first stop inside the place. */
  first: number;
}

/** Places fade out once stop labels take over at street level. */
const MAX_ZOOM = 12.5;
const UPCOMING_OPACITY = 0.4;

/** One label per place the trip actually visited, at the centre of its box. */
export function placePoints(places: { name: string; box: BoundingBox }[] | undefined, stops: Stop[]): PlacePoint[] {
  return (places ?? []).flatMap(({ name, box }) => {
    const times = stops.filter((s) => inBox(s.lngLat, box)).map((s) => Date.parse(s.iso));
    if (!times.length) return [];
    return [{ name, at: [(box.west + box.east) / 2, (box.south + box.north) / 2] as LngLat, first: Math.min(...times) }];
  });
}

export const reachedFilter = (now: Date): ExpressionSpecification => ["<=", ["get", "first"], now.getTime()];

/** Adds the place layer; the returned `setClock` re-dims it, touching the style only when a place is newly reached. */
export function addPlaceLabels(map: MapLibreMap, points: PlacePoint[]): { setClock: (now: Date) => void } {
  if (!points.length) return { setClock: () => {} };
  map.addSource("places", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: points.map((p) => ({ type: "Feature", geometry: { type: "Point", coordinates: p.at }, properties: { name: p.name, first: p.first } })),
    },
  });
  map.addLayer({
    id: "places", type: "symbol", source: "places", maxzoom: MAX_ZOOM,
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["Noto Sans Bold"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 6, 13, 12, 18],
      "text-letter-spacing": 0.04,
      // Always shown — the basemap's own city labels give way to these instead.
      "text-allow-overlap": true,
    },
    // Colours follow the sun with the rest of the basemap (see paintFor in style.ts).
    paint: { "text-halo-width": 1.6 },
  });

  let reachedCount = -1;
  const setClock = (now: Date) => {
    const count = points.filter((p) => p.first <= now.getTime()).length;
    if (count === reachedCount) return;
    reachedCount = count;
    map.setPaintProperty("places", "text-opacity", ["case", reachedFilter(now), 1, UPCOMING_OPACITY]);
  };
  setClock(new Date());
  return { setClock };
}
