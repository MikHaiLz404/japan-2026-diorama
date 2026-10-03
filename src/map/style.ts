// Basemap style: OpenFreeMap vector tiles + AWS terrarium DEM, painted from a palette that blends
// between night / dusk / day so the map follows the real sun.
import type { ExpressionSpecification, LayerSpecification, SkySpecification, StyleSpecification } from "maplibre-gl";
import type { PhaseWeights } from "./sun";

export interface Palette {
  land: string; land2: string; commercial: string; other: string; park: string; wood: string;
  water: string; waterLine: string; runway: string; casing: string; minor: string; major: string;
  highway: string; rail: string; bldLow: string; bldMid: string; bldHigh: string;
  city: string; place: string; road: string; poi: string; waterLabel: string; halo: string;
  shade: string; highlight: string; sky: string; horizon: string; fog: string;
}

export const PALETTES: Record<"night" | "dusk" | "day", Palette> = {
  night: {
    land: "#36405a", land2: "#3b4661", commercial: "#3d4663", other: "#38425d", park: "#2f5a4c", wood: "#2c5547",
    water: "#1d3556", waterLine: "#27446b", runway: "#5a637c", casing: "#2b3346", minor: "#56617c", major: "#6b7690",
    highway: "#8c95ab", rail: "#6c6f8c", bldLow: "#4b5774", bldMid: "#56607f", bldHigh: "#6a5d8e",
    city: "#e6eaf2", place: "#9aa3b8", road: "#8e97ad", poi: "#7c86a0", waterLabel: "#6f94c4", halo: "#283044",
    shade: "#141a28", highlight: "#5a6788", sky: "#121829", horizon: "#2f3a55", fog: "#2c3548",
  },
  dusk: {
    land: "#5b5670", land2: "#615b76", commercial: "#665d78", other: "#5d5873", park: "#4a6656", wood: "#425f50",
    water: "#3a5784", waterLine: "#4a6896", runway: "#7d7690", casing: "#4a4560", minor: "#837d98", major: "#9a8fa8",
    highway: "#d1a37a", rail: "#8d84a0", bldLow: "#77708d", bldMid: "#857a98", bldHigh: "#a083b4",
    city: "#fbf0f2", place: "#ddd0dc", road: "#c8bccb", poi: "#bdb0c2", waterLabel: "#a8bfe4", halo: "#4a4560",
    shade: "#2f2740", highlight: "#f0a77f", sky: "#3a3d6c", horizon: "#f29b72", fog: "#8a6f84",
  },
  day: {
    land: "#f1eee8", land2: "#ece9e2", commercial: "#f2e8e6", other: "#efebe4", park: "#c9e5bf", wood: "#b9dcae",
    water: "#9fcdf2", waterLine: "#8ac0ea", runway: "#dad7d0", casing: "#d6d2ca", minor: "#ffffff", major: "#ffffff",
    highway: "#f8d27c", rail: "#b8b4c4", bldLow: "#e3e0dc", bldMid: "#dbd8d6", bldHigh: "#d4cce6",
    city: "#2f3340", place: "#6c7180", road: "#7b808c", poi: "#8a8e99", waterLabel: "#4a86c2", halo: "#ffffff",
    shade: "#9a9488", highlight: "#ffffff", sky: "#8fc3f0", horizon: "#e8f1f8", fog: "#eef3f7",
  },
};

const hexToRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const rgbToHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/** Weighted blend of the three palettes. */
export function blendPalette({ night, dusk, day }: PhaseWeights): Palette {
  const out = {} as Palette;
  for (const key of Object.keys(PALETTES.night) as (keyof Palette)[]) {
    const [a, b, c] = [PALETTES.night[key], PALETTES.dusk[key], PALETTES.day[key]].map(hexToRgb);
    out[key] = rgbToHex(a.map((v, i) => v * night + b[i] * dusk + c[i] * day));
  }
  return out;
}

/** Flat `match` pairs for the building colour expression: [osmIds, color, osmIds, color, …]. */
export type BuildingHighlights = (number[] | string)[];

