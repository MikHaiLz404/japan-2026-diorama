// three.js custom layer that draws the landmark models and keeps an Apple-style badge above each one.
import maplibregl, { type CustomLayerInterface, type Map as MapLibreMap } from "maplibre-gl";
import * as THREE from "three";
import { ICONS } from "./icons";
import type { Glow } from "./builders";
import type { Landmark } from "./landmarks";
import type { PhaseWeights } from "./sun";

const ORIGIN: [number, number] = [139.77, 35.68];
const TERRAIN_REFRESH_FRAMES = 30;
const MIN_BADGE_ZOOM = 10.8;
const BADGE_MARGIN = 6;

interface Item {
  lm: Landmark;
  obj: THREE.Object3D | null;
  el: HTMLButtonElement;
  pos: THREE.Vector3;
  ground: number;
  top: number;
  size: { w: number; h: number } | null;
}

export interface LandmarkLayer {
  layer: CustomLayerInterface;
  setLighting(input: { sunDir: { x: number; y: number; z: number }; weights: PhaseWeights }): void;
}

/** How far away a badge stays visible: tall towers read from across the city, small sights only up close. */
const badgeRange = (lm: Landmark, topM: number) => (topM > 200 ? 12000 : lm.rank === 0 ? 9000 : 4500);

export function createLandmarkLayer(
  map: MapLibreMap,
  { landmarks, badgeHost, onSelect }: { landmarks: Landmark[]; badgeHost: HTMLElement; onSelect: (lm: Landmark) => void },
): LandmarkLayer {
  const origin = maplibregl.MercatorCoordinate.fromLngLat(ORIGIN, 0);
  const metersToMercator = origin.meterInMercatorCoordinateUnits();
  // Local frame: meters, x east, y up, z south — rotated into MapLibre's mercator space.
  const base = new THREE.Matrix4()
    .makeTranslation(origin.x, origin.y, origin.z)
    .scale(new THREE.Vector3(metersToMercator, -metersToMercator, metersToMercator))
    .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
  const camera = new THREE.Camera();
  const scene = new THREE.Scene();
  const hemi = new THREE.HemisphereLight(0xaac0ff, 0x1a2030, 1.4);
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  scene.add(hemi, sun, sun.target);

  const items: Item[] = landmarks.map((lm) => {
    const m = maplibregl.MercatorCoordinate.fromLngLat(lm.at, 0);
    const pos = new THREE.Vector3((m.x - origin.x) / metersToMercator, 0, (m.y - origin.y) / metersToMercator);
    let obj: THREE.Object3D | null = null;
    if (lm.build) {
      obj = lm.build();
      obj.scale.setScalar(lm.scale ?? 1);
      obj.rotation.y = lm.rotate ?? 0;
      obj.position.copy(pos);
      scene.add(obj);
    }
    const el = document.createElement("button");
    el.type = "button";
    el.className = "badge";
    el.setAttribute("aria-label", `${lm.name} — บินไปดู`);
    el.innerHTML = `<span class="disc">${ICONS[lm.icon]}</span><span class="name"></span><span class="stem"></span>`;
    el.querySelector(".name")!.textContent = lm.name;
    el.addEventListener("click", () => onSelect(lm));
    if (!lm.quiet) badgeHost.appendChild(el);
    return { lm, obj, el, pos, ground: 0, top: lm.top * (lm.scale ?? 1), size: null };
  });

  const glowing = new Set<THREE.MeshStandardMaterial>();
  scene.traverse((o) => {
    const material = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (material?.userData?.glow) glowing.add(material);
  });
  let nightGlow = 0;

  function setLighting({ sunDir, weights }: { sunDir: { x: number; y: number; z: number }; weights: PhaseWeights }) {
    nightGlow = weights.night + weights.dusk * 0.55;
    sun.position.set(sunDir.x * 1000, Math.max(sunDir.y, 0.08) * 1000, sunDir.z * 1000);
    sun.intensity = 0.35 + 2.6 * weights.day + 1.2 * weights.dusk;
    sun.color.set(weights.dusk > 0.5 ? 0xffc29a : 0xffffff);
    hemi.intensity = 0.7 + 1.2 * weights.day;
    hemi.color.set(weights.night > 0.5 ? 0x8ea6ff : 0xdfe8ff);
  }

  function placeOnTerrain() {
    for (const it of items) {
      const e = map.getTerrain() ? map.queryTerrainElevation(it.lm.at) : 0;
      it.ground = Number.isFinite(e) ? (e as number) : 0;
      if (it.obj) it.obj.position.y = it.ground;
    }
  }

  const v = new THREE.Vector4();
  function updateBadges(projection: THREE.Matrix4) {
    const canvas = map.getCanvas();
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const zoom = map.getZoom();
    const center = map.getCenter();
    const placed: [number, number, number, number][] = [];
    const ordered = items.filter((it) => !it.lm.quiet).sort((a, b) => a.lm.rank - b.lm.rank);
    for (const it of ordered) {
      const near = center.distanceTo(new maplibregl.LngLat(...it.lm.at)) < badgeRange(it.lm, it.top);
      v.set(it.pos.x, it.ground + it.top, it.pos.z, 1).applyMatrix4(projection);
      let show = near && v.w > 0 && zoom > MIN_BADGE_ZOOM;
      if (show) {
        it.size ??= { w: it.el.offsetWidth, h: it.el.offsetHeight };
        const x = ((v.x / v.w + 1) / 2) * w;
        const y = ((1 - v.y / v.w) / 2) * h;
        const tx = Math.min(w - it.size.w - BADGE_MARGIN, Math.max(BADGE_MARGIN, x - it.size.w / 2));
        const ty = Math.max(BADGE_MARGIN, y - it.size.h);
        const rect: [number, number, number, number] = [tx, ty, tx + it.size.w, ty + it.size.h];
        const overlaps = placed.some((r) => rect[0] < r[2] && rect[2] > r[0] && rect[1] < r[3] && rect[3] > r[1]);
        show = x > -40 && x < w + 40 && y < h + 20 && !overlaps;
        if (show) {
          placed.push(rect);
          it.el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
        }
      }
      it.el.classList.toggle("show", show);
    }
  }

  let renderer: THREE.WebGLRenderer;
  let frame = 0;
  const layer: CustomLayerInterface = {
    id: "landmarks-3d",
    type: "custom",
    renderingMode: "3d",
    onAdd(m, gl) {
      renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true });
      renderer.autoClear = false;
    },
    render(_gl, matrix) {
      const t = performance.now() / 1000;
      if (frame++ % TERRAIN_REFRESH_FRAMES === 0) placeOnTerrain();
      scene.traverse((o) => o.userData.tick?.(t));
      for (const material of glowing) {
        const glow = material.userData.glow as Glow;
        material.emissiveIntensity = (glow.day + (glow.night - glow.day) * nightGlow) * (material.userData.pulse ?? 1);
      }
      scene.traverse((o) => {
        if (o.userData.nightOnly) ((o as THREE.Mesh).material as THREE.Material).opacity = o.userData.nightOnly * nightGlow;
      });
      camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix as number[]).multiply(base);
      renderer.resetState();
      renderer.render(scene, camera);
      updateBadges(camera.projectionMatrix);
      map.triggerRepaint();
    },
  };
  return { layer, setLighting };
}
