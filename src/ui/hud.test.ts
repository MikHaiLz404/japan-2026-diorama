import { describe, expect, it } from "vitest";
import { buildCityBlocks } from "../data/cities";
import { trip } from "../data/loadTrip";
import { cityOptionLabel, renderCityChips, renderHudMeta } from "./hud";

function host(): HTMLElement {
  return { textContent: "" } as HTMLElement;
}

describe("HUD meta copy", () => {
  it("uses compact JP-first live day count instead of English-only Day X", () => {
    const el = host();
    renderHudMeta(el, trip, "2026-09-20");
    expect(el.textContent).toContain("日程 4 / 11 · ライブ");
    expect(el.textContent).not.toMatch(/Day \d+ of/);
    expect(el.textContent).not.toMatch(/[\u0E00-\u0E7F]/);
  });

  it("keeps the trip date range in the live HUD line", () => {
    const el = host();
    renderHudMeta(el, trip, "2026-09-20");
    expect(el.textContent).toMatch(/Sep 17/);
    expect(el.textContent).toMatch(/Sep 27/);
  });

  it("uses Starts / 開始 and Wrapped / 終了 outside the trip", () => {
    const before = host();
    renderHudMeta(before, trip, "2026-09-01");
    expect(before.textContent).toContain("Starts");
    expect(before.textContent).toContain("開始");
    expect(before.textContent).not.toMatch(/[\u0E00-\u0E7F]/);

    const after = host();
    renderHudMeta(after, trip, "2026-09-30");
    expect(after.textContent).toContain("Wrapped");
    expect(after.textContent).toContain("終了");
    expect(after.textContent).not.toMatch(/[\u0E00-\u0E7F]/);
  });
});

describe("city picker", () => {
  it("renders desktop chips and a mobile select with EN/JP status labels", () => {
    const cities = buildCityBlocks(trip, "2026-09-20");
    const tokyo = cities.find((city) => city.id === "tokyo");
    const yokohama = cities.find((city) => city.id === "yokohama");
    expect(tokyo && yokohama).toBeTruthy();

    const el = { innerHTML: "" } as HTMLElement;
    renderCityChips(el, cities, "tokyo");

    expect(el.innerHTML).toContain('class="city-chips"');
    expect(el.innerHTML).toContain('id="city-select"');
    expect(el.innerHTML).toContain("今日");
    expect(el.innerHTML).toContain("これから");
    expect(cityOptionLabel({ ...tokyo!, status: "visited" })).toContain("行った");
    expect(el.innerHTML).toMatch(/chip status-today is-selected/);
    expect(el.innerHTML).toContain(cityOptionLabel(tokyo!));
    expect(el.innerHTML).toContain(cityOptionLabel(yokohama!));
    expect(el.innerHTML).toMatch(/<option value="tokyo"[^>]*selected/);
    expect(el.innerHTML).not.toMatch(/[\u0E00-\u0E7F]/);
  });
});
