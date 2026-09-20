import { describe, expect, it } from "vitest";
import { isMobileLayout, isSmallScreen } from "./platform";

describe("viewport breakpoints", () => {
  it("treats 859px and below as mobile layout (CSS max-width: 859px)", () => {
    expect(isMobileLayout(859)).toBe(true);
    expect(isMobileLayout(860)).toBe(false);
  });

  it("keeps the performance small-screen cutoff at 768px", () => {
    expect(isSmallScreen(767)).toBe(true);
    expect(isSmallScreen(768)).toBe(false);
  });
});
