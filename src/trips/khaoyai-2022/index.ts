import fixture from "./trip.json";
import routes from "./routes.json";
import type { RouteGeometry, TripFixture } from "../../data/types";
import type { TripConfig } from "../types";

// Camera, bounds and opening clock are derived from the data (see src/trips/frame.ts).
const config: TripConfig = {
  slug: "khaoyai-2022",
  title: "Lapin Hill Pool Villa Khaoyai",
  subtitle: "15–19 ต.ค. 2022 · ปากช่อง · เขาใหญ่",
  fixture: fixture as TripFixture,
  routes: routes as RouteGeometry[],
  landmarks: [],
  // Khao Yai / Wang Nam Khiao hills — real terrain, no towers, so 3D terrain is safe.
  hilly: [{ west: 101.15, south: 14.2, east: 102.0, north: 14.85 }],
  places: [
    { name: "Pak Chong", box: { west: 101.38, south: 14.68, east: 101.43, north: 14.73 } },
    { name: "Khao Yai", box: { west: 101.2, south: 14.5, east: 101.5, north: 14.67 } },
    { name: "Lapin Hill", box: { west: 101.58, south: 14.67, east: 101.65, north: 14.72 } },
  ],
};

export default config;
