import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { CITY_CATALOG } from "../data/cities";
import type { CityBlock } from "../data/types";
import { isSharedGeometry, makeCityBlock, makeTray } from "./meshes";
import {
  CITY_MODEL_IDS,
  TRAY_MODEL_BOUNDS,
  TRAY_MODEL_URL,
  TRAY_Y_MIN,
  cityModelUrl,
  disposeObject3D,
  fitModelToBox,
  hydrateGltfModels,
  modelFitSize,
  prepareLoadedModel,
  tryLoadGltf,
} from "./models";

function stubCity(id: CityBlock["id"], size: CityBlock["size"] = "sm"): CityBlock {
  return {
    id,
    name: id,
    nameJa: id,
    tray: [0.55, 0.15],
    size,
    landmark: "kura",
    status: "visited",
    dates: [],
    plates: [],
    lodging: [],
    activities: [],
  };
}

describe("gltf model paths", () => {
  it("maps every catalog city to /models/{id}.glb plus optional tray", () => {
    expect(CITY_MODEL_IDS).toEqual(CITY_CATALOG.map((city) => city.id));
    expect(CITY_MODEL_IDS).toEqual([
      "tokyo",
      "yokohama",
      "kamakura",
      "enoshima",
      "chiba",
      "takao",
      "kawagoe",
    ]);
    expect(cityModelUrl("tokyo")).toBe("/models/tokyo.glb");
    expect(TRAY_MODEL_URL).toBe("/models/tray.glb");
  });

  it("fits city models to the existing block footprint", () => {
    expect(modelFitSize("lg")).toMatchObject({ w: 2.35, d: 1.85 });
    expect(modelFitSize("md")).toMatchObject({ w: 1.35, d: 1.15 });
    expect(modelFitSize("sm")).toMatchObject({ w: 1.05, d: 0.92 });
    expect(TRAY_MODEL_BOUNDS).toMatchObject({ w: 11.6, d: 9.4 });
  });
});

describe("tryLoadGltf", () => {
  it("returns null on 404 without parsing", async () => {
    const parse = vi.fn();
    const fetchImpl = vi.fn(async () => new Response(null, { status: 404 }));
    await expect(
      tryLoadGltf("/models/tokyo.glb", { fetchImpl: fetchImpl as unknown as typeof fetch, parse }),
    ).resolves.toBeNull();
    expect(parse).not.toHaveBeenCalled();
  });

  it("returns null for an empty file", async () => {
    const parse = vi.fn();
    const fetchImpl = vi.fn(async () => new Response(new Uint8Array(), { status: 200 }));
    await expect(
      tryLoadGltf("/models/tray.glb", { fetchImpl: fetchImpl as unknown as typeof fetch, parse }),
    ).resolves.toBeNull();
    expect(parse).not.toHaveBeenCalled();
  });

  it("returns null when fetch or parse throws", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network");
    });
    await expect(
      tryLoadGltf("/models/tokyo.glb", { fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).resolves.toBeNull();

    const badParse = vi.fn(async () => {
      throw new Error("invalid glb");
    });
    const okFetch = vi.fn(async () => new Response(new Uint8Array([103, 108, 84, 70]), { status: 200 }));
    await expect(
      tryLoadGltf("/models/tokyo.glb", {
        fetchImpl: okFetch as unknown as typeof fetch,
        parse: badParse,
      }),
    ).resolves.toBeNull();
  });

  it("parses a successful payload", async () => {
    const group = new THREE.Group();
    const parse = vi.fn(async () => group);
    const fetchImpl = vi.fn(async () => new Response(new Uint8Array([103, 108, 84, 70]), { status: 200 }));
    await expect(
      tryLoadGltf("/models/tokyo.glb", { fetchImpl: fetchImpl as unknown as typeof fetch, parse }),
    ).resolves.toBe(group);
    expect(parse).toHaveBeenCalledOnce();
  });
});

describe("fitModelToBox", () => {
  it("centers XZ, sits on y=0, and uniformly scales into the target", () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 6));
    mesh.position.set(10, 5, -7);
    const fitted = fitModelToBox(mesh, { w: 1, d: 3, h: 2 });
    fitted.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(fitted);
    const size = box.getSize(new THREE.Vector3());
    expect(size.x).toBeCloseTo(1, 5);
    expect(size.y).toBeCloseTo(2, 5);
    expect(size.z).toBeCloseTo(3, 5);
    expect(box.min.y).toBeCloseTo(0, 5);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 5);
    expect((box.min.z + box.max.z) / 2).toBeCloseTo(0, 5);
  });
});

