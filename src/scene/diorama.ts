import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Selection } from "../data/types";
import { ORIGIN_TOKEN } from "../data/cities";
import type { PreparedTrip } from "../data/loadTrip";
import { isMobileLayout, isSmallScreen, prefersReducedMotion } from "../lib/platform";
import { makeDecor, type Decor } from "./decor";
import { makeCityBlock, makeDayPlate, makeLabel, makeOriginToken, makeTray, platformSize } from "./meshes";
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

export class Diorama {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly clock = new THREE.Clock();
  private readonly pickables: THREE.Object3D[] = [];
  private readonly goalPos = OVERVIEW.position.clone();
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
    this.camera.position.copy(OVERVIEW.position);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 2.4;
    this.controls.maxDistance = 14;
    this.controls.maxPolarAngle = Math.PI * 0.46;
    this.controls.target.copy(OVERVIEW.target);
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

      if (city.id === "tokyo" && !mobile) {
        city.plates.forEach((plate, index) => {
          const tile = makeDayPlate(city, plate.date, index, plate.status);
          block.add(tile);
          this.pickables.push(tile);
        });
      }

      const { d } = platformSize(city.size);
      const label = makeLabel(
        city.name,
        city.id,
        city.status === "upcoming",
      );
      label.position.set(0, city.size === "lg" ? 1.55 : 0.95, d * 0.02);
      if (mobile) label.scale.multiplyScalar(0.72);
      block.add(label);
    }

    const routeMeta = routeParallelMeta(prepared.routes);
    for (let i = 0; i < prepared.routes.length; i += 1) {
      this.scene.add(makeRoute(prepared.routes[i], routeMeta[i]));
    }

    this.petals = this.reduced ? null : new PetalField(small ? SAKURA_LOOK.mobileCount : SAKURA_LOOK.desktopCount);
    if (this.petals) this.scene.add(this.petals.points);

    void loadPropAssets({ signal: this.modelAbort.signal })
      .then((assets) => {
        if (!this.disposed && Object.keys(assets).length > 0) this.decor.useProps(assets);
      })
      .catch(() => {
        /* Procedural set dressing stays. */
      });

    void hydrateGltfModels({
      scene: this.scene,
      cities: prepared.cities,
      shadows: !small,
      signal: this.modelAbort.signal,
    }).catch(() => {
      /* Procedural tray/blocks stay in the scene. */
    });

    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
    this.renderer.domElement.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("resize", this.onResize);
    this.tick();
  }

  focus(selection: Selection | null) {
    if (!selection) {
      this.goalPos.copy(OVERVIEW.position);
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
    const data = hit.object.userData as { kind?: string; cityId?: string; date?: string };
    if (data.kind === "plate" && data.cityId && data.date) {
      this.onPick({ cityId: data.cityId, date: data.date });
      return;
    }
    if (data.cityId) this.onPick({ cityId: data.cityId });
  };

  private onResize = () => {
    const host = this.renderer.domElement.parentElement;
    if (!host) return;
    const { clientWidth: w, clientHeight: h } = host;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private tick = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.tick);
    const delta = Math.min(this.clock.getDelta(), 0.05);
    if (this.animating && !this.reduced) {
      this.camera.position.lerp(this.goalPos, 0.08);
      this.controls.target.lerp(this.goalTarget, 0.1);
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
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
    this.renderer.domElement.removeEventListener("pointerup", this.onPointerUp);
    this.controls.dispose();
    disposeObject3D(this.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
