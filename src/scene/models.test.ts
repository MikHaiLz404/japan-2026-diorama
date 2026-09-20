import * as THREE from "three";
import { existsSync, readFileSync } from "node:fs";
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
  isRenderableCityModel,
  meshTopology,
  MIN_CITY_TRIANGLE_VERTEX_RATIO,
  modelFitSize,
  prepareLoadedModel,
  tryLoadGltf,
} from "./models";

/** Mimic tokyo.glb / yokohama.glb: tens of thousands of verts, ~10% as many triangles. */
function sparseCityLikeMesh(vertices = 30_000, triangles = 3_000): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(vertices * 3);
  for (let i = 0; i < vertices; i++) {
    positions[i * 3] = (i % 120) * 0.01;
    positions[i * 3 + 1] = ((Math.floor(i / 120) % 40) * 0.01);
    positions[i * 3 + 2] = (Math.floor(i / 4800) % 80) * 0.01;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const indices = new Uint32Array(triangles * 3);
  for (let i = 0; i < indices.length; i++) indices[i] = i % vertices;
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
}

function catalogGlbTopology(id: string): { vertices: number; triangles: number } | null {
  const file = new URL(`../../public/models/${id}.glb`, import.meta.url).pathname;
  if (!existsSync(file)) return null;
  const data = readFileSync(file);
  if (data.byteLength < 20 || data.toString("ascii", 0, 4) !== "glTF") return null;
  const jsonLength = data.readUInt32LE(12);
  const json = JSON.parse(data.toString("utf8", 20, 20 + jsonLength).replace(/\0+$/, "")) as {
    accessors?: Array<{ count: number }>;
    meshes?: Array<{
      primitives: Array<{ attributes: { POSITION?: number }; indices?: number; mode?: number }>;
    }>;
  };
  let vertices = 0;
  let triangles = 0;
  for (const mesh of json.meshes ?? []) {
    for (const prim of mesh.primitives) {
      const pos = prim.attributes.POSITION;
      if (pos != null) vertices += json.accessors?.[pos]?.count ?? 0;
      const mode = prim.mode ?? 4;
      if (mode !== 4) continue;
      if (prim.indices != null) triangles += Math.floor((json.accessors?.[prim.indices]?.count ?? 0) / 3);
      else if (pos != null) triangles += Math.floor((json.accessors?.[pos]?.count ?? 0) / 3);
    }
  }
  return { vertices, triangles };
}

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

  it("returns null for a 200 payload that is not a glb", async () => {
    const parse = vi.fn();
    const fetchImpl = vi.fn(
      async () =>
        new Response("<!doctype html>", {
          status: 200,
          headers: { "content-type": "application/octet-stream" },
        }),
    );
    await expect(
      tryLoadGltf("/models/tokyo.glb", { fetchImpl: fetchImpl as unknown as typeof fetch, parse }),
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
    const okFetch = vi.fn(
      async () =>
        new Response(new Uint8Array([103, 108, 84, 70, 2, 0, 0, 0, 12, 0, 0, 0]), {
          status: 200,
          headers: { "content-type": "model/gltf-binary" },
        }),
    );
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
    const fetchImpl = vi.fn(
      async () =>
        new Response(new Uint8Array([103, 108, 84, 70, 2, 0, 0, 0, 12, 0, 0, 0]), {
          status: 200,
          headers: { "content-type": "model/gltf-binary" },
        }),
    );
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

describe("city glb topology guard", () => {
  it("accepts a normal mesh (box / dense remesh)", () => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const dense = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3));
    expect(isRenderableCityModel(box)).toBe(true);
    expect(isRenderableCityModel(dense)).toBe(true);
    for (const mesh of [box, dense]) {
      const stats = meshTopology(mesh);
      expect(stats.triangles).toBeGreaterThan(0);
      expect(stats.triangles / stats.vertices).toBeGreaterThan(MIN_CITY_TRIANGLE_VERTEX_RATIO);
    }
  });

  it("rejects tokyo/yokohama-like meshes with far too few triangles", () => {
    const sparse = sparseCityLikeMesh();
    const stats = meshTopology(sparse);
    expect(stats.vertices).toBe(30_000);
    expect(stats.triangles).toBe(3_000);
    expect(stats.triangles / stats.vertices).toBeCloseTo(0.1, 5);
    expect(isRenderableCityModel(sparse)).toBe(false);
  });

  it("rejects empty, point-only, or collapsed geometry", () => {
    expect(isRenderableCityModel(new THREE.Group())).toBe(false);
    expect(isRenderableCityModel(new THREE.Points(new THREE.BufferGeometry()))).toBe(false);

    const emptyMesh = new THREE.Mesh(new THREE.BufferGeometry());
    expect(isRenderableCityModel(emptyMesh)).toBe(false);

    const collapsed = new THREE.BufferGeometry();
    collapsed.setAttribute("position", new THREE.BufferAttribute(new Float32Array(9), 3));
    collapsed.setIndex([0, 1, 2]);
    expect(isRenderableCityModel(new THREE.Mesh(collapsed))).toBe(false);
  });

  it("would skip the committed tokyo/yokohama remeshes and keep the other city glbs", () => {
    const skip = new Set(["tokyo", "yokohama"]);
    let seen = 0;
    for (const id of CITY_MODEL_IDS) {
      const stats = catalogGlbTopology(id);
      if (!stats || stats.vertices <= 0) continue;
      seen += 1;
      const ratio = stats.triangles / stats.vertices;
      if (skip.has(id)) {
        expect(ratio, id).toBeLessThan(MIN_CITY_TRIANGLE_VERTEX_RATIO);
      } else {
        expect(ratio, id).toBeGreaterThan(MIN_CITY_TRIANGLE_VERTEX_RATIO);
      }
    }
    expect(seen).toBe(CITY_MODEL_IDS.length);
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

    let painted = false;
    gltf!.traverse((node) => {
      if (node instanceof THREE.Mesh && node.geometry.getAttribute("color")) painted = true;
    });
    expect(painted).toBe(true);
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

  it("keeps the procedural block when a city glb has unusable topology", async () => {
    const scene = new THREE.Scene();
    scene.add(makeCityBlock(stubCity("tokyo", "lg")));
    scene.add(makeCityBlock(stubCity("kamakura", "md")));
    const sparse = sparseCityLikeMesh();
    const geoSpy = vi.spyOn(sparse.geometry, "dispose");

    await hydrateGltfModels({
      scene,
      cities: [stubCity("tokyo", "lg"), stubCity("kamakura", "md")],
      shadows: false,
      load: async (url) =>
        url.includes("tokyo")
          ? sparse
          : new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()),
    });

    expect(scene.getObjectByName("gltf:tokyo")).toBeFalsy();
    expect(scene.getObjectByName("procedural:tokyo")).toBeTruthy();
    expect(geoSpy).toHaveBeenCalledOnce();
    expect(scene.getObjectByName("gltf:kamakura")).toBeTruthy();
    expect(scene.getObjectByName("procedural:kamakura")).toBeFalsy();
  });
});
