import fixture from "./japan-2026.json";
import { todayKey } from "../lib/dates";
import { ORIGIN_TOKEN, buildCityBlocks, buildGroundPathSegments, buildRoutePaths } from "./cities";
import type { CityBlock, GroundPathSegment, RoutePath, TripFixture } from "./types";

export const trip = fixture as TripFixture;

export interface PreparedTrip {
  trip: TripFixture;
  today: string;
  cities: CityBlock[];
  routes: RoutePath[];
  groundPaths: GroundPathSegment[];
}

export function prepareTrip(now = new Date()): PreparedTrip {
  const today = todayKey(now, trip.timezone);
  const cities = buildCityBlocks(trip, today);
  // Never draw a route to a city that is not on the tray (e.g. a dropped day trip).
  const onTray = new Set([ORIGIN_TOKEN.id, ...cities.map((city) => city.id)]);
  const linksTray = (leg: { fromCityId: string; toCityId: string }) =>
    onTray.has(leg.fromCityId) && onTray.has(leg.toCityId);
  return {
    trip,
    today,
    cities,
    routes: buildRoutePaths(trip, today).filter(linksTray),
    groundPaths: buildGroundPathSegments(trip, today).filter(linksTray),
  };
}
