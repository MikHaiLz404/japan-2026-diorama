import { describe, expect, it } from "vitest";
import { eachDateKey, toDateKey, todayKey } from "./dates";

describe("dates", () => {
  it("converts UTC timestamps into Tokyo calendar days", () => {
    expect(toDateKey("2026-09-17T22:15:01Z", "Asia/Tokyo")).toBe("2026-09-18");
    expect(toDateKey("2026-09-18T01:10:24Z", "Asia/Tokyo")).toBe("2026-09-18");
    expect(toDateKey("2026-09-17", "Asia/Tokyo")).toBe("2026-09-17");
  });

  it("formats today in the trip timezone", () => {
    expect(todayKey(new Date("2026-09-19T03:00:00Z"), "Asia/Tokyo")).toBe("2026-09-19");
  });

  it("walks inclusive date ranges", () => {
    expect(eachDateKey("2026-09-17", "2026-09-27")).toHaveLength(11);
  });
});
