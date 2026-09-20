import * as THREE from "three";
import { CITY_CATALOG } from "../data/cities";
import type { CityBlock } from "../data/types";
import { isSharedGeometry, platformSize } from "./meshes";
import { stylizeUntexturedModel } from "./paint";

/** Catalog city ids → `/models/{id}.glb`. */
export const CITY_MODEL_IDS = CITY_CATALOG.map((city) => city.id);

/** Wooden-base footprint the procedural tray uses (see `makeTray`). */
export const TRAY_MODEL_BOUNDS = { w: 11.6, d: 9.4, h: 0.7 } as const;

/** World Y of the procedural table underside; loaded trays sit here. */
export const TRAY_Y_MIN = -0.58;

export const TRAY_MODEL_URL = "/models/tray.glb";

/**
 * Unindexed triangle soup is ~1/3; Three `BoxGeometry` is ~0.5; healthy remeshed
 * cities are ~2 triangles/vertex. Corrupt tokyo/yokohama GLBs are ~0.1 and render
 * as scattered points, so anything far below this floor is rejected.
 */
export const MIN_CITY_TRIANGLE_VERTEX_RATIO = 0.25;

const GLB_MAGIC = "glTF";

type GltfLoader = InstanceType<typeof import("three/addons/loaders/GLTFLoader.js").GLTFLoader>;
let gltfLoader: GltfLoader | undefined;

function isGlbBuffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 12) return false;
  const magic = new TextDecoder().decode(new Uint8Array(buffer, 0, 4));
  return magic === GLB_MAGIC;
}

export type GltfLoadFn = (
  url: string,
  options?: { signal?: AbortSignal },
) => Promise<THREE.Object3D | null>;

export function cityModelUrl(cityId: string): string {
  return `/models/${cityId}.glb`;
}

export type MeshTopology = {
  vertices: number;
  triangles: number;
};

function geometryTriangleCount(geometry: THREE.BufferGeometry): number {
  const position = geometry.getAttribute("position");
  if (!position || position.count <= 0) return 0;
  const drawStart = geometry.drawRange.start;
  const drawCount = geometry.drawRange.count;
  const indexed = geometry.index;
  const total = indexed ? indexed.count : position.count;
  const available = Math.max(total - drawStart, 0);
  const count = Number.isFinite(drawCount) ? Math.min(drawCount, available) : available;
  return Math.floor(Math.max(count, 0) / 3);
}

/** Vertex / triangle totals for Mesh nodes (Points and Lines are ignored). */
export function meshTopology(root: THREE.Object3D): MeshTopology {
  let vertices = 0;
  let triangles = 0;
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const position = node.geometry.getAttribute("position");
    if (position) vertices += position.count;
    triangles += geometryTriangleCount(node.geometry);
  });
  return { vertices, triangles };
}

/**
 * True when a city GLB can replace the procedural block. Rejects empty scenes,
 * collapsed bounds, and meshes whose triangle count is far too low vs vertices
 * (the tokyo.glb / yokohama.glb remesh failure).
 */
export function isRenderableCityModel(root: THREE.Object3D): boolean {
  const { vertices, triangles } = meshTopology(root);
  if (vertices <= 0 || triangles <= 0) return false;
  if (triangles / vertices < MIN_CITY_TRIANGLE_VERTEX_RATIO) return false;

  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) return false;
  const size = box.getSize(new THREE.Vector3());
  if (![size.x, size.y, size.z].every(Number.isFinite)) return false;
  if (size.x < 1e-6 && size.y < 1e-6 && size.z < 1e-6) return false;
  return true;
}

/** Target box for a city glb — same layout footprint as the procedural block. */
export function modelFitSize(size: CityBlock["size"]): { w: number; d: number; h: number } {
  const { w, d } = platformSize(size);
  const h = size === "lg" ? 1.45 : size === "md" ? 0.92 : 0.72;
  return { w, d, h };
}

const MAP_KEYS = [
  "map",
  "normalMap",
  "roughnessMap",
  "metalnessMap",
  "aoMap",
  "emissiveMap",
  "bumpMap",
  "displacementMap",
  "alphaMap",
  "envMap",
  "lightMap",
  "clearcoatMap",
  "clearcoatNormalMap",
  "clearcoatRoughnessMap",
  "sheenColorMap",
  "sheenRoughnessMap",
  "specularMap",
  "specularIntensityMap",
  "specularColorMap",
  "transmissionMap",
  "thicknessMap",
] as const;

function disposeTexture(texture: THREE.Texture): void {
  const image = texture.image as { close?: () => void } | undefined;
  image?.close?.();
  texture.dispose();
}

function disposeMaterial(material: THREE.Material): void {
  const record = material as THREE.Material & Record<string, unknown>;
  for (const key of MAP_KEYS) {
    const value = record[key];
    if (value instanceof THREE.Texture) disposeTexture(value);
  }
  material.dispose();
}

/** Release GPU resources. Shared procedural geometries in `meshes.ts` are left intact. */
export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (
      node instanceof THREE.Mesh ||
      node instanceof THREE.Points ||
      node instanceof THREE.Line ||
      node instanceof THREE.Sprite
    ) {
      if (node.geometry && !isSharedGeometry(node.geometry)) {
        node.geometry.dispose();
      }
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of materials) {
        if (material) disposeMaterial(material);
      }
    }
  });
}

