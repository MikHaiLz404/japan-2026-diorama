import { describe, expect, it } from "vitest";
import { trip } from "../data/loadTrip";
import { renderHudMeta } from "./hud";

function host(): HTMLElement {
  return { textContent: "" } as HTMLElement;
}

describe("HUD meta copy", () => {
  it("uses short Thai for the live day count instead of English Day X of Y", () => {
    const el = host();
    renderHudMeta(el, trip, "2026-09-20");
    expect(el.textContent).toContain("วันที่ 4 / 11");
    expect(el.textContent).toContain("สด");
    expect(el.textContent).not.toMatch(/Day \d+ of/);
    expect(el.textContent).not.toContain("live");
  });

  it("keeps the trip date range in the live HUD line", () => {
    const el = host();
    renderHudMeta(el, trip, "2026-09-20");
    expect(el.textContent).toMatch(/Sep 17/);
    expect(el.textContent).toMatch(/Sep 27/);
  });
});
