import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { makeDecor } from "./decor";
import { extractPropAsset, loadPropAssets, PROP_IDS } from "./props";

const layout = {
  cities: [
    { x: 0.55, z: 0.15, size: "lg" as const },
    { x: -0.55, z: -1.85, size: "md" as const },
    { x: 3.15, z: 0.35, size: "md" as const },
  ],
  routes: [[0.55, 0.15, -0.55, -1.85]] as Array<[number, number, number, number]>,
  origin: { x: -4.35, z: 2.55 },
  small: false,
};

function fakeGlb(): THREE.Object3D {
  const root = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2), new THREE.MeshStandardMaterial());
  mesh.position.set(5, 7, -3);
  root.add(mesh);
  return root;
}

describe("extractPropAsset", () => {
  it("bakes the first mesh to unit size, centred on XZ and resting on y=0", () => {
    const asset = extractPropAsset(fakeGlb());
    expect(asset).not.toBeNull();
    const box = asset!.geometry.boundingBox!;
    const size = box.getSize(new THREE.Vector3());
    expect(Math.max(size.x, size.y, size.z)).toBeCloseTo(1, 5);
    expect(box.min.y).toBeCloseTo(0, 5);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 5);
    expect((box.min.z + box.max.z) / 2).toBeCloseTo(0, 5);
  });

  it("returns null when the model has no mesh", () => {
    expect(extractPropAsset(new THREE.Group())).toBeNull();
  });
});

describe("loadPropAssets", () => {
  it("skips props that fail to load and keeps the rest", async () => {
    const assets = await loadPropAssets({
      load: async (url) => (url.endsWith("/pine.glb") ? fakeGlb() : null),
    });
    expect(Object.keys(assets)).toEqual(["pine"]);
  });

  it("knows every prop id", () => {
    expect(PROP_IDS).toContain("shrine");
  });
});

describe("makeDecor", () => {
  it("builds procedural set dressing with nothing pickable-looking at the city centres", () => {
    const decor = makeDecor(layout);
    expect(decor.group.name).toBe("decor");
    let meshes = 0;
    decor.group.traverse((n) => {
      if (n instanceof THREE.Mesh) meshes += 1;
    });
    expect(meshes).toBeGreaterThan(20);
    expect(() => decor.update(1.2, 0.016)).not.toThrow();
  });

  it("swaps in Tripo props and keeps animating", () => {
    const decor = makeDecor(layout);
    const asset = extractPropAsset(fakeGlb())!;
    decor.useProps({ pine: asset, sailboat: asset, shrine: asset, fuji: asset, bridge: asset, lantern: asset, sakura: asset });
    let usesAsset = 0;
    decor.group.traverse((n) => {
      if (n instanceof THREE.Mesh && n.geometry === asset.geometry) usesAsset += 1;
    });
    expect(usesAsset).toBeGreaterThan(5);
    expect(() => decor.update(3, 0.016)).not.toThrow();
  });
});
