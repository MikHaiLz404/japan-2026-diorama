// Turns the Tripsy fixture into what the map needs: dated stops, transport legs with real geometry,
// and the list of trip days. Only things that actually happened are kept — Tripsy holds dropped plans
// as undated entries, and the trip is over.
import { arc, distance } from "../lib/geo";
import type { LngLat, RouteGeometry, TripFixture } from "./types";

export type Category =
  | "food" | "cafe" | "shop" | "sight" | "museum" | "park" | "stay" | "transit" | "health" | "misc";

const CATEGORY_BY_TYPE: Record<string, Category> = {
  restaurant: "food", bakery: "food", foodMarket: "food", bar: "food",
  cafe: "cafe",
  shopping: "shop",
  tour: "sight", amusementPark: "sight",
  museum: "museum",
  park: "park",
  lodging: "stay",
  publicTransport: "transit",
  pharmacy: "health",
  general: "misc",
};
export const categoryOf = (type: string): Category => CATEGORY_BY_TYPE[type] ?? "misc";

export const CATEGORY_LABEL: Record<Category, string> = {
  food: "อาหาร", cafe: "คาเฟ่", shop: "ช้อปปิ้ง", sight: "ที่เที่ยว", museum: "พิพิธภัณฑ์",
  park: "สวน", stay: "ที่พัก", transit: "การเดินทาง", health: "ร้านยา", misc: "แวะ",
};

export interface Stop {
  id: string;
  name: string;
  /** Map label: tile glyphs have no Thai, so Thai is stripped (see mapLabel). */
  label: string;
  type: string;
  cat: Category;
  day: string;
  time: string;
  iso: string;
  end: string | null;
  lngLat: LngLat;
}

export interface Leg {
  id: string;
  kind: string;
  name: string;
  day: string;
  iso: string;
  arrive: string | null;
  coords: LngLat[];
  /** True when coords follow real rail/road geometry rather than a fallback arc. */
  snapped: boolean;
}

export interface Trip {
  /** IANA timezone the trip happened in; all day/time labels use it. */
  timezone: string;
  stops: Stop[];
  legs: Leg[];
  days: string[];
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  if (!formatters.has(key)) formatters.set(key, new Intl.DateTimeFormat(locale, options));
  return formatters.get(key)!;
}

/** Trip-local calendar day (YYYY-MM-DD) of a UTC timestamp. */
export const dayOf = (iso: string, timeZone: string): string => formatter("en-CA", { timeZone }).format(new Date(iso));
export const timeOf = (iso: string, timeZone: string): string =>
  formatter("th-TH", { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/** Weekday / day / month labels of a calendar day (YYYY-MM-DD) — independent of any timezone. */
export function dayParts(day: string): { weekday: string; date: number; month: string } {
  const noon = new Date(`${day}T12:00:00Z`);
  return {
    weekday: formatter("th-TH", { weekday: "short", timeZone: "UTC" }).format(noon),
    date: noon.getUTCDate(),
    month: formatter("th-TH", { month: "short", timeZone: "UTC" }).format(noon),
  };
}

const THAI = /[฀-๿]/;
const CJK = /[぀-ヿ㐀-鿿]/;
const MAX_LABEL = 30;

/** Map label without Thai (tile glyphs lack it), preferring a Latin alias for CJK-only names. */
export function mapLabel(name: string): string {
  let label = name.split(" — ")[0];
  const parens = [...label.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]);
  label = label
    .replace(/\([^)]*\)/g, "")
    .replace(/[฀-๿]+/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s+\-–—:/]+|[\s+\-–—:/]+$/g, "")
    .trim();
  const latinParen = parens.find((p) => p && !THAI.test(p) && !CJK.test(p) && /[A-Za-z]/.test(p));
  if ((!label || (CJK.test(label) && !/[A-Za-z]{3}/.test(label))) && latinParen) label = latinParen;
  if (!label) label = name.replace(/[฀-๿()]+/g, "").trim();
  return label.length > MAX_LABEL ? `${label.slice(0, MAX_LABEL - 1)}…` : label;
}

const hasPoint = (lat: number | null | undefined, lng: number | null | undefined) =>
  Number.isFinite(lat) && Number.isFinite(lng);

/**
 * Tripsy pins an entry to a day without a time as local midnight (00:00) with no end, or an end equal to the start.
 * Those are "places we might go" lists, not visits — a real visit has a time.
 */
export function isDayPlaceholder(startsAt: string, endsAt: string | null | undefined, timeZone: string): boolean {
  const localTime = formatter("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(startsAt));
  return localTime === "00:00" && (!endsAt || endsAt === startsAt);
}

/** Average speed used to estimate a leg's missing departure/arrival time. */
const ESTIMATE_KMH = 35;
const IGNORED_LEG_KINDS = new Set(["walk", "airplane"]);

export function buildTrip(fixture: TripFixture, routes: RouteGeometry[]): Trip {
  const tz = fixture.timezone;
  const places = [
    ...fixture.activities.map((a) => ({ ...a, type: a.type })),
    ...fixture.lodging.map((l) => ({ ...l, type: "lodging" })),
  ];
  const stops: Stop[] = places
    .filter((p) => p.starts_at && hasPoint(p.latitude, p.longitude) && !isDayPlaceholder(p.starts_at, p.ends_at, tz))
    .map((p) => ({
      id: p.id,
      name: p.name,
      label: mapLabel(p.name),
      type: p.type,
      cat: categoryOf(p.type),
      day: dayOf(p.starts_at!, tz),
      time: timeOf(p.starts_at!, tz),
      iso: p.starts_at!,
      end: p.ends_at,
      lngLat: [p.longitude!, p.latitude!] as LngLat,
    }))
    .sort((a, b) => a.iso.localeCompare(b.iso));

  const geometry = new Map(routes.map((r) => [r.id, r]));
  const legs: Leg[] = [];
  for (const t of fixture.transportations) {
    if (IGNORED_LEG_KINDS.has(t.type)) continue;
    if (!hasPoint(t.departure.latitude, t.departure.longitude) || !hasPoint(t.arrival.latitude, t.arrival.longitude)) continue;
    const from: LngLat = [t.departure.longitude!, t.departure.latitude!];
    const to: LngLat = [t.arrival.longitude!, t.arrival.latitude!];
    const estimateMs = (distance(from, to) / 1000 / ESTIMATE_KMH) * 3600e3;
    const iso = t.departure_at
      ?? (t.arrival_at ? new Date(new Date(t.arrival_at).getTime() - estimateMs).toISOString() : null);
    if (!iso) continue;
    const real = geometry.get(t.id);
    legs.push({
      id: t.id,
      kind: t.type,
      name: t.name || `${t.departure.name} → ${t.arrival.name}`,
      day: dayOf(iso, tz),
      iso,
      arrive: t.arrival_at ?? null,
      coords: real && real.coords.length > 1 ? real.coords : arc(from, to),
      snapped: Boolean(real && real.coords.length > 1),
    });
  }

  const days = [...new Set(stops.map((s) => s.day))].sort();
  return { timezone: tz, stops, legs, days };
}
