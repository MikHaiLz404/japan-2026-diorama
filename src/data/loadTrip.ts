import fixture from "./japan-2026.json";
import { todayKey } from "../lib/dates";
import { buildCityBlocks, buildRoutePaths } from "./cities";
import type { CityBlock, RoutePath, TripFixture } from "./types";

export const trip = fixture as TripFixture;

export interface PreparedTrip {
  trip: TripFixture;
  today: string;
  cities: CityBlock[];
  routes: RoutePath[];
}

export function prepareTrip(now = new Date()): PreparedTrip {
  const today = todayKey(now, trip.timezone);
  return {
    trip,
    today,
    cities: buildCityBlocks(trip, today),
    routes: buildRoutePaths(trip, today),
  };
}
