// Trip registry. Add a trip: create src/trips/<slug>/ (see japan-2026), then list it here.
// Each trip's data loads lazily, so the home page stays small.
import type { TripSummary } from "./types";

export const TRIPS: TripSummary[] = [
  {
    slug: "japan-2026",
    title: "Japan 2026",
    dates: "17–27 ก.ย. 2026",
    areas: ["Tokyo", "Kamakura", "Enoshima", "Yokohama", "Narita"],
    startsAt: "2026-09-17",
    load: () => import("./japan-2026").then((m) => m.default),
  },
  {
    slug: "chonburi-2026",
    title: "Chonburi 2026",
    dates: "22 ก.พ. 2026",
    areas: ["บางแสน", "พัทยา"],
    startsAt: "2026-02-22",
    load: () => import("./chonburi-2026").then((m) => m.default),
  },
  {
    slug: "khaoyai-2025",
    title: "เขาใหญ่ 2025",
    dates: "18–20 ก.ค. 2025",
    areas: ["ปากช่อง", "วังน้ำเขียว"],
    startsAt: "2025-07-18",
    load: () => import("./khaoyai-2025").then((m) => m.default),
  },
  {
    slug: "kanchanaburi-2025",
    title: "แพกลางน้ำเมาหัวเขื่อนเรื้อนหัวทิ่มถิ่นคนบ้าลาวันจันทร์",
    dates: "28 ก.พ.–2 มี.ค. 2025",
    areas: ["กาญจนบุรี"],
    startsAt: "2025-02-28",
    load: () => import("./kanchanaburi-2025").then((m) => m.default),
  },
  {
    slug: "banthat-thong-2025",
    title: "แดกแก้ชง 2025",
    dates: "12 ม.ค. 2025",
    areas: ["บรรทัดทอง", "สามย่าน"],
    startsAt: "2025-01-12",
    load: () => import("./banthat-thong-2025").then((m) => m.default),
  },
  {
    slug: "khaoyai-2022",
    title: "Lapin Hill Pool Villa Khaoyai",
    dates: "15–19 ต.ค. 2022",
    areas: ["ปากช่อง", "เขาใหญ่"],
    startsAt: "2022-10-15",
    load: () => import("./khaoyai-2022").then((m) => m.default),
  },
];

/** Newest trip first. */
export const tripsByDate = (): TripSummary[] => [...TRIPS].sort((a, b) => b.startsAt.localeCompare(a.startsAt));

export const findTrip = (slug: string): TripSummary | undefined => TRIPS.find((t) => t.slug === slug);

/** "/japan-2026/" → "japan-2026"; "/" → null. */
export function slugFromPath(pathname: string): string | null {
  const slug = pathname.split("/").filter(Boolean)[0];
  return slug ? decodeURIComponent(slug) : null;
}
