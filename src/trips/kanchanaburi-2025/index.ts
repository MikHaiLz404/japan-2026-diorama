import fixture from "./trip.json";
import routes from "./routes.json";
import type { RouteGeometry, TripFixture } from "../../data/types";
import type { TripConfig } from "../types";

// Camera, bounds and opening clock are derived from the data (see src/trips/frame.ts).
const config: TripConfig = {
  slug: "kanchanaburi-2025",
  title: "แพกลางน้ำเมาหัวเขื่อนเรื้อนหัวทิ่มถิ่นคนบ้าลาวันจันทร์",
  subtitle: "28 ก.พ.–2 มี.ค. 2025 · กาญจนบุรี",
  fixture: fixture as TripFixture,
  routes: routes as RouteGeometry[],
  landmarks: [],
  // Western Kanchanaburi hills around the dam.
  hilly: [{ west: 98.9, south: 14.0, east: 99.6, north: 14.7 }],
};

export default config;
