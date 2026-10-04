// Japan 2026 landmark catalogue. Positions are checked against OSM; `hide` / `osm` are OSM way ids.
import * as B from "../../map/builders";
import type { Landmark } from "../../map/landmarks";

export const LANDMARKS: Landmark[] = [
  { id: "skytree", name: "Tokyo Skytree", at: [139.81071, 35.71005], top: 650, rank: 0, icon: "needle", build: B.skytree,
    hide: [288269147, 288269148, 362351415] },
  { id: "sensoji", name: "Sensō-ji", at: [139.79604, 35.7141], top: 58, scale: 1.25, rank: 1, icon: "pagoda",
    build: () => B.pagoda(5, 11, 8.4), hide: [173154770] },
  { id: "hozomon", name: "Hōzōmon", at: [139.79666, 35.71393], top: 22, rank: 9, icon: "gate", quiet: true,
    build: () => B.gate(22, 21.7, 2.2), rotate: 0.12, hide: [573271561] },
  { id: "kaminarimon", name: "Kaminarimon", at: [139.79637, 35.71113], top: 12, scale: 1.6, rank: 2, icon: "gate",
    build: () => B.gate(12, 11.7, 1.9), rotate: 0.12, hide: [173154849] },
  // Crosswalks + pedestrians are map layers (./scramble.ts); this entry is the badge only.
  { id: "scramble", name: "Shibuya Scramble", at: [139.70048, 35.65952], top: 18, rank: 1, icon: "cross" },
  { id: "shibuyasky", name: "Shibuya Sky", at: [139.70222, 35.65838], top: 230, rank: 2, icon: "glass", tint: "#8ea6d6", osm: [617560918] },
  { id: "teamlab", name: "teamLab Planets", at: [139.78973, 35.64938], top: 44, rank: 2, icon: "orbs", build: B.orbs, match: /teamlab/i },
  { id: "daibutsu", name: "Kamakura Daibutsu", at: [139.53572, 35.31685], top: 19, scale: 3.5, rank: 0, icon: "buddha", build: B.daibutsu },
  { id: "hasedera", name: "Hase-dera", at: [139.533, 35.31246], top: 15, scale: 1.4, rank: 1, icon: "temple",
    build: () => B.hall(22, 16, 14), hide: [767740070] },
  { id: "seacandle", name: "Enoshima Sea Candle", at: [139.47848, 35.29976], top: 62, scale: 1.4, rank: 0, icon: "light", build: B.seaCandle },
  { id: "cosmoclock", name: "Cosmo Clock 21", at: [139.63677, 35.45539], top: 118, rank: 0, icon: "wheel", build: B.cosmoClock,
    rotate: 2.1, hide: [363854124] },
  { id: "redbrick", name: "Red Brick Warehouse", at: [139.64292, 35.4524], top: 22, rank: 1, icon: "brick", tint: "#b9553c", osm: [72998296] },
];
