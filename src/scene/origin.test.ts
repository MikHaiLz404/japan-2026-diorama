import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { ORIGIN_TOKEN } from "../data/cities";
import { makeOriginToken } from "./meshes";
import { loadOriginModel } from "./models";

function sceneWithToken(): { scene: THREE.Scene; token: THREE.Group } {
  const scene = new THREE.Scene();
  const token = makeOriginToken();
  scene.add(token);
  return { scene, token };
}

describe("origin airport token (Suvarnabhumi)", () => {
  it("sits at the Bangkok tray slot and draws a procedural airport", () => {
    const { token } = sceneWithToken();
    expect(token.name).toBe(`origin:${ORIGIN_TOKEN.id}`);
    expect(token.position.x).toBeCloseTo(ORIGIN_TOKEN.tray[0]);
    expect(token.position.z).toBeCloseTo(ORIGIN_TOKEN.tray[1]);
    const visuals = token.getObjectByName(`procedural:${ORIGIN_TOKEN.id}`);
    expect(visuals?.children.length).toBeGreaterThan(4);
  });

  it("swaps in bangkok.glb when it loads", async () => {
    const { scene, token } = sceneWithToken();
    const urls: string[] = [];
    await loadOriginModel({
      scene,
      shadows: false,
      load: async (url) => {
        urls.push(url);
        return new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2), new THREE.MeshStandardMaterial());
      },
    });
    expect(urls).toEqual(["/models/bangkok.glb"]);
    expect(token.getObjectByName(`gltf:${ORIGIN_TOKEN.id}`)).toBeTruthy();
    expect(token.getObjectByName(`procedural:${ORIGIN_TOKEN.id}`)).toBeUndefined();
  });

  it("keeps the procedural token when the model is missing", async () => {
    const { scene, token } = sceneWithToken();
    await loadOriginModel({ scene, shadows: false, load: async () => null });
    expect(token.getObjectByName(`procedural:${ORIGIN_TOKEN.id}`)).toBeTruthy();
    expect(token.getObjectByName(`gltf:${ORIGIN_TOKEN.id}`)).toBeUndefined();
  });
});
