import { describe, expect, test } from "vitest";
import { LANDMARKS, buildingHighlights, hiddenBuildings, visitedLandmarks } from "./landmarks";
import type { LngLat } from "../data/types";

const stop = (name: string, lngLat: LngLat) => ({ name, lngLat });

describe("visitedLandmarks", () => {
  test("a stop next to a landmark counts as a visit", () => {
    const ids = visitedLandmarks([stop("Tokyo Skytree", [139.8107, 35.7101])]).map((l) => l.id);
    expect(ids).toContain("skytree");
    expect(ids).not.toContain("daibutsu");
  });

  test("a far pin still counts when the stop is named after the landmark", () => {
    const toyosu: LngLat = [139.793, 35.6465]; // Tripsy's teamLab pin, ~440 m from the venue
    expect(visitedLandmarks([stop("Vegan Ramen UZU Tokyo", toyosu)]).map((l) => l.id)).not.toContain("teamlab");
    expect(visitedLandmarks([stop("teamLab Planets", toyosu)]).map((l) => l.id)).toContain("teamlab");
  });

  test("no stops means no landmarks", () => {
    expect(visitedLandmarks([])).toEqual([]);
  });
});

describe("catalogue helpers", () => {
  test("hiddenBuildings collects every replaced OSM way", () => {
    const skytree = LANDMARKS.filter((l) => l.id === "skytree");
    expect(hiddenBuildings(skytree)).toEqual([288269147, 288269148, 362351415]);
  });

  test("buildingHighlights pairs OSM ids with their tint", () => {
    const brick = LANDMARKS.filter((l) => l.id === "redbrick");
    expect(buildingHighlights(brick)).toEqual([[72998296], "#b9553c"]);
  });

  test("every modelled or tinted landmark has a positive badge height", () => {
    for (const lm of LANDMARKS) expect(lm.top).toBeGreaterThan(0);
  });
});
