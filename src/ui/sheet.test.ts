import { describe, expect, it } from "vitest";
import { buildCityBlocks } from "../data/cities";
import { trip } from "../data/loadTrip";
import { lodgingAreaName, overnightStayLabel, renderSheet, statusLabel } from "./sheet";

describe("EN/JP overlay copy", () => {
  it("maps visit status to Japanese primary with English secondary", () => {
    expect(statusLabel("visited")).toBe("行った · Visited");
    expect(statusLabel("today")).toBe("今日 · Today");
    expect(statusLabel("upcoming")).toBe("これから · Upcoming");
  });

  it("names overnight areas from lodging data", () => {
    const [asakusa, aoto] = trip.lodging;
    expect(lodgingAreaName(asakusa)).toBe("Asakusa");
    expect(lodgingAreaName(aoto)).toBe("Aoto");
    expect(overnightStayLabel(trip, "2026-09-18")).toBe("Asakusaに宿泊 · Staying in Asakusa");
    expect(overnightStayLabel(trip, "2026-09-19")).toBe("Aotoに宿泊 · Staying in Aoto");
    expect(overnightStayLabel(trip)).toBe("Asakusa / Aotoに宿泊 · Staying in Asakusa / Aoto");
  });

  it("titles the activity list as today's stops in EN/JP", () => {
    const tokyo = buildCityBlocks(trip, "2026-09-19").find((city) => city.id === "tokyo");
    expect(tokyo).toBeTruthy();
    const host = { innerHTML: "" } as HTMLElement;
    renderSheet(host, trip, tokyo!, { cityId: "tokyo", date: "2026-09-18" });
    expect(host.innerHTML).toContain("今日のスポット");
    expect(host.innerHTML).toContain("Today's stops");
    expect(host.innerHTML).toContain("宿泊 · Lodging");
    expect(host.innerHTML).not.toContain("บนแผ่นนี้");
    expect(host.innerHTML).not.toContain("On this plate");
  });

  it("marks day tabs and the kicker with visit status so today can keep the only accent", () => {
    const tokyo = buildCityBlocks(trip, "2026-09-20").find((city) => city.id === "tokyo");
    const yokohama = buildCityBlocks(trip, "2026-09-20").find((city) => city.id === "yokohama");
    expect(tokyo && yokohama).toBeTruthy();
    const host = { innerHTML: "" } as HTMLElement;
    renderSheet(host, trip, tokyo!, { cityId: "tokyo", date: "2026-09-20" });
    expect(host.innerHTML).toMatch(/sheet-kicker status-today/);
    expect(host.innerHTML).toMatch(/day-tab status-today is-active/);
    expect(host.innerHTML).toMatch(/day-tab status-visited"/);

    renderSheet(host, trip, yokohama!, { cityId: "yokohama", date: "2026-09-22" });
    expect(host.innerHTML).toMatch(/sheet-kicker status-upcoming/);
    expect(host.innerHTML).toMatch(/day-tab status-upcoming is-active/);
  });
});
