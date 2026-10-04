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
  places: [
    { name: "Bangkok", box: { west: 100.35, south: 13.55, east: 100.85, north: 13.95 } },
    { name: "Kanchanaburi", box: { west: 99.45, south: 13.9, east: 99.7, north: 14.1 } },
    { name: "Srinagarind Dam", box: { west: 99.05, south: 14.2, east: 99.3, north: 14.55 } },
  ],
};

export default config;
