import type { VisitStatus } from "../data/types";

export const palette = {
  wood: 0x8a5a38,
  woodLight: 0xc08a54,
  woodRim: 0x5c3a24,
  moss: 0x73825a,
  mossDeep: 0x5c6948,
  sand: 0xd7c4a3,
  ceramic: 0xf3e6d4,
  roof: 0x8b3a2a,
  pine: 0x3f5a38,
  blossom: 0xf2b6c6,
  water: 0x7ea8b0,
  brass: 0xc4a15a,
  flight: 0xd9c7a1,
  ink: 0x2c2118,
};

export function cityColors(status: VisitStatus): {
  body: number;
  roof: number;
  emissive: number;
  emissiveIntensity: number;
  opacity: number;
} {
  if (status === "today") {
    return {
      body: 0x2a3a66,
      roof: 0x1c2748,
      emissive: 0x1a2448,
      emissiveIntensity: 0.1,
      opacity: 1,
    };
  }
  if (status === "visited") {
    return {
      body: 0x8a8f98,
      roof: 0x6e7380,
      emissive: 0x000000,
      emissiveIntensity: 0,
      opacity: 1,
    };
  }
  return {
    body: 0xb4b8c0,
    roof: 0x9aa0a8,
    emissive: 0x000000,
    emissiveIntensity: 0,
    opacity: 0.82,
  };
}

export function pathColor(status: VisitStatus, kind: string): number {
  if (kind === "airplane") return status === "upcoming" ? 0xc5c8ce : 0x8a90a0;
  return status === "upcoming" ? 0xb4b8c0 : 0x8a8f98;
}
