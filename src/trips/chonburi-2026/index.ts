import fixture from "./trip.json";
import routes from "./routes.json";
import type { RouteGeometry, TripFixture } from "../../data/types";
import type { TripConfig } from "../types";

// Camera, bounds and opening clock are derived from the data (see src/trips/frame.ts).
const config: TripConfig = {
  slug: "chonburi-2026",
  title: "Chonburi 2026",
  subtitle: "22 ก.พ. 2026 · บางแสน · พัทยา",
  fixture: fixture as TripFixture,
  routes: routes as RouteGeometry[],
  landmarks: [],
  places: [
    { name: "Bangkok", box: { west: 100.35, south: 13.55, east: 100.85, north: 13.95 } },
    { name: "Bang Saen", box: { west: 100.87, south: 13.24, east: 100.97, north: 13.36 } },
    { name: "Pattaya", box: { west: 100.85, south: 12.85, east: 100.98, north: 13.0 } },
  ],
};

export default config;
