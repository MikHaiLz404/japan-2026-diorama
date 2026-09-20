import { describe, expect, it } from "vitest";
import { palette, pathColor } from "./palette";

function rgb(hex: number): { r: number; g: number; b: number } {
  return { r: (hex >> 16) & 255, g: (hex >> 8) & 255, b: hex & 255 };
}

function luminance(hex: number): number {
  const { r, g, b } = rgb(hex);
  return (r + g + b) / 3;
}

function isGray(hex: number): boolean {
  const { r, g, b } = rgb(hex);
  return Math.abs(r - g) < 24 && Math.abs(g - b) < 24 && Math.abs(r - b) < 24;
}

function isWarmOrangeRed(hex: number): boolean {
  const { r, g, b } = rgb(hex);
  return !isGray(hex) && r > g && r > b && g > b;
}

function isDeepNavy(hex: number): boolean {
  const { r, g, b } = rgb(hex);
  return !isGray(hex) && b > r && b >= g && luminance(hex) < 120;
}

describe("path ribbon colors", () => {
  it("paints train and ground transport as warm orange-red, not gray", () => {
    for (const kind of ["train", "bus", "car"]) {
      const visited = pathColor("visited", kind);
      const today = pathColor("today", kind);
      expect(isWarmOrangeRed(visited)).toBe(true);
      expect(isWarmOrangeRed(today)).toBe(true);
      expect(visited).toBe(today);
    }
  });

  it("paints airplane ribbons as deep navy / indigo, not gray", () => {
    const flight = pathColor("visited", "airplane");
    expect(isDeepNavy(flight)).toBe(true);
    expect(pathColor("today", "airplane")).toBe(flight);
    const { r, b } = rgb(palette.flight);
    expect(b).toBeGreaterThan(r);
    expect(isGray(palette.flight)).toBe(false);
  });

  it("keeps upcoming ribbons a softer tint of the same hue instead of washed-out gray", () => {
    const train = pathColor("visited", "train");
    const trainSoon = pathColor("upcoming", "train");
    const air = pathColor("visited", "airplane");
    const airSoon = pathColor("upcoming", "airplane");

    expect(isGray(trainSoon)).toBe(false);
    expect(isGray(airSoon)).toBe(false);
    expect(isWarmOrangeRed(trainSoon)).toBe(true);
    expect(rgb(airSoon).b).toBeGreaterThan(rgb(airSoon).r);
    expect(luminance(trainSoon)).toBeGreaterThan(luminance(train));
    expect(luminance(airSoon)).toBeGreaterThan(luminance(air));
  });
});
