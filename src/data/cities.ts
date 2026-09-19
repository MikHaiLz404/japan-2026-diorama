import { haversineKm } from "../lib/geo";
import { shiftDateKey, toDateKey } from "../lib/dates";
import { rollupStatus, statusForDate } from "../lib/visit";
import type {
  CityBlock,
  CityCatalogEntry,
  DayPlate,
  RoutePath,
  TripActivity,
  TripFixture,
  TripLodging,
} from "./types";

/** Stylized tray layout — not a GIS map of Japan. */
export const CITY_CATALOG: CityCatalogEntry[] = [
  {
    id: "tokyo",
    name: "Tokyo",
    nameJa: "東京",
    lat: 35.6812,
    lng: 139.7671,
    tray: [0.55, 0.15],
    size: "lg",
    landmark: "skytree",
  },
  {
    id: "yokohama",
    name: "Yokohama",
    nameJa: "横浜",
    lat: 35.4437,
    lng: 139.638,
    tray: [-0.55, -1.85],
    size: "md",
    landmark: "tower",
  },
  {
    id: "kamakura",
    name: "Kamakura",
    nameJa: "鎌倉",
    lat: 35.3193,
    lng: 139.5466,
    tray: [0.45, -2.85],
    size: "sm",
    landmark: "torii",
  },
  {
    id: "enoshima",
    name: "Enoshima",
    nameJa: "江の島",
    lat: 35.2989,
    lng: 139.4803,
    tray: [-1.65, -2.95],
    size: "sm",
    landmark: "island",
  },
  {
    id: "chiba",
    name: "Chiba",
    nameJa: "千葉",
    lat: 35.6478,
    lng: 140.0328,
    tray: [3.15, 0.35],
    size: "md",
    landmark: "hall",
  },
  {
    id: "takao",
    name: "Takao",
    nameJa: "高尾",
    lat: 35.6253,
    lng: 139.2431,
    tray: [-3.15, 0.45],
    size: "sm",
    landmark: "peak",
  },
  {
    id: "kawagoe",
    name: "Kawagoe",
    nameJa: "川越",
    lat: 35.9251,
    lng: 139.4858,
    tray: [-0.15, 2.35],
    size: "sm",
    landmark: "kura",
  },
];

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

function lodgingOverlapsDate(stay: TripLodging, dateKey: string, timeZone: string): boolean {
  const start = toDateKey(stay.starts_at, timeZone);
  const end = lodgingEndDate(stay, timeZone);
  return dateKey >= start && dateKey <= end;
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
  }).filter((city) => city.activities.length > 0 || city.lodging.length > 0);
}

export function buildRoutePaths(trip: TripFixture, today: string): RoutePath[] {
  const tz = trip.timezone;
  const seen = new Set<string>();
  const routes: RoutePath[] = [];

  for (const hop of trip.transportations) {
    if (hop.type === "walk") continue;
    const fromLat = hop.departure.latitude;
    const fromLng = hop.departure.longitude;
    const toLat = hop.arrival.latitude;
    const toLng = hop.arrival.longitude;
    if (fromLat == null || fromLng == null || toLat == null || toLng == null) continue;

    const fromIsBkk = fromLat < 20;
    const fromCity = fromIsBkk ? ORIGIN_TOKEN.id : nearestCityId(fromLat, fromLng);
    const toCity = nearestCityId(toLat, toLng);
    if (fromCity === toCity) continue;

    const key = `${fromCity}->${toCity}:${hop.type}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const when = hop.departure_at ?? hop.arrival_at;
    const date = when ? toDateKey(when, tz) : trip.starts_at;
    const label = hop.transport_number
      ? `${hop.type} ${hop.transport_number}`
      : hop.type === "airplane"
        ? "flight"
        : hop.type;

    routes.push({
      id: hop.id,
      type: hop.type,
      fromCityId: fromCity,
      toCityId: toCity,
      status: statusForDate(date, today),
      label,
    });
  }

  return routes;
}
