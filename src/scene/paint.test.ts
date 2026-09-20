import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { hasAlbedoTexture, paintColor, stylizeUntexturedModel } from "./paint";

describe("miniature paint", () => {
  it("detects albedo maps and leaves textured meshes alone", () => {
    const map = new THREE.Texture();
    const textured = new THREE.MeshStandardMaterial({ map });
    expect(hasAlbedoTexture(textured)).toBe(true);
    expect(hasAlbedoTexture(new THREE.MeshStandardMaterial())).toBe(false);

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(geometry, textured);
    stylizeUntexturedModel(mesh, "tokyo");
    expect(geometry.getAttribute("color")).toBeUndefined();
    expect(textured.vertexColors).toBe(false);
  });

  it("paints vertex colors onto an untextured gray remesh", () => {
    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x9ea8b2 });
    const mesh = new THREE.Mesh(geometry, material);
    stylizeUntexturedModel(mesh, "tokyo");

    const colors = geometry.getAttribute("color");
    expect(colors).toBeTruthy();
    expect(colors.count).toBe(geometry.getAttribute("position").count);
    expect(material.vertexColors).toBe(true);
    expect(material.color.getHex()).toBe(0xffffff);

    const unique = new Set<string>();
    for (let i = 0; i < colors.count; i++) {
      unique.add(`${colors.getX(i).toFixed(3)},${colors.getY(i).toFixed(3)},${colors.getZ(i).toFixed(3)}`);
    }
    expect(unique.size).toBeGreaterThan(1);

    const sample = new THREE.Color(colors.getX(0), colors.getY(0), colors.getZ(0));
    const grayish = Math.abs(sample.r - sample.g) < 0.04 && Math.abs(sample.g - sample.b) < 0.04;
    expect(grayish).toBe(false);
  });

  it("uses city-specific roof vs wall hues instead of one gray", () => {
    const roof = paintColor(0.9, 0.95, 0, 0, "tokyo");
    const wall = paintColor(0.45, 0.05, 0.2, 0.1, "tokyo");
    const moss = paintColor(0.05, 0.9, 0, 0, "tokyo");
    expect(roof.getHex()).not.toBe(wall.getHex());
    expect(moss.g).toBeGreaterThan(moss.r);
    expect(roof.r).toBeGreaterThan(roof.b);
  });
});
