import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { PetalField, SAKURA_LOOK } from "./petals";

describe("sakura style 2 (Liberogic dust)", () => {
  it("keeps tiny untextured specks, not big realistic petals", () => {
    const field = new PetalField(SAKURA_LOOK.desktopCount);
    const material = field.points.material as THREE.PointsMaterial;
    expect(field.points.type).toBe("Points");
    expect(material.map).toBeFalsy();
    expect(material.size).toBeGreaterThan(0);
    expect(material.size).toBeLessThanOrEqual(0.035);
    expect(material.opacity).toBeGreaterThan(0.2);
    expect(material.opacity).toBeLessThanOrEqual(0.55);
    expect(material.depthWrite).toBe(false);
  });

  it("uses fewer particles so they do not cover city blocks, but stays on", () => {
    expect(SAKURA_LOOK.mobileCount).toBeGreaterThan(0);
    expect(SAKURA_LOOK.desktopCount).toBeGreaterThan(SAKURA_LOOK.mobileCount);
    expect(SAKURA_LOOK.mobileCount).toBeLessThanOrEqual(16);
    expect(SAKURA_LOOK.desktopCount).toBeLessThanOrEqual(36);
  });
});