const NAME: ExpressionSpecification = ["coalesce", ["get", "name:en"], ["get", "name_en"], ["get", "name"]];
const zoomWidth = (stops: number[]): ExpressionSpecification =>
  ["interpolate", ["exponential", 1.6], ["zoom"], ...stops] as ExpressionSpecification;
/** OpenFreeMap building feature ids are OSM way id × 10 + a part digit. */
const OSM_WAY_ID: ExpressionSpecification = ["floor", ["/", ["id"], 10]];

/** Every palette-driven paint property, keyed by layer id — used for the initial style and live relighting. */
export function paintFor(p: Palette, highlight: BuildingHighlights): Record<string, Record<string, unknown>> {
  const heightRamp = ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 6], 0, p.bldLow, 40, p.bldMid, 120, p.bldHigh];
  return {
    bg: { "background-color": p.land },
    landuse: {
      "fill-color": ["match", ["get", "class"], ["residential", "suburb", "neighbourhood"], p.land2,
        ["commercial", "retail"], p.commercial, ["cemetery", "stadium", "pitch"], p.park, p.other],
    },
    landcover: { "fill-color": ["match", ["get", "class"], "wood", p.wood, p.park] },
    park: { "fill-color": p.park },
    hillshade: { "hillshade-shadow-color": p.shade, "hillshade-highlight-color": p.highlight, "hillshade-accent-color": p.shade },
    water: { "fill-color": p.water },
    waterway: { "line-color": p.waterLine },
    aeroway: { "line-color": p.runway },
    "road-casing": { "line-color": p.casing },
    "road-minor": { "line-color": p.minor },
    "road-major": { "line-color": p.major },
    "road-highway": { "line-color": p.highway },
    rail: { "line-color": p.rail },
    buildings: {
      "fill-extrusion-color": highlight.length ? ["match", OSM_WAY_ID, ...highlight, heightRamp] : heightRamp,
    },
    "water-name": { "text-color": p.waterLabel, "text-halo-color": p.water },
    "road-name": { "text-color": p.road, "text-halo-color": p.halo },
    "basemap-poi": { "text-color": p.poi, "text-halo-color": p.halo },
    "place-minor": { "text-color": p.place, "text-halo-color": p.halo },
    "place-city": { "text-color": p.city, "text-halo-color": p.halo },
  };
}

export function skyFor(p: Palette): SkySpecification {
  return {
    "sky-color": p.sky, "horizon-color": p.horizon, "fog-color": p.fog,
    "sky-horizon-blend": 0.55, "horizon-fog-blend": 0.6, "fog-ground-blend": 0.88, "atmosphere-blend": 0.6,
  };
}

