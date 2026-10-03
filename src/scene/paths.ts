import * as THREE from "three";
import type { RoutePath } from "../data/types";
import { ORIGIN_TOKEN, cityById } from "../data/cities";
import { pathColor } from "./palette";

export interface RouteRenderOptions {
  /** Index among all routes — used to stagger height and lateral offset. */
  index: number;
  /** How many routes share the same city pair (for fan-out). */
  parallelCount: number;
  /** Slot within the parallel group (0..parallelCount-1). */
  parallelIndex: number;
}

function trayPoint(cityId: string): THREE.Vector3 {
  if (cityId === ORIGIN_TOKEN.id) {
    return new THREE.Vector3(ORIGIN_TOKEN.tray[0], 0.12, ORIGIN_TOKEN.tray[1]);
  }
  const city = cityById(cityId);
  if (!city) return new THREE.Vector3();
  return new THREE.Vector3(city.tray[0], 0.12, city.tray[1]);
}

function routeOffset(
  from: THREE.Vector3,
  to: THREE.Vector3,
  options: RouteRenderOptions,
): { from: THREE.Vector3; to: THREE.Vector3 } {
  const dir = to.clone().sub(from);
  const len = dir.length();
  if (len < 1e-4) return { from, to };

  dir.normalize();
  const perp = new THREE.Vector3(-dir.z, 0, dir.x);
  const slot = options.parallelIndex - (options.parallelCount - 1) / 2;
  const lateral = slot * 0.14;
  const indexLift = options.index * 0.045;

  return {
    from: from.clone().add(perp.clone().multiplyScalar(lateral)),
    to: to.clone().add(perp.clone().multiplyScalar(lateral)).add(new THREE.Vector3(0, indexLift, 0)),
  };
}

/** Thin, faint lines at rest; a day pick thickens, saturates and lights them up. */
export const ROUTE_LOOK = {
  flightRadius: 0.011,
  groundRadius: 0.014,
  /** Extra tube radius at full emphasis (pushed out along the tube normal). */
  emphasisThickness: 0.004,
  faintAlpha: 0.34,
  strongAlpha: 0.92,
  /** How much of the line colour is washed toward white when idle. */
  faintWash: 0.4,
  growSeconds: 1.1,
  /** Pulse laps per second and the length of its fading tail. */
  pulseSpeed: 0.28,
  pulseTail: 9,
  fadeSeconds: 0.35,
} as const;

