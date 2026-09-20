import * as THREE from "three";
import { palette } from "./palette";

export type MiniatureKind = "tray" | "tokyo" | "yokohama" | "kamakura" | "enoshima" | "chiba" | "takao" | "kawagoe" | string;

type MiniaturePalette = {
  wall: number;
  roof: number;
  ground: number;
  wood: number;
  accent: number;
};

const DEFAULT_CITY: MiniaturePalette = {
  wall: palette.ceramic,
  roof: palette.roof,
  ground: palette.moss,
  wood: palette.wood,
  accent: palette.brass,
};

const CITY_PAINT: Record<string, MiniaturePalette> = {
  tokyo: { wall: 0xf4e7d2, roof: 0x8b3a2a, ground: 0x73825a, wood: 0x8a5a38, accent: 0x2a3a66 },
  yokohama: { wall: 0xf0e2cc, roof: 0x7c332c, ground: 0x6e7d55, wood: 0x8a5a38, accent: 0xc4a15a },
  kamakura: { wall: 0xf6ead8, roof: 0xa03a28, ground: 0x6f7d52, wood: 0x7a4e30, accent: 0xc45a3a },
  enoshima: { wall: 0xd8cbb4, roof: 0x8b3a2a, ground: 0xc4b089, wood: 0x6e5340, accent: 0x7ea8b0 },
  chiba: { wall: 0xf2e4cf, roof: 0x6d3a32, ground: 0x73825a, wood: 0x8a5a38, accent: 0xc4a15a },
  takao: { wall: 0xc5c4a2, roof: 0x4a5a38, ground: 0x3f5a38, wood: 0x6a4a32, accent: 0x8a9a62 },
  kawagoe: { wall: 0xf3e6d4, roof: 0x4a3228, ground: 0x6e7a50, wood: 0x5c3a24, accent: 0xc08a54 },
  tray: { wall: palette.wood, roof: palette.woodRim, ground: palette.moss, wood: palette.wood, accent: palette.sand },
};

const MAP_KEYS = ["map", "emissiveMap", "lightMap"] as const;

export function hasAlbedoTexture(material: THREE.Material): boolean {
  const record = material as THREE.Material & Record<string, unknown>;
  return MAP_KEYS.some((key) => record[key] instanceof THREE.Texture);
}

export function paletteForKind(kind: MiniatureKind): MiniaturePalette {
  return CITY_PAINT[kind] ?? DEFAULT_CITY;
}

function stroke(x: number, z: number): number {
  return (Math.sin(x * 13.7 + z * 9.1) + Math.sin(x * 3.3 - z * 5.8)) * 0.035;
}

function mixHex(target: THREE.Color, hex: number, amount: number): void {
  target.lerp(new THREE.Color(hex), amount);
}

/** Height + slope heuristic that reads as a painted ceramic miniature. */
export function paintColor(
  y01: number,
  ny: number,
  x: number,
  z: number,
  kind: MiniatureKind,
  out = new THREE.Color(),
): THREE.Color {
  const swatch = paletteForKind(kind);
  const up = THREE.MathUtils.clamp(ny, -1, 1);
  const roofish = up > 0.52 && y01 > 0.28;
  const groundish = up > 0.42 && y01 < 0.16;
  const under = up < -0.35;
  const base = y01 < 0.22 && Math.abs(up) < 0.55;

  if (kind === "tray") {
    if (groundish || (up > 0.7 && y01 < 0.55)) out.setHex(swatch.ground);
    else if (y01 > 0.72) out.setHex(swatch.roof);
    else out.setHex(swatch.wood);
  } else if (roofish) {
    out.setHex(swatch.roof);
    if (y01 > 0.82) mixHex(out, swatch.accent, 0.12);
  } else if (groundish) {
    out.setHex(swatch.ground);
  } else if (under) {
    out.setHex(swatch.wood);
    out.multiplyScalar(0.72);
  } else if (base) {
    out.setHex(swatch.wood);
    mixHex(out, swatch.wall, 0.28);
  } else {
    out.setHex(swatch.wall);
    if (y01 > 0.62) mixHex(out, swatch.roof, 0.08);
    if (kind === "takao") mixHex(out, swatch.ground, 0.22);
    if (kind === "enoshima" && y01 < 0.4) mixHex(out, swatch.accent, 0.18);
  }

  const grain = stroke(x, z);
  out.offsetHSL(grain * 0.15, grain * 0.4, grain);
  return out;
}

function stylizeMaterial(material: THREE.MeshStandardMaterial, kind: MiniatureKind): void {
  material.vertexColors = true;
  material.color.setHex(0xffffff);
  material.roughness = kind === "tray" ? 0.86 : 0.58;
  material.metalness = kind === "tray" ? 0.02 : 0.045;
  material.flatShading = false;
  material.needsUpdate = true;
}

function paintGeometry(geometry: THREE.BufferGeometry, kind: MiniatureKind): void {
  if (geometry.getAttribute("color")) return;
  const position = geometry.getAttribute("position");
  if (!position) return;
  geometry.computeBoundingBox();
  const box = geometry.boundingBox ?? new THREE.Box3(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 1, 1));
  const span = Math.max(box.max.y - box.min.y, 1e-6);
  const normal = geometry.getAttribute("normal");
  const colors = new Float32Array(position.count * 3);
  const tint = new THREE.Color();

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const ny = normal ? normal.getY(i) : 0;
    paintColor((y - box.min.y) / span, ny, x, z, kind, tint);
    colors[i * 3] = tint.r;
    colors[i * 3 + 1] = tint.g;
    colors[i * 3 + 2] = tint.b;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/**
 * Remeshed city GLBs ship as one gray matte mesh with no maps.
 * Paint vertex colors + ceramic PBR so they read as miniatures without new textures.
 */
export function stylizeUntexturedModel(root: THREE.Object3D, kind: MiniatureKind): void {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    if (materials.some((material) => material && hasAlbedoTexture(material))) return;

    paintGeometry(node.geometry, kind);

    const next = materials.map((material) => {
      const standard =
        material instanceof THREE.MeshStandardMaterial
          ? material
          : new THREE.MeshStandardMaterial();
      if (standard !== material && material) material.dispose();
      stylizeMaterial(standard, kind);
      return standard;
    });
    node.material = Array.isArray(node.material) ? next : next[0];
  });
}
