/** Shape of src/data/japan-2026.json, written by scripts/refresh-trip.mjs from Tripsy. */
export type TransportKind =
  | "airplane"
  | "train"
  | "subway"
  | "bus"
  | "walk"
  | "car"
  | "roadtrip"
  | "ferry"
  | string;

export interface GeoPoint {
  name: string;
  latitude: number | null;
  longitude: number | null;
}

export interface TripActivity {
  id: string;
  name: string;
  /** Tripsy activity_type slug, e.g. restaurant, cafe, shopping, tour. */
  type: string;
  starts_at: string | null;
  ends_at: string | null;
  latitude: number | null;
  longitude: number | null;
  address?: string | null;
  timezone: string;
  notes?: string | null;
  website?: string | null;
}

export interface TripLodging {
  id: string;
  name: string;
  starts_at: string | null;
  ends_at: string | null;
  latitude: number | null;
  longitude: number | null;
  address?: string | null;
  timezone: string;
  notes?: string | null;
  website?: string | null;
}

export interface TripTransport {
  id: string;
  type: TransportKind;
  name?: string | null;
  transport_number?: string | null;
  departure_at?: string | null;
  arrival_at?: string | null;
  departure: GeoPoint;
  arrival: GeoPoint;
}

export interface TripFixture {
  source: "tripsy";
  trip_id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  fetched_at: string;
  activities: TripActivity[];
  lodging: TripLodging[];
  transportations: TripTransport[];
}

/** One entry of src/data/routes.json, written by scripts/build-routes.mjs. */
export interface RouteGeometry {
  /** Tripsy transportation id. */
  id: string;
  mode: "rail" | "road";
  coords: [number, number][];
}

export type LngLat = [number, number];