const ROUTE_VERTEX = /* glsl */ `
  uniform float uEmphasis;
  uniform float uThickness;
  varying float vProgress;
  void main() {
    vProgress = uv.x;
    vec3 displaced = position + normal * uThickness * uEmphasis;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const ROUTE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uEmphasis;
  uniform float uGrow;
  uniform float uTime;
  uniform float uFaintAlpha;
  uniform float uStrongAlpha;
  uniform float uFaintWash;
  uniform float uPulseSpeed;
  uniform float uPulseTail;
  uniform float uPulseAmount;
  varying float vProgress;
  void main() {
    if (vProgress > uGrow) discard;

    vec3 faint = mix(uColor, vec3(1.0), uFaintWash);
    vec3 color = mix(faint, uColor, uEmphasis);
    float alpha = mix(uFaintAlpha, uStrongAlpha, uEmphasis);

    // Bright growing tip while the line is still drawing in.
    float tip = (1.0 - smoothstep(0.0, 0.06, uGrow - vProgress)) * step(uGrow, 0.999) * uEmphasis;
    // A light that laps the line, fading behind its head.
    float behind = fract(uTime * uPulseSpeed - vProgress);
    float pulse = exp(-behind * uPulseTail) * uPulseAmount * uEmphasis;

    color = mix(color, vec3(1.0, 0.97, 0.9), clamp(pulse * 0.75 + tip * 0.6, 0.0, 0.85));
    alpha = clamp(alpha + pulse * 0.25 + tip * 0.2, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export interface RouteAnimation {
  /** 0 = faint idle line, 1 = picked-day highlight. */
  emphasis: number;
  targetEmphasis: number;
  /** 0..1 how much of the line has been drawn. */
  grow: number;
}

function routeAnimation(mesh: THREE.Mesh): RouteAnimation {
  return (mesh.userData as { anim: RouteAnimation }).anim;
}

function routeUniforms(mesh: THREE.Mesh): Record<string, THREE.IUniform> {
  return (mesh.material as THREE.ShaderMaterial).uniforms;
}

export function makeRoute(route: RoutePath, options: RouteRenderOptions): THREE.Mesh {
  let from = trayPoint(route.fromCityId);
  let to = trayPoint(route.toCityId);

  const fromOrigin = route.fromCityId === ORIGIN_TOKEN.id;
  if (fromOrigin || route.toCityId === ORIGIN_TOKEN.id) {
    // International legs stop at the edge of the Japanese tile, on the side facing Bangkok.
    const japan = fromOrigin ? to : from;
    const home = fromOrigin ? from : to;
    const gap = Math.min(0.6, japan.distanceTo(home) * 0.3);
    japan.addScaledVector(home.clone().sub(japan).setY(0).normalize(), gap);
  } else {
    ({ from, to } = routeOffset(from, to, options));
  }

  const mid = from.clone().lerp(to, 0.5);
  const isFlight = route.type === "airplane";
  const lift = isFlight ? 1.85 + options.index * 0.12 : 0.34 + options.index * 0.07;
  mid.y += lift;

  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  const radius = isFlight ? ROUTE_LOOK.flightRadius : ROUTE_LOOK.groundRadius;
  const geometry = new THREE.TubeGeometry(curve, isFlight ? 48 : 32, radius, 5, false);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(pathColor(route.status, route.type)) },
      uEmphasis: { value: 0 },
      uGrow: { value: 1 },
      uTime: { value: 0 },
      uThickness: { value: ROUTE_LOOK.emphasisThickness },
      uFaintAlpha: { value: ROUTE_LOOK.faintAlpha },
      uStrongAlpha: { value: ROUTE_LOOK.strongAlpha },
      uFaintWash: { value: ROUTE_LOOK.faintWash },
      uPulseSpeed: { value: ROUTE_LOOK.pulseSpeed },
      uPulseTail: { value: ROUTE_LOOK.pulseTail },
      uPulseAmount: { value: 1 },
    },
    vertexShader: ROUTE_VERTEX,
    fragmentShader: ROUTE_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const tube = new THREE.Mesh(geometry, material);
  tube.name = `route:${route.id}`;
  tube.renderOrder = 2;
  tube.userData = { anim: { emphasis: 0, targetEmphasis: 0, grow: 1 } satisfies RouteAnimation };
  return tube;
}

/**
 * Mark a route as picked (grow in + light loop) or idle (faint, fully drawn).
 * `restart` replays the draw-in even when the route was already picked.
 */
export function setRouteEmphasis(mesh: THREE.Mesh, emphasized: boolean, restart: boolean): void {
  const anim = routeAnimation(mesh);
  const wasEmphasized = anim.targetEmphasis > 0.5;
  anim.targetEmphasis = emphasized ? 1 : 0;
  if (emphasized && (!wasEmphasized || restart)) anim.grow = 0;
  if (!emphasized) anim.grow = 1;
}

/** Advance grow / fade / pulse. With reduced motion, states snap and the light stays still. */
export function updateRoute(mesh: THREE.Mesh, delta: number, elapsed: number, reduced: boolean): void {
  const anim = routeAnimation(mesh);
  if (reduced) {
    anim.grow = 1;
    anim.emphasis = anim.targetEmphasis;
  } else {
    anim.grow = Math.min(1, anim.grow + delta / ROUTE_LOOK.growSeconds);
    const step = delta / ROUTE_LOOK.fadeSeconds;
    anim.emphasis += Math.sign(anim.targetEmphasis - anim.emphasis) * Math.min(step, Math.abs(anim.targetEmphasis - anim.emphasis));
  }
  const uniforms = routeUniforms(mesh);
  // Ease-out so the line races out and settles into place.
  uniforms.uGrow.value = 1 - Math.pow(1 - anim.grow, 3);
  uniforms.uEmphasis.value = anim.emphasis;
  uniforms.uTime.value = elapsed;
  uniforms.uPulseAmount.value = reduced ? 0 : 1;
}

/** Count parallel routes per unordered city pair for ribbon fan-out. */
export function routeParallelMeta(routes: RoutePath[]): RouteRenderOptions[] {
  const groups = new Map<string, number[]>();
  routes.forEach((route, index) => {
    if (route.fromCityId === ORIGIN_TOKEN.id || route.toCityId === ORIGIN_TOKEN.id) {
      groups.set(`origin:${route.id}`, [index]);
      return;
    }
    const key = [route.fromCityId, route.toCityId].sort().join("<->");
    const list = groups.get(key) ?? [];
    list.push(index);
    groups.set(key, list);
  });

  const parallelCount = new Array<number>(routes.length).fill(1);
  const parallelIndex = new Array<number>(routes.length).fill(0);
  for (const indices of groups.values()) {
    for (let slot = 0; slot < indices.length; slot += 1) {
      parallelCount[indices[slot]] = indices.length;
      parallelIndex[indices[slot]] = slot;
    }
  }

  return routes.map((_, index) => ({
    index,
    parallelCount: parallelCount[index],
    parallelIndex: parallelIndex[index],
  }));
}
