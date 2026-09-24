import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Selection } from "../data/types";
import { ORIGIN_TOKEN } from "../data/cities";
import type { PreparedTrip } from "../data/loadTrip";
import { isMobileLayout, isSmallScreen, prefersReducedMotion } from "../lib/platform";
import { makeDecor, type Decor } from "./decor";
import { makeCityBlock, makeLabel, makeOriginToken, makeTray, platformSize } from "./meshes";
import { makeRailPaths } from "./railPaths";
import { SCENE_LOOK } from "./look";
import { disposeObject3D, hydrateGltfModels } from "./models";
import { makeRoute, routeParallelMeta } from "./paths";
import { PetalField, SAKURA_LOOK } from "./petals";
import { loadPropAssets } from "./props";

const OVERVIEW = {
  position: new THREE.Vector3(0.15, 11.2, 12.1),
  target: new THREE.Vector3(0.05, 0.2, -0.05),
};

/** Distance the desktop overview was tuned at (OrbitControls clamps to this). */
const OVERVIEW_BASE_DISTANCE = 14;
const OVERVIEW_MARGIN = 0.9;

/**
 * Camera distance that keeps `halfWidth` of content inside the horizontal FOV.
 * Wide screens keep the tuned distance; narrow (portrait) screens pull back.
 */
export function overviewDistance(aspect: number, vfovDeg: number, halfWidth: number): number {
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(vfovDeg) / 2);
  const needed = halfWidth / (Math.max(aspect, 0.1) * tanHalf);
  return Math.max(OVERVIEW_BASE_DISTANCE, needed);
}

export class Diorama {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly clock = new THREE.Clock();
  private readonly pickables: THREE.Object3D[] = [];
  private readonly routeMeshes: THREE.Mesh[] = [];
  private readonly prepared: PreparedTrip;
  private paused = false;
  private visibilityObserver: IntersectionObserver | null = null;
  /** Resolves once GLB city models and props have loaded (or fallen back). */
  readonly ready: Promise<void>;
  private readonly goalPos = OVERVIEW.position.clone();
  private readonly overviewPos = OVERVIEW.position.clone();
  private readonly contentHalfWidth: number;
  private readonly goalTarget = OVERVIEW.target.clone();
  private readonly petals: PetalField | null;
  private readonly decor: Decor;
  private readonly reduced = prefersReducedMotion();
  private pointerDown: { x: number; y: number } | null = null;
  private raf = 0;
  private disposed = false;
  private animating = false;
  private readonly modelAbort = new AbortController();
  private onPick: (selection: Selection | null) => void;

  constructor(
    host: HTMLElement,
    prepared: PreparedTrip,
    onPick: (selection: Selection | null) => void,
  ) {
    this.onPick = onPick;
    this.prepared = prepared;
    const small = isSmallScreen();
    this.renderer = new THREE.WebGLRenderer({ antialias: !small, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2));
    this.renderer.setSize(host.clientWidth, host.clientHeight);
    this.renderer.setClearColor(SCENE_LOOK.clearColor, 1);
    this.renderer.shadowMap.enabled = !small;
    if (!small) this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = SCENE_LOOK.exposure;
    host.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(42, host.clientWidth / host.clientHeight, 0.1, 80);
    const xs = [ORIGIN_TOKEN.tray[0], ...prepared.cities.map((c) => c.tray[0])];
    this.contentHalfWidth =
      Math.max(...xs.map((x) => Math.abs(x - OVERVIEW.target.x))) + OVERVIEW_MARGIN;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 2.4;
    this.controls.maxDistance = OVERVIEW_BASE_DISTANCE;
    this.controls.maxPolarAngle = Math.PI * 0.46;
    this.controls.target.copy(OVERVIEW.target);
    this.fitOverview();
    this.camera.position.copy(this.overviewPos);
    this.goalPos.copy(this.overviewPos);
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_ROTATE,
    };
    this.controls.addEventListener("start", () => {
      this.animating = false;
      this.goalPos.copy(this.camera.position);
      this.goalTarget.copy(this.controls.target);
    });

