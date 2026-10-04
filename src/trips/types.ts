import type { Map as MapLibreMap } from "maplibre-gl";
import type { LngLat, RouteGeometry, TripFixture } from "../data/types";
import type { Landmark } from "../map/landmarks";

export interface CameraPose {
  center: LngLat;
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface BoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** Everything that makes one trip's map: data, landmarks and how the camera frames it. */
export interface TripConfig {
  slug: string;
  title: string;
  /** Panel subtitle, e.g. dates + cities. */
  subtitle: string;
  fixture: TripFixture;
  routes: RouteGeometry[];
  landmarks: Landmark[];
  /** Where the map opens before anything is selected. Default: the overview. */
  start?: CameraPose;
  /** The "ทั้งหมด" view. Default: fit every stop and leg. */
  overview?: CameraPose;
  /** Clock (ISO) for the overview — sets the opening light. Default: the first stop's time. */
  overviewClock?: string;
  /** The camera can't pan or zoom out past this. Default: the trip's extent plus a margin. */
  bounds?: [LngLat, LngLat];
  minZoom?: number;
  /**
   * Regions where 3D terrain is switched on. The free DEM is a surface model, so flat cities with towers
   * get fake hills — only list genuinely hilly areas.
   */
  hilly?: BoundingBox[];
  /** Area names for the replay's day card. */
  places?: { name: string; box: BoundingBox }[];
  /** Trip-specific map extras (e.g. animated crosswalks), added after the base layers. */
  extras?: (map: MapLibreMap) => void;
}

/** What the home page needs to list a trip without loading its data. */
export interface TripSummary {
  slug: string;
  title: string;
  /** Short date range shown on the card. */
  dates: string;
  /** Cities / areas shown on the card. */
  areas: string[];
  /** YYYY-MM-DD, used to sort newest first. */
  startsAt: string;
  load: () => Promise<TripConfig>;
}
