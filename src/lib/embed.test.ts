import { describe, expect, it } from "vitest";
import { isEmbedMode, standaloneUrl } from "./embed";

describe("isEmbedMode", () => {
  it("treats embed=1 and embed=true as embed", () => {
    expect(isEmbedMode("?embed=1", false)).toBe(true);
    expect(isEmbedMode("?embed=true", false)).toBe(true);
  });

  it("lets embed=0 / false force standalone even when framed", () => {
    expect(isEmbedMode("?embed=0", true)).toBe(false);
    expect(isEmbedMode("?embed=false", true)).toBe(false);
  });

  it("detects cross-origin iframe when flag omitted", () => {
    expect(isEmbedMode("", true)).toBe(true);
    expect(isEmbedMode("", false)).toBe(false);
  });
});

describe("standaloneUrl", () => {
  it("strips the embed query param", () => {
    expect(standaloneUrl("https://japan-2026-diorama.vercel.app/?embed=1")).toBe(
      "https://japan-2026-diorama.vercel.app/",
    );
  });
});
