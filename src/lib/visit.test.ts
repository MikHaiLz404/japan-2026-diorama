import { describe, expect, it } from "vitest";
import { rollupStatus, statusForDate } from "./visit";
import { buildCityBlocks, nearestCityId } from "../data/cities";
import { trip } from "../data/loadTrip";

describe("visit status", () => {
  it("compares activity dates against today", () => {
    expect(statusForDate("2026-09-18", "2026-09-19")).toBe("visited");
    expect(statusForDate("2026-09-19", "2026-09-19")).toBe("today");
    expect(statusForDate("2026-09-22", "2026-09-19")).toBe("upcoming");
  });

  it("rolls city status toward the live day", () => {
    expect(rollupStatus(["2026-09-18", "2026-09-19", "2026-09-26"], "2026-09-19")).toBe(
      "today",
    );
    expect(rollupStatus(["2026-09-22"], "2026-09-19")).toBe("upcoming");
  });
});

describe("city assignment", () => {
  it("keeps Asakusa and Aoto in Tokyo", () => {
    expect(nearestCityId(35.7147, 139.7967)).toBe("tokyo");
    expect(nearestCityId(35.7492, 139.8584)).toBe("tokyo");
  });

  it("sends day trips to their own blocks", () => {
    expect(nearestCityId(35.4437, 139.6469)).toBe("yokohama");
    expect(nearestCityId(35.3193, 139.5466)).toBe("kamakura");
    expect(nearestCityId(35.2989, 139.4803)).toBe("enoshima");
    expect(nearestCityId(35.6478, 140.0328)).toBe("chiba");
    expect(nearestCityId(35.6253, 139.2431)).toBe("takao");
    expect(nearestCityId(35.9251, 139.4858)).toBe("kawagoe");
  });

  it("builds a Tokyo plate with lodging and activities", () => {
    const cities = buildCityBlocks(trip, "2026-09-19");
    const tokyo = cities.find((city) => city.id === "tokyo");
    expect(tokyo).toBeTruthy();
    expect(tokyo?.status).toBe("today");
    const asakusa = tokyo?.plates.find((plate) => plate.date === "2026-09-18");
    expect(asakusa?.activities.some((item) => item.name.includes("Senso-ji"))).toBe(true);
    expect(asakusa?.lodging.some((stay) => stay.name.includes("Asakusa"))).toBe(true);
    const todayPlate = tokyo?.plates.find((plate) => plate.date === "2026-09-19");
    expect(todayPlate?.lodging.some((stay) => stay.name.includes("AIRSTAY"))).toBe(true);
    expect(todayPlate?.lodging.some((stay) => stay.name.includes("Asakusa"))).toBe(false);
  });
});