export function buildStyle(p: Palette, hiddenBuildings: number[], highlight: BuildingHighlights): StyleSpecification {
  const paint = paintFor(p, highlight);
  const layer = (def: Record<string, unknown> & { id: string }) =>
    ({ ...def, paint: { ...((def.paint as object) ?? {}), ...(paint[def.id] ?? {}) } }) as LayerSpecification;
  return {
    version: 8,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      omt: { type: "vector", url: "https://tiles.openfreemap.org/planet" },
      dem: {
        type: "raster-dem", encoding: "terrarium", tileSize: 256, maxzoom: 14,
        tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
        attribution: '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Mapzen terrain</a>',
      },
    },
    sky: skyFor(p),
    layers: [
      layer({ id: "bg", type: "background" }),
      layer({ id: "landuse", type: "fill", source: "omt", "source-layer": "landuse", paint: { "fill-opacity": 0.8 } }),
      layer({
        id: "landcover", type: "fill", source: "omt", "source-layer": "landcover",
        filter: ["in", ["get", "class"], ["literal", ["grass", "wood", "farmland", "wetland"]]], paint: { "fill-opacity": 0.75 },
      }),
      layer({ id: "park", type: "fill", source: "omt", "source-layer": "park", paint: { "fill-opacity": 0.85 } }),
      layer({
        id: "hillshade", type: "hillshade", source: "dem", layout: { visibility: "none" },
        paint: { "hillshade-exaggeration": 0.35, "hillshade-illumination-anchor": "map" },
      }),
      layer({ id: "water", type: "fill", source: "omt", "source-layer": "water" }),
      layer({
        id: "waterway", type: "line", source: "omt", "source-layer": "waterway",
        paint: { "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 16, 3] },
      }),
      layer({
        id: "aeroway", type: "line", source: "omt", "source-layer": "aeroway", filter: ["==", ["get", "class"], "runway"],
        paint: { "line-width": ["interpolate", ["exponential", 2], ["zoom"], 10, 2, 16, 60] },
      }),
      layer({
        id: "road-casing", type: "line", source: "omt", "source-layer": "transportation", minzoom: 12,
        filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary"]]],
        layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-width": zoomWidth([12, 3, 18, 38]) },
      }),
      layer({
        id: "road-minor", type: "line", source: "omt", "source-layer": "transportation", minzoom: 13,
        filter: ["in", ["get", "class"], ["literal", ["minor", "service", "tertiary"]]],
        layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-width": zoomWidth([13, 0.6, 18, 16]) },
      }),
      layer({
        id: "road-major", type: "line", source: "omt", "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", ["primary", "secondary", "trunk"]]],
        layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-width": zoomWidth([9, 0.6, 18, 30]) },
      }),
      layer({
        id: "road-highway", type: "line", source: "omt", "source-layer": "transportation", filter: ["==", ["get", "class"], "motorway"],
        layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-width": zoomWidth([7, 0.8, 18, 36]) },
      }),
      layer({
        id: "rail", type: "line", source: "omt", "source-layer": "transportation", minzoom: 10, filter: ["==", ["get", "class"], "rail"],
        paint: { "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.6, 17, 2.5], "line-dasharray": [3, 2] },
      }),
      layer({
        id: "buildings", type: "fill-extrusion", source: "omt", "source-layer": "building", minzoom: 13,
        filter: ["!", ["in", OSM_WAY_ID, ["literal", hiddenBuildings]]],
        paint: {
          "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 13, 0, 14.2, ["coalesce", ["get", "render_height"], 6]],
          "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
          "fill-extrusion-opacity": 0.96,
          "fill-extrusion-vertical-gradient": true,
        },
      }),
      layer({
        id: "water-name", type: "symbol", source: "omt", "source-layer": "water_name",
        layout: { "text-field": NAME, "text-font": ["Noto Sans Italic"], "text-size": 12, "text-letter-spacing": 0.15 },
        paint: { "text-halo-width": 1 },
      }),
      layer({
        id: "road-name", type: "symbol", source: "omt", "source-layer": "transportation_name", minzoom: 14,
        layout: {
          "symbol-placement": "line", "text-field": ["upcase", NAME], "text-font": ["Noto Sans Bold"],
          "text-size": 9.5, "text-letter-spacing": 0.08,
        },
        paint: { "text-halo-width": 1.2 },
      }),
      layer({
        id: "basemap-poi", type: "symbol", source: "omt", "source-layer": "poi", minzoom: 16, filter: ["<=", ["get", "rank"], 12],
        layout: { "text-field": NAME, "text-font": ["Noto Sans Regular"], "text-size": 10, "text-max-width": 8 },
        paint: { "text-halo-width": 1 },
      }),
      layer({
        id: "place-minor", type: "symbol", source: "omt", "source-layer": "place", minzoom: 11,
        filter: ["in", ["get", "class"], ["literal", ["suburb", "quarter", "neighbourhood"]]],
        layout: {
          "text-field": ["upcase", NAME], "text-font": ["Noto Sans Bold"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 11, 9, 16, 12], "text-letter-spacing": 0.12, "text-max-width": 7,
        },
        paint: { "text-halo-width": 1.2 },
      }),
      layer({
        id: "place-city", type: "symbol", source: "omt", "source-layer": "place", maxzoom: 14,
        filter: ["in", ["get", "class"], ["literal", ["city", "town"]]],
        layout: { "text-field": NAME, "text-font": ["Noto Sans Bold"], "text-size": ["interpolate", ["linear"], ["zoom"], 6, 12, 12, 18] },
        paint: { "text-halo-width": 1.5 },
      }),
    ],
  };
}
