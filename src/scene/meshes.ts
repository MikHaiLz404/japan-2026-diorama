import * as THREE from "three";
import type { CityBlock, VisitStatus } from "../data/types";
import { cityColors, palette } from "./palette";

const geo = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cone: new THREE.ConeGeometry(0.5, 1, 5),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  sphere: new THREE.SphereGeometry(0.5, 10, 8),
};

const sharedGeometries = new Set<THREE.BufferGeometry>(Object.values(geo));

/** Shared unit geometries used by procedural meshes — do not GPU-dispose these. */
export function isSharedGeometry(geometry: THREE.BufferGeometry): boolean {
  return sharedGeometries.has(geometry);
}

export function platformSize(size: CityBlock["size"]): { w: number; d: number; h: number } {
  if (size === "lg") return { w: 2.35, d: 1.85, h: 0.16 };
  if (size === "md") return { w: 1.35, d: 1.15, h: 0.13 };
  return { w: 1.05, d: 0.92, h: 0.12 };
}

function mat(color: number, extras: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.68,
    metalness: 0.06,
    ...extras,
  });
}

function box(
  parent: THREE.Object3D,
  material: THREE.Material,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
) {
  const mesh = new THREE.Mesh(geo.box, material);
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function makeTray(): THREE.Group {
  const group = new THREE.Group();
  group.name = "tray";

  const wood = mat(palette.wood, { roughness: 0.82 });
  const rim = mat(palette.woodRim, { roughness: 0.78 });
  const moss = mat(palette.moss, { roughness: 0.95 });
  const mossDeep = mat(palette.mossDeep, { roughness: 0.96 });

  const table = new THREE.Mesh(geo.box, mat(0xe7e2d8, { roughness: 0.92 }));
  table.scale.set(16, 0.2, 13);
  table.position.y = -0.48;
  table.receiveShadow = true;
  group.add(table);

  const base = new THREE.Mesh(geo.box, wood);
  base.scale.set(11.6, 0.42, 9.4);
  base.position.y = -0.24;
  base.receiveShadow = true;
  group.add(base);

  const lip = (w: number, d: number, x: number, z: number) => {
    const wall = new THREE.Mesh(geo.box, rim);
    wall.scale.set(w, 0.58, d);
    wall.position.set(x, 0.18, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);
  };
  lip(11.6, 0.55, 0, -4.48);
  lip(11.6, 0.55, 0, 4.48);
  lip(0.55, 9.4, -5.58, 0);
  lip(0.55, 9.4, 5.58, 0);

  const felt = new THREE.Mesh(geo.box, moss);
  felt.scale.set(10.1, 0.08, 7.9);
  felt.position.y = 0.02;
  felt.receiveShadow = true;
  group.add(felt);

  const patches: Array<[number, number, number, number]> = [
    [-2.4, -1.6, 2.2, 1.6],
    [2.6, 1.4, 1.8, 1.3],
    [0.2, 2.1, 1.4, 1.1],
  ];
  for (const [x, z, w, d] of patches) {
    const patch = new THREE.Mesh(geo.box, mossDeep);
    patch.scale.set(w, 0.03, d);
    patch.position.set(x, 0.055, z);
    patch.receiveShadow = true;
    group.add(patch);
  }

  return group;
}

function addTree(parent: THREE.Group, x: number, z: number, blossom: boolean) {
  const trunk = new THREE.Mesh(geo.cyl, mat(0x6a4a32));
  trunk.scale.set(0.07, 0.22, 0.07);
  trunk.position.set(x, 0.2, z);
  trunk.castShadow = true;
  parent.add(trunk);

  const crown = new THREE.Mesh(geo.sphere, mat(blossom ? palette.blossom : palette.pine));
  crown.scale.set(blossom ? 0.28 : 0.24, blossom ? 0.2 : 0.22, blossom ? 0.28 : 0.24);
  crown.position.set(x, 0.36, z);
  crown.castShadow = true;
  parent.add(crown);
}

function addLandmark(parent: THREE.Group, city: CityBlock, colors: ReturnType<typeof cityColors>) {
  const roof = mat(colors.roof);
  const body = mat(colors.body, {
    emissive: colors.emissive,
    emissiveIntensity: colors.emissiveIntensity,
    transparent: colors.opacity < 1,
    opacity: colors.opacity,
  });

  if (city.landmark === "skytree") {
    box(parent, body, 0.1, 1.15, 0.1, 0.72, 0, -0.55);
    box(parent, roof, 0.2, 0.08, 0.2, 0.72, 0.62, -0.55);
    const tip = new THREE.Mesh(geo.cone, roof);
    tip.scale.set(0.08, 0.22, 0.08);
    tip.position.set(0.72, 1.28, -0.55);
    tip.castShadow = true;
    parent.add(tip);
    return;
  }
  if (city.landmark === "tower") {
    box(parent, body, 0.12, 0.72, 0.12, 0.28, 0, 0.18);
    box(parent, roof, 0.18, 0.06, 0.18, 0.28, 0.72, 0.18);
    return;
  }
  if (city.landmark === "torii") {
    box(parent, roof, 0.06, 0.38, 0.06, -0.16, 0, 0.12);
    box(parent, roof, 0.06, 0.38, 0.06, 0.16, 0, 0.12);
    box(parent, roof, 0.46, 0.06, 0.08, 0, 0.38, 0.12);
    return;
  }
  if (city.landmark === "island") {
    const rock = new THREE.Mesh(geo.sphere, mat(0x8d8578));
    rock.scale.set(0.55, 0.22, 0.42);
    rock.position.set(0, 0.12, 0);
    rock.castShadow = true;
    parent.add(rock);
    box(parent, roof, 0.16, 0.14, 0.16, 0.02, 0.16, 0);
    return;
  }
  if (city.landmark === "hall") {
    box(parent, body, 0.7, 0.22, 0.36, 0, 0, 0.05);
    box(parent, roof, 0.78, 0.06, 0.42, 0, 0.22, 0.05);
    return;
  }
  if (city.landmark === "peak") {
    const peak = new THREE.Mesh(geo.cone, mat(0x7d8a6a));
    peak.scale.set(0.7, 0.55, 0.7);
    peak.position.set(0, 0.34, 0);
    peak.castShadow = true;
    parent.add(peak);
    return;
  }
  box(parent, body, 0.34, 0.28, 0.26, 0, 0, 0);
  box(parent, roof, 0.4, 0.08, 0.32, 0, 0.28, 0);
}

export function makeCityBlock(city: CityBlock): THREE.Group {
  const group = new THREE.Group();
  group.name = `city:${city.id}`;
  group.position.set(city.tray[0], 0.06, city.tray[1]);
  group.userData = { kind: "city", cityId: city.id };

  const colors = cityColors(city.status);
  const { w, d, h } = platformSize(city.size);
  const plank = mat(city.status === "upcoming" ? 0xb7a48c : 0xe2c39a, {
    transparent: city.status === "upcoming",
    opacity: city.status === "upcoming" ? 0.86 : 1,
  });
  const hit = box(group, plank, w, h, d, 0, 0, 0);
  hit.name = `hit:${city.id}`;
  hit.userData = { kind: "city", cityId: city.id };

  const visuals = new THREE.Group();
  visuals.name = `procedural:${city.id}`;
  group.add(visuals);

  const body = mat(colors.body, {
    emissive: colors.emissive,
    emissiveIntensity: colors.emissiveIntensity,
    transparent: colors.opacity < 1,
    opacity: colors.opacity,
  });
  const roof = mat(colors.roof, {
    transparent: colors.opacity < 1,
    opacity: colors.opacity,
  });

  const footprint: Array<[number, number, number, number, number]> =
    city.size === "lg"
      ? [
          [-0.7, -0.35, 0.34, 0.32, 0.28],
          [-0.28, -0.42, 0.22, 0.48, 0.22],
          [0.18, -0.28, 0.3, 0.26, 0.24],
          [-0.55, 0.28, 0.26, 0.22, 0.3],
          [0.05, 0.38, 0.36, 0.2, 0.28],
        ]
      : [
          [-0.22, -0.12, 0.24, 0.22, 0.2],
          [0.18, 0.1, 0.2, 0.28, 0.18],
        ];

  for (const [x, z, bw, bh, bd] of footprint) {
    box(visuals, body, bw, bh, bd, x, h, z);
    box(visuals, roof, bw + 0.06, 0.06, bd + 0.06, x, h + bh, z);
  }

  addLandmark(visuals, city, colors);
  addTree(visuals, -w * 0.38, d * 0.32, city.id === "tokyo" || city.id === "kamakura");
  if (city.size === "lg") addTree(visuals, 0.85, 0.55, true);

  return group;
}

export function makeDayPlate(
  city: CityBlock,
  date: string,
  index: number,
  status: VisitStatus,
): THREE.Mesh {
  const { w, d, h } = platformSize(city.size);
  const cols = 4;
  const col = index % cols;
  const row = Math.floor(index / cols);
  const plate = new THREE.Mesh(
    geo.box,
    mat(status === "upcoming" ? 0xd8dbe0 : palette.ceramic, {
      emissive: status === "today" ? 0x1a2448 : 0x000000,
      emissiveIntensity: status === "today" ? 0.08 : 0,
    }),
  );
  const pw = date === "2026-09-18" ? 0.52 : 0.42;
  const pd = date === "2026-09-18" ? 0.34 : 0.26;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 80;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = status === "upcoming" ? "#e4e6ea" : "#f7f6f3";
    ctx.fillRect(0, 0, 128, 80);
    ctx.fillStyle = status === "today" ? "#2a3a66" : "#5c6370";
    ctx.font = "700 28px 'Noto Sans JP', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(date.slice(5), 64, 40);
  }
  plate.material = new THREE.MeshStandardMaterial({
    map: new THREE.CanvasTexture(canvas),
    roughness: 0.45,
    emissive: status === "today" ? 0x1a2448 : 0x000000,
    emissiveIntensity: status === "today" ? 0.1 : 0,
  });
  plate.scale.set(pw, 0.07, pd);
  plate.position.set(-w * 0.36 + col * 0.48, h + 0.08, d * 0.42 - row * 0.32);
  plate.castShadow = true;
  plate.receiveShadow = true;
  plate.name = `plate:${city.id}:${date}`;
  plate.userData = { kind: "plate", cityId: city.id, date };
  return plate;
}

export function makeOriginToken(): THREE.Group {
  const group = new THREE.Group();
  group.position.set(-4.35, 0.06, 2.55);
  const disc = new THREE.Mesh(geo.cyl, mat(palette.sand));
  disc.scale.set(0.55, 0.08, 0.55);
  disc.position.y = 0.05;
  disc.receiveShadow = true;
  group.add(disc);
  box(group, mat(0x9a5a48), 0.22, 0.18, 0.22, 0, 0.08, 0);
  return group;
}

export function makeLabel(text: string, cityId: string, dim: boolean): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 256, 96);
    ctx.fillStyle = dim ? "rgba(255, 255, 255, 0.62)" : "rgba(255, 255, 255, 0.88)";
    ctx.beginPath();
    ctx.roundRect(18, 22, 220, 52, 16);
    ctx.fill();
    ctx.fillStyle = dim ? "#8a8f98" : "#12141a";
    ctx.font = "600 28px 'Noto Sans JP', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 48);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }),
  );
  sprite.scale.set(1.35, 0.5, 1);
  sprite.center.set(0.5, 0);
  sprite.userData = { kind: "city", cityId };
  return sprite;
}
