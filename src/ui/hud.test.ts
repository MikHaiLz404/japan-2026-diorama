import { describe, expect, it } from "vitest";
import { trip } from "../data/loadTrip";
import { renderHudMeta } from "./hud";

function host(): HTMLElement {
  return { textContent: "" } as HTMLElement;
}

describe("HUD meta copy", () => {
  it("uses compact EN/JP for the live day count", () => {
    const el = host();
    renderHudMeta(el, trip, "2026-09-20");
    expect(el.textContent).toContain("Day 4 / 11");
    expect(el.textContent).toContain("ライブ");
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
