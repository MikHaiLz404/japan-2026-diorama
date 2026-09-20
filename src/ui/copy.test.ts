import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COPY,
  ariaLabel,
  dayCountLabel,
  jaEn,
  liveDayLabel,
  startsLabel,
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
    expect(jaEn(COPY.todayStops)).toBe("今日のスポット · Today's stops");
    expect(jaEn(COPY.noStops)).toBe("今日のスポットはまだない · No stops today");
    expect(ariaLabel(COPY.reset)).toBe("リセット / Reset");
    expect(ariaLabel(COPY.close)).toBe("閉じる / Close");
    expect(stayingLabel("Asakusa")).toBe("Asakusaに宿泊 · Staying in Asakusa");
    expect(liveDayLabel(4, 11)).toBe("Day 4 / 11 · ライブ");
    expect(dayCountLabel(4, 11)).toBe("Day 4 / 11");
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