    this.scene.fog = new THREE.Fog(SCENE_LOOK.clearColor, SCENE_LOOK.fogNear, SCENE_LOOK.fogFar);
    this.scene.add(new THREE.AmbientLight(SCENE_LOOK.ambient, SCENE_LOOK.ambientIntensity));
    this.scene.add(
      new THREE.HemisphereLight(SCENE_LOOK.hemiSky, SCENE_LOOK.hemiGround, SCENE_LOOK.hemiIntensity),
    );
    const key = new THREE.DirectionalLight(SCENE_LOOK.keyColor, SCENE_LOOK.keyIntensity);
    key.position.set(4.5, 8, 3.2);
    key.castShadow = !small;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.radius = 6;
    key.shadow.camera.left = -7;
    key.shadow.camera.right = 7;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(SCENE_LOOK.fillColor, SCENE_LOOK.fillIntensity);
    fill.position.set(-5, 3.4, -4);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight(SCENE_LOOK.rimColor, SCENE_LOOK.rimIntensity);
    rim.position.set(-1.2, 5.4, 6.2);
    this.scene.add(rim);

    this.scene.add(makeTray());
    this.scene.add(makeRailPaths(prepared.groundPaths));
    this.scene.add(makeOriginToken());

    const anchors = new Map<string, [number, number]>([[ORIGIN_TOKEN.id, [ORIGIN_TOKEN.tray[0], ORIGIN_TOKEN.tray[1]]]]);
    for (const city of prepared.cities) anchors.set(city.id, [city.tray[0], city.tray[1]]);
    this.decor = makeDecor({
      cities: prepared.cities.map((c) => ({ x: c.tray[0], z: c.tray[1], size: c.size })),
      routes: prepared.routes.flatMap((r): Array<[number, number, number, number]> => {
        const a = anchors.get(r.fromCityId);
        const b = anchors.get(r.toCityId);
        return a && b ? [[a[0], a[1], b[0], b[1]]] : [];
      }),
      origin: { x: ORIGIN_TOKEN.tray[0], z: ORIGIN_TOKEN.tray[1] },
      small,
    });
    this.scene.add(this.decor.group);

    const mobile = isMobileLayout();

    for (const city of prepared.cities) {
      const block = makeCityBlock(city);
      this.scene.add(block);
      const hit = block.getObjectByName(`hit:${city.id}`);
      if (hit) this.pickables.push(hit);

      const { d } = platformSize(city.size);
      const label = makeLabel(
        city.name,
        city.id,
        city.status === "upcoming",
      );
      // Placard hangs just in front of the block so it stays attached at any tilt.
      label.position.set(0, 0.12, d * 0.5 + 0.12);
      // Portrait overview pulls the camera back, so placards grow to stay legible.
      if (mobile) label.scale.multiplyScalar(1.45);
      block.add(label);
    }

    const routeMeta = routeParallelMeta(prepared.routes);
    for (let i = 0; i < prepared.routes.length; i += 1) {
      const route = prepared.routes[i];
      const mesh = makeRoute(route, routeMeta[i]);
      mesh.userData = { from: route.fromCityId, to: route.toCityId, date: route.date };
      this.routeMeshes.push(mesh);
      this.scene.add(mesh);
    }

    this.petals = this.reduced ? null : new PetalField(small ? SAKURA_LOOK.mobileCount : SAKURA_LOOK.desktopCount);
    if (this.petals) this.scene.add(this.petals.points);

    const props = loadPropAssets({ signal: this.modelAbort.signal })
      .then((assets) => {
        if (!this.disposed && Object.keys(assets).length > 0) this.decor.useProps(assets);
      })
      .catch(() => {
        /* Procedural set dressing stays. */
      });

    const models = hydrateGltfModels({
      scene: this.scene,
      cities: prepared.cities,
      shadows: !small,
      signal: this.modelAbort.signal,
    }).catch(() => {
      /* Procedural tray/blocks stay in the scene. */
    });

    this.showRoutesFor(null);
    this.ready = Promise.allSettled([props, models]).then(() => undefined);

