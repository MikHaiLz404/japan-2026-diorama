// Trip overlays on the basemap: routes, the replay trail and the Apple-style POI symbols.
import type { ExpressionSpecification, Map as MapLibreMap } from "maplibre-gl";
import type { Category, Leg, Stop } from "../data/trip";
import { GLYPH } from "./icons";

const CATEGORIES: Category[] = ["food", "cafe", "shop", "sight", "museum", "park", "stay", "transit", "health", "misc"];
const ICON_PX = 40;
const STAY_ICON_PX = 52;

const cssColor = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();

/** A category circle with its white glyph, rasterised for the symbol layer. */
function poiImage(cat: Category): ImageData {
  const px = cat === "stay" ? STAY_ICON_PX : ICON_PX;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = px;
  const g = canvas.getContext("2d")!;
  g.beginPath();
  g.arc(px / 2, px / 2, px / 2 - 2, 0, Math.PI * 2);
  g.fillStyle = cssColor(cat);
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = "rgba(15,18,26,.6)";
  g.stroke();
  const k = (px * 0.56) / 24;
  g.translate(px / 2 - 12 * k, px / 2 - 12 * k);
  g.scale(k, k);
  g.fillStyle = "#fff";
  g.fill(new Path2D(GLYPH[cat]));
  return g.getImageData(0, 0, px, px);
}

export function addTripLayers(map: MapLibreMap, { stops, legs }: { stops: Stop[]; legs: Leg[] }): void {
  for (const cat of CATEGORIES) map.addImage(`poi-${cat}`, poiImage(cat), { pixelRatio: 2 });

  map.addSource("routes", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: legs.map((l) => ({
        type: "Feature", properties: { day: l.day, kind: l.kind }, geometry: { type: "LineString", coordinates: l.coords },
      })),
    },
  });
  map.addLayer({
    id: "route-glow", type: "line", source: "routes", layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#3d8bf5", "line-width": 10, "line-blur": 8, "line-opacity": 0 },
  });
  map.addLayer({
    id: "route", type: "line", source: "routes", layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": ["match", ["get", "kind"], "bus", "#3fcf7a", "#5ea6ff"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1.4, 15, 4],
      "line-opacity": 0.4,
    },
  });

  map.addSource("trail", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  const today = (on: number, off: number): ExpressionSpecification => ["case", ["get", "today"], on, off];
  map.addLayer({
    id: "trail-walk", type: "line", source: "trail", filter: ["==", ["get", "kind"], "walk"], layout: { "line-cap": "round" },
    paint: { "line-color": "#3b9bff", "line-width": 4, "line-dasharray": [0.1, 1.8], "line-opacity": today(0.95, 0.35) },
  });
  map.addLayer({
    id: "trail-glow", type: "line", source: "trail", filter: ["==", ["get", "kind"], "move"],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#4aa3ff", "line-width": 14, "line-blur": 10, "line-opacity": today(0.55, 0) },
  });
  map.addLayer({
    id: "trail-move", type: "line", source: "trail", filter: ["==", ["get", "kind"], "move"],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#7cc0ff", "line-width": 4.5, "line-opacity": today(1, 0.35) },
  });

  map.addSource("stops", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: stops.map((s) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: s.lngLat },
        properties: { id: s.id, label: s.label, cat: s.cat, day: s.day, rank: s.cat === "stay" ? 0 : s.cat === "sight" ? 1 : 2 },
      })),
    },
  });
  map.addLayer({
    id: "stops", type: "symbol", source: "stops",
    layout: {
      "icon-image": ["concat", "poi-", ["get", "cat"]],
      "icon-size": ["interpolate", ["linear"], ["zoom"], 9, 0.75, 15, 1],
      "icon-allow-overlap": ["step", ["zoom"], false, 13, true],
      "symbol-sort-key": ["get", "rank"],
      "text-field": ["step", ["zoom"], "", 11.5, ["get", "label"]],
      "text-font": ["Noto Sans Bold"],
      "text-size": 11.5,
      "text-variable-anchor": ["left", "right", "top", "bottom"],
      "text-radial-offset": 1.25,
      "text-justify": "auto",
      "text-max-width": 10,
      "text-optional": true,
    },
    paint: {
      "text-color": ["match", ["get", "cat"], ["food", "cafe"], cssColor("food"), "shop", cssColor("shop"), "sight", cssColor("sight"),
        "museum", cssColor("museum"), "park", cssColor("park"), "stay", "#a3acff", "transit", "#7fb3ff", "health", cssColor("health"), "#c3c9d6"],
      "text-halo-color": "rgba(20,24,36,.85)",
      "text-halo-width": 1.4,
    },
  });
}

/** Dim everything that isn't on `day` ("all" shows everything). */
export function focusDay(map: MapLibreMap, day: string, { routes = true } = {}): void {
  if (!map.getLayer("stops")) return;
  const on: ExpressionSpecification = day === "all" ? ["literal", true] : ["==", ["get", "day"], day];
  map.setPaintProperty("stops", "icon-opacity", ["case", on, 1, 0.2]);
  map.setPaintProperty("stops", "text-opacity", ["case", on, 1, 0]);
  map.setPaintProperty("route", "line-opacity", !routes ? 0.08 : day === "all" ? 0.4 : ["case", on, 0.95, 0.06]);
  map.setPaintProperty("route-glow", "line-opacity", !routes || day === "all" ? 0 : ["case", on, 0.4, 0]);
}

export function clearTrail(map: MapLibreMap): void {
  (map.getSource("trail") as import("maplibre-gl").GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: [] });
}
