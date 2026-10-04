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
};

export default config;
