import fixture from "./trip.json";
import routes from "./routes.json";
import type { RouteGeometry, TripFixture } from "../../data/types";
import type { TripConfig } from "../types";

// Camera, bounds and opening clock are derived from the data (see src/trips/frame.ts).
const config: TripConfig = {
  slug: "khaoyai-2025",
  title: "เขาใหญ่ 2025",
  subtitle: "18–20 ก.ค. 2025 · ปากช่อง · วังน้ำเขียว",
  fixture: fixture as TripFixture,
  routes: routes as RouteGeometry[],
  landmarks: [],
  // Khao Yai / Wang Nam Khiao hills — real terrain, no towers, so 3D terrain is safe.
  hilly: [{ west: 101.15, south: 14.2, east: 102.0, north: 14.85 }],
  places: [
    { name: "Bangkok", box: { west: 100.35, south: 13.55, east: 100.85, north: 13.95 } },
    { name: "Pak Chong", box: { west: 101.3, south: 14.5, east: 101.5, north: 14.75 } },
    { name: "Wang Nam Khiao", box: { west: 101.65, south: 14.3, east: 101.95, north: 14.45 } },
  ],
};

export default config;
