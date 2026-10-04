import fixture from "./trip.json";
import routes from "./routes.json";
import type { RouteGeometry, TripFixture } from "../../data/types";
import type { TripConfig } from "../types";

// Camera, bounds and opening clock are derived from the data (see src/trips/frame.ts).
const config: TripConfig = {
  slug: "chonburi-2026",
  title: "Chonburi",
  subtitle: "22 ก.พ. 2026 · บางแสน · พัทยา",
  fixture: fixture as TripFixture,
  routes: routes as RouteGeometry[],
  landmarks: [],
};

export default config;