    // Stop drawing while the tab is hidden or the iframe is scrolled offscreen (battery).
    document.addEventListener("visibilitychange", this.onVisibility);
    if (typeof IntersectionObserver !== "undefined") {
      this.visibilityObserver = new IntersectionObserver((entries) => {
        this.setPaused(!entries.some((entry) => entry.isIntersecting));
      });
      this.visibilityObserver.observe(host);
    }

    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
    this.renderer.domElement.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("resize", this.onResize);
    this.tick();
  }

  /**
   * Arcs follow the calendar instead of showing the whole trip at once:
   * overview → today's legs (every leg once the trip is over, as a recap),
   * city → legs touching it on its days, city + day → that day's legs.
   */
  private showRoutesFor(selection: Selection | null) {
    const { today, trip, cities } = this.prepared;
    const live = today >= trip.starts_at && today <= trip.ends_at;
    const city = selection ? cities.find((c) => c.id === selection.cityId) : undefined;
    const days = selection?.date ? [selection.date] : city ? city.dates : live ? [today] : null;
    for (const mesh of this.routeMeshes) {
      const { from, to, date } = mesh.userData as { from: string; to: string; date: string | null };
      const touches = !city || selection?.date || from === city.id || to === city.id;
      mesh.visible = date !== null && Boolean(touches) && (days === null || days.includes(date));
    }
  }

  focus(selection: Selection | null) {
    this.showRoutesFor(selection);
    if (!selection) {
      this.goalPos.copy(this.overviewPos);
      this.goalTarget.copy(OVERVIEW.target);
      this.animating = true;
      return;
    }
    const city = this.scene.getObjectByName(`city:${selection.cityId}`);
    if (!city) return;
    const world = new THREE.Vector3();
    city.getWorldPosition(world);
    const compact = isSmallScreen();
    const lift = selection.date ? (compact ? 4.4 : 2.7) : compact ? 5.4 : 3.4;
    this.goalTarget.set(world.x, 0.15, world.z);
    this.goalPos.set(world.x + (compact ? 0.55 : 1.15), lift, world.z + (compact ? 4.1 : 2.35));
    this.animating = true;
  }

  private fitOverview() {
    const dist = overviewDistance(this.camera.aspect, this.camera.fov, this.contentHalfWidth);
    this.overviewPos.copy(OVERVIEW.position).sub(OVERVIEW.target).setLength(dist).add(OVERVIEW.target);
    this.controls.maxDistance = Math.max(OVERVIEW_BASE_DISTANCE, dist);
  }

  nudgeZoom(direction: number) {
    const next = this.camera.position.distanceTo(this.controls.target) - direction * 0.85;
    const clamped = THREE.MathUtils.clamp(next, this.controls.minDistance, this.controls.maxDistance);
    const offset = this.camera.position.clone().sub(this.controls.target).setLength(clamped);
    this.goalPos.copy(this.controls.target).add(offset);
    this.animating = true;
  }

  private onPointerDown = (event: PointerEvent) => {
    this.pointerDown = { x: event.clientX, y: event.clientY };
  };

  private onPointerUp = (event: PointerEvent) => {
    if (!this.pointerDown) return;
    const dx = event.clientX - this.pointerDown.x;
    const dy = event.clientY - this.pointerDown.y;
    this.pointerDown = null;
    if (Math.hypot(dx, dy) > 10) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables, false);
    const hit = hits[0];
    if (!hit) {
      this.onPick(null);
      return;
    }
    const data = hit.object.userData as { cityId?: string };
    if (data.cityId) this.onPick({ cityId: data.cityId });
  };

  private onResize = () => {
    const host = this.renderer.domElement.parentElement;
    if (!host) return;
    const { clientWidth: w, clientHeight: h } = host;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    const wasOverview = this.goalPos.distanceTo(this.overviewPos) < 0.05;
    this.fitOverview();
    if (wasOverview) {
      this.goalPos.copy(this.overviewPos);
      this.animating = true;
    }
  };

  private onVisibility = () => {
    this.setPaused(document.hidden);
  };

  private setPaused(paused: boolean) {
    if (paused === this.paused || this.disposed) return;
    this.paused = paused;
    if (paused) {
      cancelAnimationFrame(this.raf);
    } else {
      this.clock.getDelta(); // drop the time spent paused
      this.tick();
    }
  }

  private tick = () => {
    if (this.disposed || this.paused) return;
    this.raf = requestAnimationFrame(this.tick);
    const delta = Math.min(this.clock.getDelta(), 0.05);
    if (this.animating && !this.reduced) {
      // Per-frame factors tuned at 60fps; scale by delta so slow devices still converge.
      const frames = delta * 60;
      this.camera.position.lerp(this.goalPos, 1 - Math.pow(1 - 0.08, frames));
      this.controls.target.lerp(this.goalTarget, 1 - Math.pow(1 - 0.1, frames));
      if (this.camera.position.distanceTo(this.goalPos) < 0.04) this.animating = false;
    } else if (this.animating && this.reduced) {
      this.camera.position.copy(this.goalPos);
      this.controls.target.copy(this.goalTarget);
      this.animating = false;
    }
    if (!this.reduced) this.decor.update(this.clock.elapsedTime, delta);
    this.petals?.update(delta);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    this.modelAbort.abort();
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.visibilityObserver?.disconnect();
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
    this.renderer.domElement.removeEventListener("pointerup", this.onPointerUp);
    this.controls.dispose();
    disposeObject3D(this.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
