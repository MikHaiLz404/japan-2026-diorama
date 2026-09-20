import * as THREE from "three";
import { palette } from "./palette";

/** Aide/Vodka style 2: tiny Liberogic dust. Not realistic petals, not off. */
export const SAKURA_LOOK = {
  size: 0.024,
  opacity: 0.42,
  mobileCount: 12,
  desktopCount: 28,
} as const;

export class PetalField {
  readonly points: THREE.Points;
  private readonly velocities: Float32Array;
  private readonly positions: Float32Array;

  constructor(count: number) {
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      this.positions[i * 3] = (Math.random() - 0.5) * 10;
      this.positions[i * 3 + 1] = 0.4 + Math.random() * 3.2;
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
      this.velocities[i] = 0.12 + Math.random() * 0.22;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    const material = new THREE.PointsMaterial({
      color: palette.blossom,
      size: SAKURA_LOOK.size,
      transparent: true,
      opacity: SAKURA_LOOK.opacity,
      depthWrite: false,
    });
    this.points = new THREE.Points(geometry, material);
    this.points.name = "petals";
  }

  update(delta: number) {
    for (let i = 0; i < this.velocities.length; i += 1) {
      this.positions[i * 3] += Math.sin(this.positions[i * 3 + 1] * 2 + i) * delta * 0.15;
      this.positions[i * 3 + 1] -= this.velocities[i] * delta;
      if (this.positions[i * 3 + 1] < 0.12) {
        this.positions[i * 3 + 1] = 3.4;
        this.positions[i * 3] = (Math.random() - 0.5) * 10;
        this.positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
      }
    }
    const attr = this.points.geometry.getAttribute("position");
    attr.needsUpdate = true;
  }
}
