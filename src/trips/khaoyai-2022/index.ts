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
};

export default config;
