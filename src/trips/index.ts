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
];

/** Newest trip first. */
export const tripsByDate = (): TripSummary[] => [...TRIPS].sort((a, b) => b.startsAt.localeCompare(a.startsAt));

export const findTrip = (slug: string): TripSummary | undefined => TRIPS.find((t) => t.slug === slug);

/** "/japan-2026/" → "japan-2026"; "/" → null. */
export function slugFromPath(pathname: string): string | null {
  const slug = pathname.split("/").filter(Boolean)[0];
  return slug ? decodeURIComponent(slug) : null;
}