describe("disposeObject3D", () => {
  it("disposes unique geometry, materials, and textures", () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const texture = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({ map: texture });
    const mesh = new THREE.Mesh(geometry, material);
    const geoSpy = vi.spyOn(geometry, "dispose");
    const matSpy = vi.spyOn(material, "dispose");
    const texSpy = vi.spyOn(texture, "dispose");
    disposeObject3D(mesh);
    expect(geoSpy).toHaveBeenCalledOnce();
    expect(matSpy).toHaveBeenCalledOnce();
    expect(texSpy).toHaveBeenCalledOnce();
  });

  it("does not dispose shared procedural geometries", () => {
    const city = makeCityBlock(stubCity("tokyo", "lg"));
    const hit = city.getObjectByName("hit:tokyo") as THREE.Mesh;
    expect(isSharedGeometry(hit.geometry)).toBe(true);
    const spy = vi.spyOn(hit.geometry, "dispose");
    disposeObject3D(city);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("prepareLoadedModel", () => {
  it("drops imported lights and caps texture anisotropy", () => {
    const group = new THREE.Group();
    const light = new THREE.PointLight();
    const texture = new THREE.Texture();
    texture.anisotropy = 16;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ map: texture }),
    );
    group.add(light);
    group.add(mesh);
    prepareLoadedModel(group, false);
    expect(light.parent).toBeNull();
    expect(mesh.castShadow).toBe(false);
    expect(mesh.receiveShadow).toBe(true);
    expect(texture.anisotropy).toBe(1);
  });
});

describe("hydrateGltfModels", () => {
  it("keeps procedural meshes when loads fail", async () => {
    const scene = new THREE.Scene();
    const tray = makeTray();
    const tokyo = makeCityBlock(stubCity("tokyo", "lg"));
    scene.add(tray);
    scene.add(tokyo);
    await hydrateGltfModels({
      scene,
      cities: [stubCity("tokyo", "lg")],
      shadows: false,
      load: async () => null,
    });
    expect(scene.getObjectByName("tray")).toBe(tray);
    expect(scene.getObjectByName("procedural:tokyo")).toBeTruthy();
    expect(scene.getObjectByName("gltf:tokyo")).toBeFalsy();
    expect(scene.getObjectByName("hit:tokyo")).toBeTruthy();
  });

  it("replaces the tray and city visuals while keeping the same city slot", async () => {
    const scene = new THREE.Scene();
    const city = stubCity("tokyo", "lg");
    city.tray = [0.55, 0.15];
    const block = makeCityBlock(city);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.2));
    plate.name = "plate:tokyo:2026-09-18";
    plate.userData = { kind: "plate", cityId: "tokyo", date: "2026-09-18" };
    block.add(plate);
    scene.add(makeTray());
    scene.add(block);

    await hydrateGltfModels({
      scene,
      cities: [city],
      shadows: false,
      load: async () => new THREE.Mesh(new THREE.BoxGeometry(4, 2, 4), new THREE.MeshStandardMaterial()),
    });

    expect(scene.getObjectByName("procedural:tokyo")).toBeFalsy();
    const gltf = scene.getObjectByName("gltf:tokyo");
    expect(gltf).toBeTruthy();
    expect(scene.getObjectByName("hit:tokyo")).toBeTruthy();
    expect(scene.getObjectByName("plate:tokyo:2026-09-18")).toBeTruthy();
    const hit = scene.getObjectByName("hit:tokyo") as THREE.Mesh;
    expect((hit.material as THREE.Material).visible).toBe(false);

    const world = new THREE.Vector3();
    gltf!.getWorldPosition(world);
    expect(world.x).toBeCloseTo(0.55, 5);
    expect(world.z).toBeCloseTo(0.15, 5);

    const tray = scene.getObjectByName("tray")!;
    expect(tray.position.y).toBe(TRAY_Y_MIN);
    tray.updateMatrixWorld(true);
    const trayBox = new THREE.Box3().setFromObject(tray);
    const traySize = trayBox.getSize(new THREE.Vector3());
    expect(traySize.x).toBeLessThanOrEqual(TRAY_MODEL_BOUNDS.w + 1e-4);
    expect(traySize.z).toBeLessThanOrEqual(TRAY_MODEL_BOUNDS.d + 1e-4);

    const cityBox = new THREE.Box3().setFromObject(gltf!);
    const citySize = cityBox.getSize(new THREE.Vector3());
    const fit = modelFitSize("lg");
    expect(citySize.x).toBeLessThanOrEqual(fit.w + 1e-4);
    expect(citySize.z).toBeLessThanOrEqual(fit.d + 1e-4);
  });

  it("does not swap after abort", async () => {
    const scene = new THREE.Scene();
    const tray = makeTray();
    scene.add(tray);
    const abort = new AbortController();
    abort.abort();
    await hydrateGltfModels({
      scene,
      cities: [],
      shadows: false,
      signal: abort.signal,
      load: async () => new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)),
    });
    expect(scene.getObjectByName("tray")).toBe(tray);
  });

  it("falls back per city when only some glbs load", async () => {
    const scene = new THREE.Scene();
    scene.add(makeCityBlock(stubCity("tokyo", "lg")));
    scene.add(makeCityBlock(stubCity("yokohama", "md")));
    await hydrateGltfModels({
      scene,
      cities: [stubCity("tokyo", "lg"), stubCity("yokohama", "md")],
      shadows: false,
      load: async (url) =>
        url.includes("tokyo")
          ? new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1))
          : null,
    });
    expect(scene.getObjectByName("gltf:tokyo")).toBeTruthy();
    expect(scene.getObjectByName("procedural:tokyo")).toBeFalsy();
    expect(scene.getObjectByName("gltf:yokohama")).toBeFalsy();
    expect(scene.getObjectByName("procedural:yokohama")).toBeTruthy();
  });
});
