import { describe, expect, it } from "vitest";
import { SCENE_LOOK } from "./look";

function luminance(hex: number): number {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return (r + g + b) / 3;
}

describe("Liberogic scene look", () => {
  it("keeps a cream clear color and lifts the lights off the old dim tray", () => {
    expect(SCENE_LOOK.clearColor).toBe(0xf3f0ea);
    expect(luminance(SCENE_LOOK.clearColor)).toBeGreaterThan(220);
    expect(SCENE_LOOK.exposure).toBeGreaterThan(1.1);
    expect(SCENE_LOOK.hemiIntensity).toBeGreaterThan(1.1);
    expect(SCENE_LOOK.ambientIntensity).toBeGreaterThan(0.3);
    expect(SCENE_LOOK.keyIntensity).toBeGreaterThan(0.85);
    expect(SCENE_LOOK.fillIntensity).toBeGreaterThan(0.5);
    expect(SCENE_LOOK.fogNear).toBeGreaterThan(30);
    expect(SCENE_LOOK.fogFar).toBeGreaterThan(SCENE_LOOK.fogNear);
  });
});
