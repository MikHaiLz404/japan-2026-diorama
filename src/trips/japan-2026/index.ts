import fixture from "./trip.json";
import routes from "./routes.json";
import crosswalks from "./scramble.json";
import { LANDMARKS } from "./landmarks";
import { addScramble } from "./scramble";
import type { LngLat, RouteGeometry, TripFixture } from "../../data/types";
import type { TripConfig } from "../types";

const config: TripConfig = {
  slug: "japan-2026",
  title: "Japan 2026",
  subtitle: "17–27 ก.ย. · Tokyo · Kamakura · Yokohama · Narita",
  fixture: fixture as TripFixture,
  routes: routes as RouteGeometry[],
  landmarks: LANDMARKS,
  start: { center: [139.804, 35.7128], zoom: 15.4, pitch: 62, bearing: 38 },
  overview: { center: [139.86, 35.6], zoom: 9.2, pitch: 45, bearing: -12 },
  // First evening in Tokyo — the overview opens at night, like the trip did.
  overviewClock: "2026-09-18T19:30:00+09:00",
  // Enoshima → Narita plus margin.
  bounds: [[139.05, 35.1], [140.7, 36.05]],
  minZoom: 8.5,
  // Kamakura / Enoshima / Hakone side; the Kantō plain stays flat.
  hilly: [{ west: 138.9, south: 35.15, east: 139.62, north: 35.42 }],
  places: [
    { name: "Tokyo", box: { west: 139.6, south: 35.6, east: 139.95, north: 35.85 } },
    { name: "Kamakura · Enoshima", box: { west: 139.45, south: 35.28, east: 139.58, north: 35.34 } },
    { name: "Yokohama", box: { west: 139.6, south: 35.42, east: 139.68, north: 35.48 } },
    { name: "Narita", box: { west: 140.25, south: 35.74, east: 140.42, north: 35.8 } },
  ],
  extras: (map) => addScramble(map, crosswalks as LngLat[][]),
};

export default config;
