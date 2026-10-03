// Procedural low-poly landmark models. Local units are meters, y up, origin at ground centre.
// Materials tagged with userData.glow get their emissive scaled by the lighting system (bright after dark);
// objects with userData.tick(t) animate every frame.
import * as THREE from "three";

type Ticker = (seconds: number) => void;
export interface Glow { day: number; night: number }

const standard = (color: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15, ...extra });

/** Self-lit material: emissive `day` strength in daylight, `night` after dark. */
function lit(color: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}, night = 1.2, day = 0.15) {
  const m = standard(color, { emissive: extra.emissive ?? color, ...extra });
  m.userData.glow = { day, night } satisfies Glow;
  return m;
}
function cyl(rb: number, rt: number, y0: number, y1: number, material: THREE.Material, segments = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, y1 - y0, segments, 1), material);
  m.position.y = (y0 + y1) / 2;
  return m;
}
/** Square frustum (4-sided cylinder turned 45°). */
function square(rb: number, rt: number, y0: number, y1: number, material: THREE.Material) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, y1 - y0, 4, 1), material);
  m.position.y = (y0 + y1) / 2;
  m.rotation.y = Math.PI / 4;
  return m;
}
function box(w: number, h: number, d: number, y0: number, material: THREE.Material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.y = y0 + h / 2;
  return m;
}
const wire = (color: THREE.ColorRepresentation, opacity: number) =>
  new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity });
function onTick(object: THREE.Object3D, tick: Ticker) {
  object.userData.tick = tick;
  return object;
}
function beacon(y: number, r: number, color: THREE.ColorRepresentation = 0xff2a2a) {
  const material = lit(color, {}, 2.4, 0.6);
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), material);
  m.position.y = y;
  return onTick(m, (t) => { material.userData.pulse = 0.25 + 0.75 * (Math.sin(t * 3) * 0.5 + 0.5); });
}
const profile = (points: [number, number][], scale = 1) => points.map(([r, y]) => new THREE.Vector2(r * scale, y));

export function skytree(): THREE.Group {
  const g = new THREE.Group();
  const shaft = lit(0xdfe9ff, { emissive: 0x5d8fd8, metalness: 0.3 }, 0.45, 0.02);
  const base: [number, number][] = [[0.1, 0], [34, 0], [31, 40], [25, 130], [20, 250], [18, 338]];
  g.add(new THREE.Mesh(new THREE.LatheGeometry(profile(base), 3), shaft));             // triangular foot
  g.add(new THREE.Mesh(new THREE.LatheGeometry(profile(base, 0.93), 24), shaft));      // round shaft
  g.add(new THREE.Mesh(new THREE.LatheGeometry(profile(base, 1.04), 14), wire(0xffffff, 0.28)));
  g.add(cyl(24, 27, 338, 360, lit(0x7fe3ff, {}, 1.2, 0.25)));                          // Tembo Deck
  g.add(cyl(15, 17, 360, 440, shaft));
  g.add(cyl(15.5, 16.5, 440, 452, lit(0xb4f0ff, {}, 1.4, 0.25)));                       // Tembo Galleria
  g.add(cyl(8, 10, 452, 497, shaft));
  g.add(cyl(1.2, 3.6, 497, 634, shaft, 12));
  g.add(beacon(637, 4));
  const halo = new THREE.Mesh(
    new THREE.CylinderGeometry(40, 70, 90, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  halo.position.y = 45;
  halo.userData.nightOnly = 0.18;
  g.add(halo);
  return g;
}

const templeRed = () => lit(0xd23a2b, { emissive: 0x6a140a }, 0.7, 0.05);
const roofTile = () => standard(0x3e434f, { roughness: 0.8 });
function roof(w: number, h: number, y: number, material: THREE.Material, flare = 0.98) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.28, w * flare, h, 4), material);
  m.position.y = y + h / 2;
  m.rotation.y = Math.PI / 4;
  return m;
}

export function pagoda(tiers: number, baseW: number, tierH: number): THREE.Group {
  const g = new THREE.Group();
  const red = templeRed();
  const tiles = roofTile();
  const gold = lit(0xe2b452, { emissive: 0x7a5512, metalness: 0.6 }, 0.9, 0.2);
  g.add(square(baseW * 0.95, baseW * 0.95, 0, 2, standard(0x9a958c)));
  let y = 2;
  for (let i = 0; i < tiers; i++) {
    const w = baseW * (1 - i * 0.07);
    g.add(square(w * 0.5, w * 0.48, y, y + tierH * 0.62, red));
    y += tierH * 0.62;
    g.add(roof(w, tierH * 0.38, y, tiles));
    y += tierH * 0.38;
  }
  g.add(cyl(0.5, 0.35, y, y + tierH * 1.6, gold, 8));                                   // sōrin finial
  for (let k = 0; k < 6; k++) g.add(cyl(1.1, 1.1, y + 1 + k * 1.6, y + 1.5 + k * 1.6, gold, 10));
  return g;
}

/** Temple gate (Kaminarimon / Hōzōmon) with its red paper lantern. */
export function gate(width: number, height: number, lanternR: number): THREE.Group {
  const g = new THREE.Group();
  const red = templeRed();
  g.add(box(width * 0.6, height * 0.55, width * 0.3, 0, red));
  g.add(roof(width * 1.05, height * 0.25, height * 0.55, roofTile(), 1.05));
  if (height > 15) {
    g.add(box(width * 0.5, height * 0.15, width * 0.26, height * 0.8, red));
    g.add(roof(width * 0.95, height * 0.2, height * 0.9, roofTile(), 1.05));
  }
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(lanternR, 16, 12), lit(0xff3b2a, {}, 1.8, 0.35));
  lantern.scale.y = 1.35;
  lantern.position.set(0, height * 0.33, width * 0.16 + lanternR * 0.6);
  g.add(lantern);
  return g;
}

