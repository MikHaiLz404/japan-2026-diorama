import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COPY,
  ariaLabel,
  dayCountLabel,
  jaEn,
  liveDayLabel,
  startsLabel,
  statusShort,
  stayingLabel,
  wrappedLabel,
} from "./copy";

const thai = /[\u0E00-\u0E7F]/;
const uiFiles = [
  new URL("./copy.ts", import.meta.url),
  new URL("./hud.ts", import.meta.url),
  new URL("./sheet.ts", import.meta.url),
  new URL("../../index.html", import.meta.url),
];

describe("bilingual copy helpers", () => {
  it("joins Japanese primary with English secondary", () => {
    expect(jaEn(COPY.tripTray)).toBe("旅トレイ · Trip tray");
    expect(jaEn(COPY.todayPlate)).toBe("今日の日程 · Today's plan");
    expect(jaEn(COPY.todayStops)).toBe("今日のスポット · Today's stops");
    expect(jaEn(COPY.noStops)).toBe("今日のスポットはまだない · No stops today");
    expect(jaEn(COPY.visited)).toBe("行った · Visited");
    expect(COPY.visited.ja).toBe("行った");
    expect(COPY.today.ja).toBe("今日");
    expect(COPY.upcoming.ja).toBe("これから");
    expect(statusShort("visited").ja).toBe("行った");
    expect(statusShort("today").ja).toBe("今日");
    expect(statusShort("upcoming").ja).toBe("これから");
    expect(jaEn(COPY.visited)).not.toContain("訪問済");
    expect(ariaLabel(COPY.reset)).toBe("リセット / Reset");
    expect(ariaLabel(COPY.close)).toBe("閉じる / Close");
    expect(stayingLabel("Asakusa")).toBe("Asakusaに宿泊 · Staying in Asakusa");
    expect(liveDayLabel(4, 11)).toBe("日程 4 / 11 · ライブ");
    expect(dayCountLabel(4, 11)).toBe("日程 4 / 11 · Day 4 / 11");
    expect(startsLabel("Sep 17")).toBe("Starts Sep 17 · 開始");
    expect(wrappedLabel("Sep 27")).toBe("Wrapped Sep 27 · 終了");
  });

  it("keeps UI string modules free of Thai", () => {
    for (const file of uiFiles) {
      const source = readFileSync(file, "utf8");
      expect(source, file.pathname).not.toMatch(thai);
    }
  });
});
