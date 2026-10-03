// Solar position (simplified SunCalc / Astronomy Answers formulas) — well under a degree of error,
// plenty for lighting a map.
const RAD = Math.PI / 180;
const DAY_MS = 864e5;
const J1970 = 2440588;
const J2000 = 2451545;
const OBLIQUITY = 23.4397 * RAD;

export interface SunPosition {
  /** Radians above the horizon. */
  altitude: number;
  /** Radians from south, positive toward west. */
  azimuth: number;
}

export interface PhaseWeights {
  night: number;
  dusk: number;
  day: number;
}

const toDays = (date: Date) => date.valueOf() / DAY_MS - 0.5 + J1970 - J2000;
const solarMeanAnomaly = (d: number) => RAD * (357.5291 + 0.98560028 * d);
function eclipticLongitude(m: number): number {
  const center = RAD * (1.9148 * Math.sin(m) + 0.02 * Math.sin(2 * m) + 0.0003 * Math.sin(3 * m));
  return m + center + RAD * 102.9372 + Math.PI;
}

export function sunPosition(date: Date, lat: number, lng: number): SunPosition {
  const lw = -lng * RAD;
  const phi = lat * RAD;
  const d = toDays(date);
  const l = eclipticLongitude(solarMeanAnomaly(d));
  const dec = Math.asin(Math.sin(l) * Math.sin(OBLIQUITY));
  const ra = Math.atan2(Math.sin(l) * Math.cos(OBLIQUITY), Math.cos(l));
  const h = RAD * (280.16 + 360.9856235 * d) - lw - ra;
  return {
    azimuth: Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)),
    altitude: Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(h)),
  };
}

/** Unit vector toward the sun in local map space: x = east, y = up, z = south. */
export function sunVector({ altitude, azimuth }: SunPosition): { x: number; y: number; z: number } {
  const c = Math.cos(altitude);
  return { x: -Math.sin(azimuth) * c, y: Math.sin(altitude), z: Math.cos(azimuth) * c };
}

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * Blend weights (summing to 1) from solar altitude: full night below −9°, twilight up to −1°,
 * golden light up to 14°, full day above.
 */
export function phaseWeights(altitudeRad: number): PhaseWeights {
  const deg = altitudeRad / RAD;
  const day = smoothstep(2, 14, deg);
  const notNight = smoothstep(-9, -1, deg);
  return { night: 1 - notNight, dusk: notNight - day, day };
}
