import { describe, expect, test } from "vitest";
import { PALETTES, blendPalette, buildStyle, paintFor } from "./style";

describe("blendPalette", () => {
  test("a pure weight returns that palette exactly", () => {
    expect(blendPalette({ night: 1, dusk: 0, day: 0 })).toEqual(PALETTES.night);
    expect(blendPalette({ night: 0, dusk: 0, day: 1 })).toEqual(PALETTES.day);
  });

  test("an even mix lands between the endpoints", () => {
    const mid = blendPalette({ night: 0.5, dusk: 0, day: 0.5 });
    const channel = (hex: string) => parseInt(hex.slice(1, 3), 16);
    expect(channel(mid.land)).toBeGreaterThan(channel(PALETTES.night.land));
    expect(channel(mid.land)).toBeLessThan(channel(PALETTES.day.land));
  });
});

describe("buildStyle", () => {
  test("hides replaced landmark buildings by OSM way id", () => {
    const style = buildStyle(PALETTES.night, [288269147], []);
    const buildings = style.layers.find((l) => l.id === "buildings")!;
    expect(JSON.stringify(buildings.filter)).toContain("288269147");
  });

  test("every palette-driven layer exists in the style", () => {
    const style = buildStyle(PALETTES.day, [], []);
    // Trip layers added after the style loads (src/map/placeLabels.ts) are relit too.
    const ids = new Set([...style.layers.map((l) => l.id), "places"]);
    for (const id of Object.keys(paintFor(PALETTES.day, []))) expect(ids.has(id)).toBe(true);
  });

  test("tints highlighted buildings with a match expression", () => {
    const paint = paintFor(PALETTES.night, [[64891750], "#93a9d4"]);
    expect((paint.buildings["fill-extrusion-color"] as unknown[])[0]).toBe("match");
  });
});