/** Main hall with a big hipped roof (Hase-dera Kannon-dō). */
export function hall(w: number, d: number, h: number): THREE.Group {
  const g = new THREE.Group();
  g.add(box(w * 1.1, 1.5, d * 1.1, 0, standard(0x9a958c)));
  g.add(box(w, h * 0.45, d, 1.5, lit(0x9b5a3c, { emissive: 0x4a1c0a }, 0.6, 0.05)));
  const hip = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 1, 1, 4), roofTile());
  hip.scale.set(w * 0.82, h * 0.45, d * 0.82);
  hip.rotation.y = Math.PI / 4;
  hip.position.y = 1.5 + h * 0.45 + h * 0.225;
  g.add(hip);
  return g;
}

export function daibutsu(): THREE.Group {
  const g = new THREE.Group();
  const bronze = lit(0x6f9d88, { metalness: 0.55, roughness: 0.45, emissive: 0x1d3a30 }, 0.7, 0.1);
  g.add(cyl(10, 9, 0, 2.2, standard(0x8e8a82), 20));
  g.add(cyl(8.5, 8, 2.2, 3.4, standard(0x7e7a73), 20));
  const part = (r: number, sx: number, sy: number, sz: number, y: number) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), bronze);
    m.scale.set(sx, sy, sz);
    m.position.y = y;
    g.add(m);
  };
  part(6, 1.55, 0.5, 1.15, 4.8);   // crossed legs
  part(4.6, 1.2, 1.15, 0.8, 8.6);  // torso
  part(2.3, 1, 1.15, 1, 14.6);     // head
  part(1.3, 1, 1, 1, 17.1);        // ushnisha
  return g;
}

export function seaCandle(): THREE.Group {
  const g = new THREE.Group();
  const white = lit(0xf2f4f8, { emissive: 0x9aa6c0 }, 0.35, 0);
  g.add(cyl(9, 8, 0, 6, white));
  g.add(cyl(3.2, 2.8, 6, 46, white, 12));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(profile([[9, 6], [5, 26], [6.5, 44]]), 16), wire(0xffe6b0, 0.55)));
  g.add(cyl(8.5, 8.5, 44, 51, lit(0xffd28a, {}, 1.2, 0.2)));                            // observation deck
  g.add(cyl(9.2, 9.2, 51, 52, white));
  g.add(cyl(2.6, 2.6, 52, 58, lit(0xffffff, {}, 1.8, 0.3), 12));                         // lighthouse lamp
  g.add(beacon(59.5, 1.6, 0xfff1c2));
  return g;
}

export function cosmoClock(): THREE.Group {
  const g = new THREE.Group();
  const wheel = new THREE.Group();
  const steel = standard(0xc9d2e2, { metalness: 0.6 });
  const RIM = 50;
  const LEDS = 60;
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(RIM, 0.9, 8, 120), steel));
  const spokes: number[] = [];
  for (let i = 0; i < LEDS; i++) {
    const a = (i / LEDS) * Math.PI * 2;
    spokes.push(0, 0, 0, Math.cos(a) * RIM, Math.sin(a) * RIM, 0);
    const led = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 6), lit(new THREE.Color().setHSL(i / LEDS, 0.9, 0.6), {}, 1.8, 0.3));
    led.position.set(Math.cos(a) * (RIM + 2.5), Math.sin(a) * (RIM + 2.5), 0);
    wheel.add(led);
  }
  const spokeGeometry = new THREE.BufferGeometry();
  spokeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(spokes, 3));
  wheel.add(new THREE.LineSegments(spokeGeometry, new THREE.LineBasicMaterial({ color: 0xdde6ff, transparent: true, opacity: 0.45 })));
  const face = new THREE.Mesh(new THREE.CircleGeometry(9, 32), lit(0x48ff9a, {}, 1.3, 0.4));       // the clock face
  face.position.z = 1.5;
  wheel.add(face);
  wheel.position.y = 60;
  onTick(wheel, (t) => { wheel.rotation.z = -t * 0.08; });
  g.add(wheel);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = cyl(1.2, 1.2, 0, 64, steel, 8);
    leg.position.set(sx * 14, 30, sz * 4);
    leg.rotation.z = sx * 0.23;
    g.add(leg);
  }
  g.add(cyl(14, 14, 0, 3, standard(0x5b6378)));
  return g;
}

/** teamLab Planets: soft colour-shifting orbs floating over the venue. */
export function orbs(): THREE.Group {
  const g = new THREE.Group();
  const random = mulberry32(2026);
  for (let i = 0; i < 26; i++) {
    const material = lit(0xffffff, { transparent: true, opacity: 0.85 }, 1.6, 0.6);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(2 + random() * 2.5, 16, 12), material);
    const angle = random() * Math.PI * 2;
    const radius = random() * 30;
    const height = 18 + random() * 22;
    const phase = random() * 10;
    orb.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    const color = new THREE.Color();
    onTick(orb, (t) => {
      color.setHSL((t * 0.03 + phase * 0.1) % 1, 0.75, 0.62);
      material.color.copy(color);
      material.emissive.copy(color);
      orb.position.y = height + Math.sin(t * 0.6 + phase) * 2;
    });
    g.add(orb);
  }
  return g;
}

/** Small seeded PRNG so the orb layout is the same on every load. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
