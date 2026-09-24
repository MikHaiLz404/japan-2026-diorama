import { haversineKm, projectGeoToTray } from "../lib/geo";
import { shiftDateKey, toDateKey } from "../lib/dates";
import { rollupStatus, statusForDate } from "../lib/visit";
import type {
  CityBlock,
  CityCatalogEntry,
  DayPlate,
  GroundPathSegment,
  RoutePath,
  TripActivity,
  TripFixture,
  TripLodging,
  VisitStatus,
} from "./types";

const CITY_DEFINITIONS: Omit<CityCatalogEntry, "tray">[] = [
  {
    id: "tokyo",
    name: "Tokyo",
    nameJa: "東京",
    lat: 35.6812,
    lng: 139.7671,
    size: "lg",
    landmark: "skytree",
  },
  {
    id: "yokohama",
    name: "Yokohama",
    nameJa: "横浜",
    lat: 35.4437,
    lng: 139.638,
    size: "md",
    landmark: "tower",
  },
  {
    id: "kamakura",
    name: "Kamakura",
    nameJa: "鎌倉",
    lat: 35.3193,
    lng: 139.5466,
    size: "sm",
    landmark: "torii",
  },
  {
    id: "enoshima",
    name: "Enoshima",
    nameJa: "江の島",
    lat: 35.2989,
    lng: 139.4803,
    size: "sm",
    landmark: "island",
  },
  {
    id: "chiba",
    name: "Chiba",
    nameJa: "千葉",
    lat: 35.6478,
    lng: 140.0328,
    size: "md",
    landmark: "hall",
  },
  {
    id: "takao",
    name: "Takao",
    nameJa: "高尾",
    lat: 35.6253,
    lng: 139.2431,
    size: "sm",
    landmark: "peak",
  },
  {
    id: "kawagoe",
    name: "Kawagoe",
    nameJa: "川越",
    lat: 35.9251,
    lng: 139.4858,
    size: "sm",
    landmark: "kura",
  },
];

const TRAY_BY_ID = projectGeoToTray(CITY_DEFINITIONS);

/** Stylized tray layout — lat/lng projected onto the felt, not a GIS basemap. */
export const CITY_CATALOG: CityCatalogEntry[] = CITY_DEFINITIONS.map((city) => ({
  ...city,
  tray: TRAY_BY_ID.get(city.id) ?? [0, 0],
}));

export const ORIGIN_TOKEN = {
  id: "bangkok",
  name: "Bangkok",
  nameJa: "BKK",
  tray: [-4.35, 2.55] as [number, number],
};

const CITY_BY_ID = new Map(CITY_CATALOG.map((city) => [city.id, city]));

export function cityById(id: string): CityCatalogEntry | undefined {
  return CITY_BY_ID.get(id);
}

export function nearestCityId(lat: number, lng: number): string {
  let best = CITY_CATALOG[0];
  let bestKm = Infinity;
  for (const city of CITY_CATALOG) {
    const km = haversineKm(lat, lng, city.lat, city.lng);
    if (km < bestKm) {
      best = city;
      bestKm = km;
    }
  }
  return best.id;
}

function lodgingEndDate(stay: TripLodging, timeZone: string): string {
  const end = toDateKey(stay.ends_at, timeZone);
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date(stay.ends_at)),
  );
  return hour < 6 ? shiftDateKey(end, -1) : end;
}

export function lodgingOverlapsDate(stay: TripLodging, dateKey: string, timeZone: string): boolean {
  const start = toDateKey(stay.starts_at, timeZone);
  const end = lodgingEndDate(stay, timeZone);
  return dateKey >= start && dateKey <= end;
}

function hopStatus(hop: TripFixture["transportations"][number], tz: string, today: string): VisitStatus {
  const when = hop.departure_at ?? hop.arrival_at;
  return when ? statusForDate(toDateKey(when, tz), today) : "upcoming";
}

