import * as THREE from "three";
import { palette } from "./palette";
import { disposeObject3D } from "./models";
import type { PropAsset, PropAssets } from "./props";

/**
 * Set dressing for the empty parts of the tray: forest, Mt. Fuji, a bay with sailboats,
 * a pond with a bridge, rice fields, stone lanterns and drifting clouds.
 * Everything is deterministic (seeded) and purely decorative — none of it is pickable.
 */

const FELT_Y = 0.06;
/** Usable felt area inside the tray lip. */
const BOUNDS = { x0: -4.85, x1: 4.85, z0: -3.7, z1: 3.7 };

const SEA = { x: -3.45, z: -2.85, w: 2.5, d: 1.55 };
const PEAK = { x: 3.95, z: -2.95 };
const POND = { x: 1.95, z: 2.55, rx: 0.62, rz: 0.42 };
const FIELDS = { x: 3.3, z: 2.55, w: 1.9, d: 1.2 };

interface Anchor {
  x: number;
  z: number;
  size: "sm" | "md" | "lg";
}

const CITY_KEEP_OUT: Record<Anchor["size"], number> = { lg: 1.75, md: 1.05, sm: 0.8 };

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

function mat(color: number, extras: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.04, ...extras });
}

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  shadow = true,
) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

export interface Decor {
  group: THREE.Group;
  update(elapsed: number, delta: number): void;
  /** Rebuild with Tripo prop models where available (same seeded layout, so nothing jumps). */
  useProps(assets: PropAssets): void;
}

