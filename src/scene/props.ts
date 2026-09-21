import * as THREE from "three";
import { tryLoadGltf, type GltfLoadFn } from "./models";

/** Tripo-generated set-dressing props → `/models/props/{id}.glb`. Each is optional. */
export const PROP_IDS = ["fuji", "pine", "sakura", "sailboat", "lantern", "bridge", "shrine"] as const;
export type PropId = (typeof PROP_IDS)[number];

export interface PropAsset {
  /** Baked to unit size: largest dimension = 1, centred on XZ, sitting on y = 0. */
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

export type PropAssets = Partial<Record<PropId, PropAsset>>;

export function propUrl(id: PropId): string {
  return `/models/props/${id}.glb`;
}

/** Pull the first mesh out of a loaded GLB and bake it to a unit-sized geometry. */
export function extractPropAsset(root: THREE.Object3D): PropAsset | null {
  root.updateMatrixWorld(true);
  let found: THREE.Mesh | null = null;
  root.traverse((node) => {
    if (!found && node instanceof THREE.Mesh && node.geometry.getAttribute("position")) found = node;
  });
  const source = found as THREE.Mesh | null;
  if (!source) return null;

  const geometry = source.geometry.clone();
  geometry.applyMatrix4(source.matrixWorld);
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box || box.isEmpty()) {
    geometry.dispose();
    return null;
  }
  const size = box.getSize(new THREE.Vector3());
  const longest = Math.max(size.x, size.y, size.z);
  if (!(longest > 1e-8)) {
    geometry.dispose();
    return null;
  }
  const center = box.getCenter(new THREE.Vector3());
  geometry.translate(-center.x, -box.min.y, -center.z);
  geometry.scale(1 / longest, 1 / longest, 1 / longest);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const material = Array.isArray(source.material) ? source.material[0] : source.material;
  if (!material) {
    geometry.dispose();
    return null;
  }
  return { geometry, material };
}

/** Load every prop that exists; missing or unreadable files are simply skipped. */
export async function loadPropAssets(
  options: { signal?: AbortSignal; load?: GltfLoadFn } = {},
): Promise<PropAssets> {
  const load = options.load ?? tryLoadGltf;
  const assets: PropAssets = {};
  await Promise.all(
    PROP_IDS.map(async (id) => {
      try {
        const root = await load(propUrl(id), { signal: options.signal });
        if (!root) return;
        const asset = extractPropAsset(root);
        if (asset) assets[id] = asset;
      } catch {
        /* keep the procedural stand-in */
      }
    }),
  );
  return assets;
}
