import { describe, expect, test } from "vitest";
import { phaseWeights, sunPosition, sunVector } from "./sun";

const TOKYO = { lat: 35.68, lng: 139.77 };
const at = (hhmm: string) => sunPosition(new Date(`2026-09-20T${hhmm}:00+09:00`), TOKYO.lat, TOKYO.lng);
const deg = (rad: number) => (rad * 180) / Math.PI;

describe("sunPosition", () => {
  test("Tokyo sunset on 20 Sep 2026 falls around 17:41 JST", () => {
    expect(deg(at("17:30").altitude)).toBeGreaterThan(0);
    expect(deg(at("17:50").altitude)).toBeLessThan(0);
  });

  test("the sun is roughly south at solar noon and high in the sky", () => {
    const noon = at("11:40");
    expect(Math.abs(deg(noon.azimuth))).toBeLessThan(10);
    expect(deg(noon.altitude)).toBeGreaterThan(50);
  });

  test("sunVector points up by day and below the horizon at night", () => {
    expect(sunVector(at("12:00")).y).toBeGreaterThan(0.7);
    expect(sunVector(at("23:00")).y).toBeLessThan(0);
  });
});

describe("phaseWeights", () => {
  test("weights always sum to 1", () => {
    for (const a of [-30, -8, -3, 0, 5, 10, 40]) {
      const w = phaseWeights((a * Math.PI) / 180);
      expect(w.night + w.dusk + w.day).toBeCloseTo(1, 9);
    }
  });

  test("deep night, sunset and midday land in the right phase", () => {
    expect(phaseWeights(at("23:00").altitude).night).toBe(1);
    expect(phaseWeights(at("17:45").altitude).dusk).toBeGreaterThan(0.9);
    expect(phaseWeights(at("12:00").altitude).day).toBe(1);
  });
});