export function makeDecor(options: {
  cities: Anchor[];
  /** Straight-line tray segments [ax, az, bx, bz] that trees must stay clear of. */
  routes: Array<[number, number, number, number]>;
  origin: { x: number; z: number };
  small: boolean;
}): Decor {
  const { cities, routes, origin, small } = options;
  const build = (assets: PropAssets) => {
    const random = rng(20260921);
    const group = new THREE.Group();
    group.name = "decor";
    const asset = (id: keyof PropAssets): PropAsset | undefined => assets[id];

    const g = {
      box: new THREE.BoxGeometry(1, 1, 1),
      cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
      cone: new THREE.ConeGeometry(0.5, 1, 6),
      sphere: new THREE.SphereGeometry(0.5, 8, 6),
      disc: new THREE.CylinderGeometry(0.5, 0.5, 1, 24),
    };

    /** True when (x, z) is clear of cities, routes, the sea, the pond, fields, the peak and the tray edge. */
    const isFree = (x: number, z: number, pad = 0.12): boolean => {
      if (x < BOUNDS.x0 + pad || x > BOUNDS.x1 - pad || z < BOUNDS.z0 + pad || z > BOUNDS.z1 - pad) return false;
      for (const c of cities) {
        if (Math.hypot(x - c.x, (z - c.z) * 1.15) < CITY_KEEP_OUT[c.size] + pad) return false;
      }
      if (Math.hypot(x - origin.x, z - origin.z) < 0.95) return false;
      for (const [ax, az, bx, bz] of routes) {
        if (distToSegment(x, z, ax, az, bx, bz) < 0.32 + pad) return false;
      }
      // sand path along the middle of the tray
      if (distToSegment(x, z, -2.6, 0.03, 3.0, -0.3) < 0.36) return false;
      if (Math.abs(x - SEA.x) < SEA.w / 2 + 0.2 && Math.abs(z - SEA.z) < SEA.d / 2 + 0.2) return false;
      if (Math.hypot((x - POND.x) / (POND.rx + 0.3), (z - POND.z) / (POND.rz + 0.3)) < 1) return false;
      if (Math.abs(x - FIELDS.x) < FIELDS.w / 2 + 0.15 && Math.abs(z - FIELDS.z) < FIELDS.d / 2 + 0.15) return false;
      if (Math.hypot(x - PEAK.x, z - PEAK.z) < 1.15) return false;
      return true;
    };

    const scatter = (
      count: number,
      around: { x: number; z: number; r: number },
      pad: number,
    ): Array<{ x: number; z: number; s: number; r: number }> => {
      const out: Array<{ x: number; z: number; s: number; r: number }> = [];
      let guard = 0;
      while (out.length < count && guard < count * 40) {
        guard += 1;
        const a = random() * Math.PI * 2;
        const d = Math.sqrt(random()) * around.r;
        const x = around.x + Math.cos(a) * d;
        const z = around.z + Math.sin(a) * d * 0.8;
        if (!isFree(x, z, pad)) continue;
        if (out.some((o) => Math.hypot(o.x - x, o.z - z) < 0.2)) continue;
        out.push({ x, z, s: 0.75 + random() * 0.6, r: random() * Math.PI });
      }
      return out;
    };

    const dummy = new THREE.Object3D();
    const instanced = (
      geometry: THREE.BufferGeometry,
      material: THREE.Material,
      items: Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number; ry: number }>,
    ) => {
      const im = new THREE.InstancedMesh(geometry, material, Math.max(items.length, 1));
      im.count = items.length;
      items.forEach((it, i) => {
        dummy.position.set(it.x, it.y, it.z);
        dummy.scale.set(it.sx, it.sy, it.sz);
        dummy.rotation.set(0, it.ry, 0);
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
      im.castShadow = !small;
      im.receiveShadow = true;
      return im;
    };

    /** A single Tripo prop, scaled so its longest side is `size`, standing on the felt. */
    const propMesh = (a: PropAsset, size: number, x: number, z: number, ry = 0, lift = 0) => {
      const m = new THREE.Mesh(a.geometry, a.material);
      m.scale.setScalar(size);
      m.position.set(x, FELT_Y + lift, z);
      m.rotation.y = ry;
      m.castShadow = !small;
      m.receiveShadow = true;
      return m;
    };

    // ── Pine forest clusters ────────────────────────────────────────────────────
    const pineSpots = [
      ...scatter(small ? 10 : 18, { x: -4.1, z: -0.9, r: 1.0 }, 0.1),
      ...scatter(small ? 8 : 15, { x: 4.2, z: -1.15, r: 0.95 }, 0.1),
      ...scatter(small ? 8 : 14, { x: -1.95, z: 3.1, r: 1.05 }, 0.1),
      ...scatter(small ? 6 : 10, { x: 1.2, z: -3.3, r: 0.8 }, 0.1),
      ...scatter(small ? 6 : 10, { x: 4.3, z: -2.0, r: 0.7 }, 0.1),
    ];
    const trunkMat = mat(0x6a4a32);
    const pineA = mat(palette.pine);
    const pineB = mat(0x557a47);
    const pineAsset = asset("pine");
    if (pineAsset) {
      group.add(
        instanced(
          pineAsset.geometry,
          pineAsset.material,
          pineSpots.map((p) => ({ x: p.x, y: FELT_Y, z: p.z, sx: 0.46 * p.s, sy: 0.46 * p.s, sz: 0.46 * p.s, ry: p.r })),
        ),
      );
    } else group.add(
      instanced(g.cyl, trunkMat, pineSpots.map((p) => ({ x: p.x, y: FELT_Y + 0.05 * p.s, z: p.z, sx: 0.05 * p.s, sy: 0.1 * p.s, sz: 0.05 * p.s, ry: 0 }))),
      instanced(g.cone, pineA, pineSpots.map((p) => ({ x: p.x, y: FELT_Y + 0.17 * p.s, z: p.z, sx: 0.26 * p.s, sy: 0.3 * p.s, sz: 0.26 * p.s, ry: p.r }))),
      instanced(g.cone, pineB, pineSpots.map((p) => ({ x: p.x, y: FELT_Y + 0.32 * p.s, z: p.z, sx: 0.19 * p.s, sy: 0.26 * p.s, sz: 0.19 * p.s, ry: p.r }))),
    );

    // ── Blossom trees lining the sand path ─────────────────────────────────────
    const blossomSpots: Array<{ x: number; z: number; s: number; r: number }> = [];
    for (let i = 0; i < (small ? 6 : 11); i += 1) {
      const t = (i + 0.5) / (small ? 6 : 11);
      const side = i % 2 === 0 ? 1 : -1;
      const x = -2.4 + t * 5.2;
      const z = 0.03 - t * 0.33 + side * (0.55 + random() * 0.15);
      if (isFree(x, z, 0.05)) blossomSpots.push({ x, z, s: 0.8 + random() * 0.35, r: 0 });
    }
    const blossomMat = mat(palette.blossom, { roughness: 0.9 });
    const sakuraAsset = asset("sakura");
    if (sakuraAsset) {
      group.add(
        instanced(
          sakuraAsset.geometry,
          sakuraAsset.material,
          blossomSpots.map((p, i) => ({ x: p.x, y: FELT_Y, z: p.z, sx: 0.5 * p.s, sy: 0.5 * p.s, sz: 0.5 * p.s, ry: i * 1.3 })),
        ),
      );
    } else group.add(
      instanced(g.cyl, trunkMat, blossomSpots.map((p) => ({ x: p.x, y: FELT_Y + 0.07 * p.s, z: p.z, sx: 0.045 * p.s, sy: 0.14 * p.s, sz: 0.045 * p.s, ry: 0 }))),
      instanced(g.sphere, blossomMat, blossomSpots.map((p) => ({ x: p.x, y: FELT_Y + 0.24 * p.s, z: p.z, sx: 0.3 * p.s, sy: 0.22 * p.s, sz: 0.3 * p.s, ry: p.r }))),
    );

    // ── Mt. Fuji backdrop ──────────────────────────────────────────────────────
    const fujiAsset = asset("fuji");
    const fuji = new THREE.Group();
    fuji.position.set(PEAK.x, FELT_Y, PEAK.z);
    const fujiBody = mesh(new THREE.ConeGeometry(0.5, 1, 9), mat(0x6f7f9c, { flatShading: true }), 0, 0.5, 0);
    fujiBody.scale.set(1.9, 1.15, 1.5);
    const fujiCap = mesh(new THREE.ConeGeometry(0.5, 1, 9), mat(0xf6f4ef, { flatShading: true }), 0, 0.86, 0);
    fujiCap.scale.set(0.62, 0.3, 0.5);
    const foot = mesh(new THREE.ConeGeometry(0.5, 1, 7), mat(0x7d8a6a, { flatShading: true }), -0.75, 0.16, 0.25);
    foot.scale.set(0.9, 0.32, 0.7);
    if (fujiAsset) fuji.add(propMesh(fujiAsset, 1.9, 0, 0).translateY(-FELT_Y));
    else fuji.add(fujiBody, fujiCap, foot);
    group.add(fuji);

    // ── Bay with sailboats ─────────────────────────────────────────────────────
    const shore = mesh(g.box, mat(palette.sand, { roughness: 0.95 }), SEA.x, FELT_Y + 0.006, SEA.z, false);
    shore.scale.set(SEA.w + 0.22, 0.012, SEA.d + 0.22);
    const water = mesh(
      g.box,
      mat(palette.water, { roughness: 0.25, metalness: 0.12, transparent: true, opacity: 0.92 }),
      SEA.x,
      FELT_Y + 0.02,
      SEA.z,
      false,
    );
    water.scale.set(SEA.w, 0.02, SEA.d);
    group.add(shore, water);

    const boats: Array<{ node: THREE.Group; baseY: number; phase: number; drift: number }> = [];
    const hullMat = mat(0xf3e6d4);
    const sailMat = mat(0xffffff, { side: THREE.DoubleSide });
    const boatSpots: Array<[number, number, number]> = [
      [SEA.x - 0.55, SEA.z + 0.25, 0.3],
      [SEA.x + 0.25, SEA.z - 0.3, -0.4],
      [SEA.x + 0.7, SEA.z + 0.35, 0.9],
    ];
    boatSpots.forEach(([x, z, rot], i) => {
      const boat = new THREE.Group();
      const boatAsset = asset("sailboat");
      if (boatAsset) {
        boat.add(propMesh(boatAsset, 0.34, 0, 0).translateY(-FELT_Y - 0.01));
      } else {
        const hull = mesh(g.box, hullMat, 0, 0.03, 0);
        hull.scale.set(0.2, 0.05, 0.08);
        const mast = mesh(g.cyl, trunkMat, 0.0, 0.16, 0, false);
        mast.scale.set(0.012, 0.24, 0.012);
        const sail = mesh(new THREE.ConeGeometry(0.5, 1, 3), sailMat, 0.0, 0.17, 0, false);
        sail.scale.set(0.14, 0.22, 0.012);
        boat.add(hull, mast, sail);
      }
      boat.position.set(x, FELT_Y + 0.03, z);
      boat.rotation.y = rot;
      group.add(boat);
      boats.push({ node: boat, baseY: FELT_Y + 0.03, phase: i * 1.7, drift: 0.02 + i * 0.006 });
    });

    // ── Pond with a red bridge ─────────────────────────────────────────────────
    const pond = mesh(g.disc, mat(palette.water, { roughness: 0.2, metalness: 0.1 }), POND.x, FELT_Y + 0.012, POND.z, false);
    pond.scale.set(POND.rx * 2, 0.02, POND.rz * 2);
    const pondEdge = mesh(g.disc, mat(0x8d8578), POND.x, FELT_Y + 0.004, POND.z, false);
    pondEdge.scale.set(POND.rx * 2 + 0.1, 0.012, POND.rz * 2 + 0.1);
    group.add(pondEdge, pond);
    const bridgeMat = mat(0xc4553a);
    const deck = mesh(g.box, bridgeMat, POND.x, FELT_Y + 0.06, POND.z);
    deck.scale.set(0.3, 0.025, 0.95 * POND.rz * 2 + 0.16);
    deck.rotation.y = 0;
    const rail1 = mesh(g.box, bridgeMat, POND.x - 0.15, FELT_Y + 0.09, POND.z, false);
    rail1.scale.set(0.015, 0.03, POND.rz * 2 + 0.1);
    const rail2 = rail1.clone();
    rail2.position.x = POND.x + 0.15;
    const bridgeAsset = asset("bridge");
    if (bridgeAsset) group.add(propMesh(bridgeAsset, POND.rz * 2 + 0.16, POND.x, POND.z, 0, 0.005));
    else group.add(deck, rail1, rail2);
    const rockMat = mat(0x8d8578);
    for (const [dx, dz, s] of [[-0.42, 0.22, 0.12], [0.44, -0.2, 0.09], [0.1, 0.4, 0.07]] as const) {
      const rock = mesh(g.sphere, rockMat, POND.x + dx, FELT_Y + 0.02, POND.z + dz);
      rock.scale.set(s * 1.3, s * 0.8, s);
      group.add(rock);
    }
    const lily = mat(0x6f9a58);
    for (const [dx, dz] of [[-0.25, -0.12], [0.3, 0.14], [-0.1, 0.2]] as const) {
      const pad = mesh(g.disc, lily, POND.x + dx, FELT_Y + 0.025, POND.z + dz, false);
      pad.scale.set(0.09, 0.006, 0.09);
      group.add(pad);
    }

    // ── Rice / tea fields ──────────────────────────────────────────────────────
    const fieldColors = [0x9db56a, 0x86a35a, 0xb1c27b, 0x8fae62];
    const strips = 5;
    for (let i = 0; i < strips; i += 1) {
      const strip = mesh(g.box, mat(fieldColors[i % fieldColors.length], { roughness: 0.95 }), FIELDS.x, FELT_Y + 0.012, FIELDS.z - FIELDS.d / 2 + ((i + 0.5) * FIELDS.d) / strips, false);
      strip.scale.set(FIELDS.w, 0.024, FIELDS.d / strips - 0.03);
      group.add(strip);
    }

    // ── Stone lanterns beside the bigger cities ───────────────────────────────
    const stone = mat(0xb9b2a4);
    const glow = mat(0xffe3a8, { emissive: 0xffc46b, emissiveIntensity: 0.45 });
    const lanternSpots: Array<[number, number]> = [
      [0.55 + 1.3, 0.15 + 0.85],
      [-0.55 + 0.85, -1.85 + 0.75],
      [0.45 - 0.7, -2.85 + 0.6],
      [-3.15 + 0.6, 0.45 + 0.55],
      [-0.15 - 0.65, 2.35 + 0.55],
      [3.15 + 0.85, 0.35 + 0.65],
    ];
    for (const [x, z] of lanternSpots) {
      if (x < BOUNDS.x0 || x > BOUNDS.x1 || z < BOUNDS.z0 || z > BOUNDS.z1) continue;
      const lanternAsset = asset("lantern");
      if (lanternAsset) {
        group.add(propMesh(lanternAsset, 0.3, x, z, x * 2.1));
        continue;
      }
      const lantern = new THREE.Group();
      const base = mesh(g.box, stone, 0, 0.02, 0);
      base.scale.set(0.07, 0.04, 0.07);
      const post = mesh(g.cyl, stone, 0, 0.09, 0);
      post.scale.set(0.028, 0.1, 0.028);
      const lamp = mesh(g.box, glow, 0, 0.17, 0, false);
      lamp.scale.set(0.055, 0.05, 0.055);
      const cap = mesh(g.cone, stone, 0, 0.225, 0);
      cap.scale.set(0.11, 0.05, 0.11);
      lantern.add(base, post, lamp, cap);
      lantern.position.set(x, FELT_Y, z);
      group.add(lantern);
    }

    // ── A little shrine tucked between Takao and Kawagoe (Tripo prop only) ────
    const shrineAsset = asset("shrine");
    if (shrineAsset) {
      const spot: [number, number] = isFree(-1.75, 1.45, 0.05) ? [-1.75, 1.45] : [-2.2, 1.7];
      group.add(propMesh(shrineAsset, 0.62, spot[0], spot[1], 0.5));
    }

    // ── Drifting clouds just outside the tray ──────────────────────────────────
    const clouds: Array<{ node: THREE.Group; speed: number; span: number }> = [];
    const cloudMat = mat(0xffffff, { roughness: 1, transparent: true, opacity: 0.92 });
    const cloudSeeds: Array<[number, number, number]> = [
      [-7.1, -4.4, 1.5],
      [-6.6, 1.2, 1.9],
      [6.9, -1.6, 1.6],
      [7.2, 3.4, 2.0],
      [-1.8, 5.6, 1.7],
      [2.6, -5.5, 1.4],
    ];
    for (const [x, z, y] of cloudSeeds) {
      const cloud = new THREE.Group();
      const puffs: Array<[number, number, number, number]> = [
        [0, 0, 0, 0.42],
        [0.36, -0.04, 0.05, 0.32],
        [-0.34, -0.06, -0.04, 0.3],
        [0.1, 0.1, 0.02, 0.28],
      ];
      for (const [px, py, pz, r] of puffs) {
        const puff = mesh(g.sphere, cloudMat, px, py, pz, false);
        puff.scale.set(r * 1.6, r * 1.0, r * 1.2);
        cloud.add(puff);
      }
      cloud.position.set(x, y, z);
      group.add(cloud);
      clouds.push({ node: cloud, speed: 0.05 + random() * 0.05, span: 1.2 + random() * 0.8 });
    }
    const cloudHome = clouds.map((c) => c.node.position.x);


    return { group, boats, clouds, cloudHome };
  };

  const state = { built: build({}) };
  const host = new THREE.Group();
  host.name = "decor";
  host.add(state.built.group);

  return {
    group: host,
    useProps(assets) {
      const next = build(assets);
      host.remove(state.built.group);
      disposeObject3D(state.built.group);
      state.built = next;
      host.add(next.group);
    },
    update(elapsed) {
      const { boats, clouds, cloudHome } = state.built;
      boats.forEach((b) => {
        b.node.position.y = b.baseY + Math.sin(elapsed * 1.4 + b.phase) * 0.008;
        b.node.rotation.z = Math.sin(elapsed * 1.1 + b.phase) * 0.05;
        b.node.position.x += Math.sin(elapsed * 0.3 + b.phase) * b.drift * 0.01;
      });
      clouds.forEach((c, i) => {
        c.node.position.x = cloudHome[i] + Math.sin(elapsed * c.speed + i * 2.1) * c.span;
      });
    },
  };
}