export async function tryLoadGltf(
  url: string,
  options: {
    signal?: AbortSignal;
    fetchImpl?: typeof fetch;
    parse?: (buffer: ArrayBuffer, path: string) => Promise<THREE.Object3D>;
  } = {},
): Promise<THREE.Object3D | null> {
  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    if (options.signal?.aborted) return null;
    const response = await fetchImpl(url, { signal: options.signal });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) return null;
    const buffer = await response.arrayBuffer();
    if (options.signal?.aborted || !isGlbBuffer(buffer)) return null;
    const slash = url.lastIndexOf("/");
    const path = slash >= 0 ? url.slice(0, slash + 1) : "/";
    if (options.parse) return await options.parse(buffer, path);
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    gltfLoader ??= new GLTFLoader();
    const gltf = await gltfLoader.parseAsync(buffer, path);
    return gltf.scene;
  } catch {
    return null;
  }
}

/**
 * Wrap `model`, sit its bbox on y = 0, center XZ, and uniformly scale to fit `target`.
 */
export function fitModelToBox(
  model: THREE.Object3D,
  target: { w: number; d: number; h?: number },
): THREE.Group {
  const wrapper = new THREE.Group();
  wrapper.add(model);
  wrapper.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(model);
  if (box.isEmpty()) return wrapper;

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.y -= box.min.y;
  model.position.z -= center.z;

  const sx = size.x > 1e-8 ? target.w / size.x : Number.POSITIVE_INFINITY;
  const sz = size.z > 1e-8 ? target.d / size.z : Number.POSITIVE_INFINITY;
  const sy = target.h && size.y > 1e-8 ? target.h / size.y : Number.POSITIVE_INFINITY;
  const scale = Math.min(sx, sz, sy);
  wrapper.scale.setScalar(Number.isFinite(scale) && scale > 0 ? scale : 1);
  return wrapper;
}

export function prepareLoadedModel(root: THREE.Object3D, shadows: boolean): void {
  const drop: THREE.Object3D[] = [];
  root.traverse((node) => {
    if (node instanceof THREE.Light || node instanceof THREE.Camera) {
      drop.push(node);
      return;
    }
    node.frustumCulled = true;
    if (node instanceof THREE.Mesh) {
      node.castShadow = shadows;
      node.receiveShadow = true;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of materials) {
        const map = (material as THREE.MeshStandardMaterial).map;
        if (map) map.anisotropy = 1;
      }
    }
  });
  for (const node of drop) node.removeFromParent();
}

function hideHitMaterial(hit: THREE.Object3D | undefined): void {
  if (!(hit instanceof THREE.Mesh)) return;
  const materials = Array.isArray(hit.material) ? hit.material : [hit.material];
  for (const material of materials) {
    if (material) material.visible = false;
  }
}

async function loadIfActive(
  load: GltfLoadFn,
  url: string,
  signal?: AbortSignal,
): Promise<THREE.Object3D | null> {
  if (signal?.aborted) return null;
  const loaded = await load(url, { signal });
  if (signal?.aborted) {
    if (loaded) disposeObject3D(loaded);
    return null;
  }
  return loaded;
}

export async function hydrateGltfModels(options: {
  scene: THREE.Scene;
  cities: Array<Pick<CityBlock, "id" | "size">>;
  shadows: boolean;
  signal?: AbortSignal;
  load?: GltfLoadFn;
}): Promise<void> {
  const load = options.load ?? tryLoadGltf;
  const { scene, cities, shadows, signal } = options;

  try {
    const trayModel = await loadIfActive(load, TRAY_MODEL_URL, signal);
    if (trayModel) {
      const fitted = fitModelToBox(trayModel, TRAY_MODEL_BOUNDS);
      fitted.name = "tray";
      fitted.position.y = TRAY_Y_MIN;
      prepareLoadedModel(fitted, shadows);
      stylizeUntexturedModel(fitted, "tray");
      if (signal?.aborted) {
        disposeObject3D(fitted);
      } else {
        const previous = scene.getObjectByName("tray");
        if (previous) {
          scene.remove(previous);
          disposeObject3D(previous);
        }
        scene.add(fitted);
      }
    }
  } catch {
    // Keep the procedural tray.
  }

  await Promise.all(
    cities.map(async (city) => {
      try {
        const loaded = await loadIfActive(load, cityModelUrl(city.id), signal);
        if (!loaded) return;
        if (!isRenderableCityModel(loaded)) {
          disposeObject3D(loaded);
          return;
        }
        const fitted = fitModelToBox(loaded, modelFitSize(city.size));
        fitted.name = `gltf:${city.id}`;
        prepareLoadedModel(fitted, shadows);
        stylizeUntexturedModel(fitted, city.id);
        const block = scene.getObjectByName(`city:${city.id}`);
        if (!block || signal?.aborted) {
          disposeObject3D(fitted);
          return;
        }
        const procedural = block.getObjectByName(`procedural:${city.id}`);
        if (procedural) {
          block.remove(procedural);
          disposeObject3D(procedural);
        }
        hideHitMaterial(block.getObjectByName(`hit:${city.id}`));
        block.add(fitted);
      } catch {
        // Keep this city's procedural mesh.
      }
    }),
  );
}
