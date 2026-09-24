export type ActivityKind = string;
export type TransportKind =
  | "airplane"
  | "train"
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
  type: ActivityKind;
  starts_at: string | null;
  ends_at: string | null;
  latitude: number;
  longitude: number;
  address?: string | null;
  timezone: string;
  notes?: string | null;
  website?: string | null;
}

export interface TripLodging {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  latitude: number;
  longitude: number;
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

export type VisitStatus = "visited" | "today" | "upcoming";

export interface CityCatalogEntry {
  id: string;
  name: string;
  nameJa: string;
  lat: number;
  lng: number;
  /** Stylized tray coordinates (x, z), projected from lat/lng. */
  tray: [number, number];
  size: "lg" | "md" | "sm";
  landmark: "skytree" | "tower" | "torii" | "island" | "hall" | "peak" | "kura";
}

export interface DayPlate {
  cityId: string;
  date: string;
  status: VisitStatus;
  activities: TripActivity[];
  lodging: TripLodging[];
}

export interface CityBlock {
  id: string;
  name: string;
  nameJa: string;
  tray: [number, number];
  size: "lg" | "md" | "sm";
  landmark: CityCatalogEntry["landmark"];
  status: VisitStatus;
  dates: string[];
  plates: DayPlate[];
  lodging: TripLodging[];
  activities: TripActivity[];
}

export interface RoutePath {
  id: string;
  type: TransportKind;
  fromCityId: string;
  toCityId: string;
  status: VisitStatus;
  label: string;
  /** Tripsy date key (trip timezone) of the hop; null for unscheduled placeholders. */
  date: string | null;
}

export interface GroundPathSegment {
  id: string;
  type: TransportKind;
  fromCityId: string;
  toCityId: string;
  status: VisitStatus;
}

export interface Selection {
  cityId: string;
  date?: string;
}