function hopCities(hop: TripFixture["transportations"][number]): { fromCity: string; toCity: string } | null {
  const fromLat = hop.departure.latitude;
  const fromLng = hop.departure.longitude;
  const toLat = hop.arrival.latitude;
  const toLng = hop.arrival.longitude;
  if (fromLat == null || fromLng == null || toLat == null || toLng == null) return null;

  // Anything this far south is Bangkok, on the way out or the way home.
  const fromCity = fromLat < 20 ? ORIGIN_TOKEN.id : nearestCityId(fromLat, fromLng);
  const toCity = toLat < 20 ? ORIGIN_TOKEN.id : nearestCityId(toLat, toLng);
  if (fromCity === toCity) return null;
  return { fromCity, toCity };
}

export function buildCityBlocks(trip: TripFixture, today: string): CityBlock[] {
  const tz = trip.timezone;
  const grouped = new Map<string, TripActivity[]>();
  for (const activity of trip.activities) {
    const cityId = nearestCityId(activity.latitude, activity.longitude);
    const list = grouped.get(cityId) ?? [];
    list.push(activity);
    grouped.set(cityId, list);
  }

  return CITY_CATALOG.map((catalog) => {
    const activities = (grouped.get(catalog.id) ?? []).sort((a, b) =>
      (a.starts_at ?? "").localeCompare(b.starts_at ?? ""),
    );
    const lodging = trip.lodging.filter(
      (stay) => nearestCityId(stay.latitude, stay.longitude) === catalog.id,
    );
    const dateSet = new Set<string>();
    for (const activity of activities) {
      if (activity.starts_at) dateSet.add(toDateKey(activity.starts_at, activity.timezone || tz));
    }
    const dates = [...dateSet].sort();
    const plates: DayPlate[] = dates.map((date) => ({
      cityId: catalog.id,
      date,
      status: statusForDate(date, today),
      activities: activities.filter(
        (activity) =>
          activity.starts_at && toDateKey(activity.starts_at, activity.timezone || tz) === date,
      ),
      lodging: lodging.filter((stay) => lodgingOverlapsDate(stay, date, stay.timezone || tz)),
    }));

    return {
      id: catalog.id,
      name: catalog.name,
      nameJa: catalog.nameJa,
      tray: catalog.tray,
      size: catalog.size,
      landmark: catalog.landmark,
      status: rollupStatus(dates, today),
      dates,
      plates,
      lodging,
      activities,
    };
    // Undated activities are wishlist items; a city needs a scheduled day or a stay to be on the tray.
  }).filter((city) => city.dates.length > 0 || city.lodging.length > 0);
}

export function buildRoutePaths(trip: TripFixture, today: string): RoutePath[] {
  const tz = trip.timezone;
  const seen = new Set<string>();
  const routes: RoutePath[] = [];

  for (const hop of trip.transportations) {
    if (hop.type === "walk") continue;
    const cities = hopCities(hop);
    if (!cities) continue;

    const when = hop.departure_at ?? hop.arrival_at;
    const date = when ? toDateKey(when, tz) : null;
    // One arc per leg per day, so each day can show its own journey.
    const key = `${cities.fromCity}->${cities.toCity}:${hop.type}:${date ?? "undated"}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const status = hopStatus(hop, tz, today);
    const label = hop.transport_number
      ? `${hop.type} ${hop.transport_number}`
      : hop.type === "airplane"
        ? "flight"
        : hop.type;

    routes.push({
      id: hop.id,
      type: hop.type,
      fromCityId: cities.fromCity,
      toCityId: cities.toCity,
      status,
      label,
      date,
    });
  }

  return routes;
}

/** Rail segments on the felt — inter-city train/ferry only; walks and flights skipped. */
export function buildGroundPathSegments(trip: TripFixture, today: string): GroundPathSegment[] {
  const tz = trip.timezone;
  const seen = new Set<string>();
  const segments: GroundPathSegment[] = [];

  for (const hop of trip.transportations) {
    if (hop.type === "walk" || hop.type === "airplane" || hop.type === "bus") continue;
    const cities = hopCities(hop);
    if (!cities) continue;
    if (cities.fromCity === ORIGIN_TOKEN.id) continue;

    const pairKey = [cities.fromCity, cities.toCity].sort().join("<->");
    if (seen.has(pairKey)) continue;
    seen.add(pairKey);

    segments.push({
      id: `rail:${pairKey}`,
      type: hop.type,
      fromCityId: cities.fromCity,
      toCityId: cities.toCity,
      status: hopStatus(hop, tz, today),
    });
  }

  return segments;
}
