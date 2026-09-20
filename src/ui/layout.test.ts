import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const diorama = readFileSync(new URL("../scene/diorama.ts", import.meta.url), "utf8");

function firstRule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  if (!match) throw new Error(`missing CSS rule for ${selector}`);
  return match[1];
}

function token(name: string): string {
  const match = css.match(new RegExp(`${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`missing CSS token ${name}`);
  return match[1].trim();
}

function hexRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`expected 6-digit hex, got ${hex}`);
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  };
}

function isGray(hex: string): boolean {
  const { r, g, b } = hexRgb(hex);
  return Math.abs(r - g) < 24 && Math.abs(g - b) < 24 && Math.abs(r - b) < 24;
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

describe("Liberogic / Vodka chrome design system", () => {
  it("uses a light cream canvas with a light color-scheme, not the old wood-brown page", () => {
    expect(firstRule(":root")).toMatch(/color-scheme:\s*light/);
    expect(css).not.toMatch(/--wood-soft/);
    expect(firstRule("body")).not.toMatch(/#2b1d14/);
    const canvas = hexRgb(token("--canvas"));
    expect((canvas.r + canvas.g + canvas.b) / 3).toBeGreaterThan(220);
  });

  it("sets today as the single navy/indigo accent and visited/upcoming to gray only", () => {
    expect(token("--today")).toBe(token("--accent"));
    expect(isGray(token("--visited"))).toBe(true);
    expect(isGray(token("--upcoming"))).toBe(true);
    const accent = hexRgb(token("--accent"));
    expect(accent.b).toBeGreaterThan(accent.r);
    expect(accent.r).toBeLessThan(80);
    expect(css).not.toMatch(/--visited:\s*#d56b48/);
  });

  it("keeps HUD thin translucent white with sharp black type and a JP/Thai stack", () => {
    const title = firstRule(".hud-title");
    expect(title).toMatch(/rgba\(\s*255\s*,\s*255\s*,\s*255/);
    expect(title).toMatch(/backdrop-filter:\s*blur\(/);
    expect(firstRule("body")).toMatch(/Noto Sans JP/);
    expect(firstRule("body")).toMatch(/Noto Sans Thai/);
    expect(html).toMatch(/Noto\+Sans\+JP/);
    expect(html).toMatch(/Noto\+Sans\+Thai/);
    expect(html).toMatch(/Shippori\+Mincho/);
    expect(css).toMatch(/font-family:\s*"Shippori Mincho"/);
  });

  it("fills chips and the sheet with white plus thin borders, not dark wood chrome", () => {
    const chip = firstRule(".chip");
    const sheet = firstRule(".sheet");
    expect(chip).toMatch(/background:\s*(#fff(?:fff)?|var\(--paper\))/i);
    expect(chip).toMatch(/border:\s*1px solid/);
    expect(sheet).toMatch(/background:\s*(#fff(?:fff)?|var\(--paper\))/i);
    expect(chip).not.toMatch(/wood/);
    expect(sheet).not.toMatch(/#3d2a1c/);
  });

  it("sizes chip tap targets to at least 44px", () => {
    const chip = firstRule(".chip");
    const minHeight = chip.match(/min-height:\s*(\d+)px/);
    expect(minHeight).toBeTruthy();
    expect(Number(minHeight![1])).toBeGreaterThanOrEqual(44);
  });

  it("insets HUD and chips for notch safe-areas on all four edges", () => {
    expect(token("--safe-top")).toMatch(/safe-area-inset-top/);
    expect(token("--safe-bottom")).toMatch(/safe-area-inset-bottom/);
    expect(token("--safe-left")).toMatch(/safe-area-inset-left/);
    expect(token("--safe-right")).toMatch(/safe-area-inset-right/);
    const hud = firstRule(".hud");
    expect(hud).toMatch(/var\(--safe-top\)/);
    expect(hud).toMatch(/var\(--safe-left\)/);
    expect(hud).toMatch(/var\(--safe-right\)/);
    const chips = firstRule(".city-chips");
    expect(chips).toMatch(/var\(--safe-bottom\)/);
    expect(chips).toMatch(/var\(--safe-left\)/);
    expect(chips).toMatch(/var\(--safe-right\)/);
  });

  it("keeps the navy accent on today only, not on every selected chip or kicker", () => {
    expect(firstRule(".chip.status-today")).toMatch(/var\(--today\)/);
    expect(firstRule(".chip.is-selected")).not.toMatch(/var\(--accent\)|--today/);
    expect(firstRule(".sheet-kicker")).not.toMatch(/var\(--accent\)|--today/);
    expect(firstRule(".sheet-kicker.status-today")).toMatch(/var\(--(accent|today)\)/);
  });

  it("softens the WebGL clear color onto the cream canvas without touching the GLTF loader", () => {
    expect(diorama).toMatch(/setClearColor\(\s*0xf[0-9a-f]{5}/i);
    expect(diorama).not.toMatch(/setClearColor\(\s*0x2b1d14/);
    expect(diorama).toMatch(/hydrateGltfModels/);
    expect(diorama).toMatch(/shadowMap\.enabled\s*=\s*!small/);
  });
});
