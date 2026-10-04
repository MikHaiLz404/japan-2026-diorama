import fixture from "./trip.json";
import routes from "./routes.json";
import type { RouteGeometry, TripFixture } from "../../data/types";
import type { TripConfig } from "../types";

// Camera, bounds and opening clock are derived from the data (see src/trips/frame.ts).
const config: TripConfig = {
  slug: "banthat-thong-2025",
  title: "แดกแก้ชง 2025",
  subtitle: "12 ม.ค. 2025 · บรรทัดทอง · สามย่าน",
  fixture: fixture as TripFixture,
  routes: routes as RouteGeometry[],
  landmarks: [],
  places: [
    { name: "Banthat Thong", box: { west: 100.519, south: 13.737, east: 100.527, north: 13.748 } },
    { name: "Siam · MBK", box: { west: 100.527, south: 13.742, east: 100.535, north: 13.755 } },
    { name: "Chinatown", box: { west: 100.5, south: 13.735, east: 100.515, north: 13.75 } },
  ],
  // The whole trip fits in a few blocks, so keep the area names up to street level.
  placesMaxZoom: 17,
};

export default config;
