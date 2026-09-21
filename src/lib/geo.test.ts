import { describe, expect, it } from "vitest";
import { CITY_CATALOG } from "../data/cities";
import {
  DEFAULT_TRAY_BOUNDS,
  haversineKm,
  latLngToLocalKm,
  projectGeoToTray,
} from "./geo";

describe("geo helpers", () => {
  it("computes haversine distance in km", () => {
    const km = haversineKm(35.6812, 139.7671, 35.4437, 139.638);
    expect(km).toBeGreaterThan(25);
    expect(km).toBeLessThan(35);
  });

  it("maps east/north offsets from an anchor", () => {
    const tokyo = latLngToLocalKm(35.6812, 139.7671, 35.6812, 139.7671);
    expect(tokyo.x).toBeCloseTo(0, 5);
    expect(tokyo.z).toBeCloseTo(0, 5);

    const chiba = latLngToLocalKm(35.6478, 140.0328, 35.6812, 139.7671);
    expect(chiba.x).toBeGreaterThan(0);
    expect(chiba.z).toBeLessThan(0);
  });

  it("projects catalog cities into tray bounds with readable spacing", () => {
    const tray = projectGeoToTray(CITY_CATALOG);
    expect(tray.size).toBe(CITY_CATALOG.length);

    for (const city of CITY_CATALOG) {
      const [x, z] = tray.get(city.id)!;
      expect(x).toBeGreaterThanOrEqual(DEFAULT_TRAY_BOUNDS.minX);
      expect(x).toBeLessThanOrEqual(DEFAULT_TRAY_BOUNDS.maxX);
      expect(z).toBeGreaterThanOrEqual(DEFAULT_TRAY_BOUNDS.minZ);
      expect(z).toBeLessThanOrEqual(DEFAULT_TRAY_BOUNDS.maxZ);
    }

    const tokyo = tray.get("tokyo")!;
    const yokohama = tray.get("yokohama")!;
    const chiba = tray.get("chiba")!;
    const takao = tray.get("takao")!;
    const kawagoe = tray.get("kawagoe")!;

    expect(yokohama[1]).toBeLessThan(tokyo[1]);
    expect(chiba[0]).toBeGreaterThan(tokyo[0]);
    expect(takao[0]).toBeLessThan(tokyo[0]);
    expect(kawagoe[1]).toBeGreaterThan(tokyo[1]);

    const ids = CITY_CATALOG.map((city) => city.id);
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const a = tray.get(ids[i])!;
        const b = tray.get(ids[j])!;
        expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeGreaterThan(1.2);
      }
    }
  });
});
