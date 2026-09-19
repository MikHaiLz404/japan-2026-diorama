import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");

function firstRule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  if (!match) throw new Error(`missing CSS rule for ${selector}`);
  return match[1];
}

describe("mobile chrome overflow containment", () => {
  it("clips document-level horizontal overflow on the shell", () => {
    expect(css).toMatch(/html[\s\S]*overflow-x:\s*(clip|hidden)/);
    expect(firstRule("#app")).toMatch(/overflow-x:\s*(clip|hidden)/);
    expect(firstRule("#app")).toMatch(/max-width:\s*100%/);
  });

  it("wraps city chips instead of widening the page with a row scroller", () => {
    const chips = firstRule(".city-chips");
    expect(chips).toMatch(/flex-wrap:\s*wrap/);
    expect(chips).toMatch(/max-width:\s*100%/);
    expect(chips).not.toMatch(/overflow-x:\s*auto/);
    expect(chips).toMatch(/overscroll-behavior-x:\s*contain/);
  });

  it("wraps day tabs inside the sheet without a horizontal menu scroller", () => {
    const tabs = firstRule(".day-tabs");
    expect(tabs).toMatch(/flex-wrap:\s*wrap/);
    expect(tabs).toMatch(/max-width:\s*100%/);
    expect(tabs).not.toMatch(/overflow-x:\s*auto/);
    expect(tabs).toMatch(/overscroll-behavior-x:\s*contain/);
  });

  it("keeps the sheet within the viewport and vertical-scroll only", () => {
    const sheet = firstRule(".sheet");
    expect(sheet).toMatch(/max-width:\s*100%/);
    expect(sheet).toMatch(/overflow-x:\s*(clip|hidden)/);
    expect(sheet).toMatch(/overflow-y:\s*auto/);
  });

  it("preserves one-finger orbit on the canvas", () => {
    expect(firstRule("#stage canvas")).toMatch(/touch-action:\s*none/);
  });

  it("pins the HUD title and มุมถาด cluster to opposite screen corners", () => {
    expect(firstRule(".hud")).not.toMatch(/overflow-x:\s*auto/);
    expect(firstRule(".hud")).not.toMatch(/flex-wrap:\s*wrap/);
    const title = firstRule(".hud-title");
    expect(title).toMatch(/position:\s*absolute/);
    expect(title).toMatch(/left:\s*0/);
    const tools = firstRule(".hud-tools");
    expect(tools).toMatch(/position:\s*absolute/);
    expect(tools).toMatch(/right:\s*0/);
    expect(tools).toMatch(/flex-wrap:\s*nowrap/);
  });
});
