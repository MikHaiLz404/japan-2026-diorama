// Landmark badge glyphs (32×32) and POI category glyphs (24×24 paths).
import type { LandmarkIcon } from "./landmarks";
import type { Category } from "../data/trip";

export const ICONS: Record<LandmarkIcon, string> = {
  needle: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2v6M13.5 10h5l-1 4h-3zM12.5 14h7l-1.2 3h-4.6zM14.4 17h3.2l1.6 13h-6.4z" stroke="#cfe3ff" stroke-width="1.4" fill="#7fb8ff" stroke-linejoin="round"/></svg>',
  pagoda: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2v4M9 8h14l-3 3h-8zM8 14h16l-3 3H11zM7 20h18l-3 3H10zM12 23h8v6h-8z" fill="#ff5a4a" stroke="#fff" stroke-width=".8" stroke-linejoin="round"/></svg>',
  gate: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 9h24l-3 4H7zM8 13h16v15h-4v-8h-8v8H8z" fill="#ff5a4a" stroke="#fff" stroke-width=".8" stroke-linejoin="round"/><ellipse cx="16" cy="19" rx="3" ry="3.6" fill="#ffd27a"/></svg>',
  temple: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 14 16 5l13 9zM7 14h18v12H7zM4 26h24v2H4z" fill="#d79a6b" stroke="#fff" stroke-width=".8" stroke-linejoin="round"/></svg>',
  buddha: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="8" r="4" fill="#8fd1b6"/><path d="M8 27c0-7 3-12 8-12s8 5 8 12zM5 27h22v2H5z" fill="#8fd1b6"/></svg>',
  light: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M13 4h6v4h-6zM12 8h8v3h-8zM13.5 11h5l2 18h-9z" fill="#fff" stroke="#ffd27a" stroke-width="1"/><path d="M19 5l7-2M19 7l7 2" stroke="#ffd27a" stroke-width="1.4"/></svg>',
  wheel: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="14" r="10" fill="none" stroke="#ff7ad9" stroke-width="2"/><path d="M16 4v20M6 14h20M9 7l14 14M23 7 9 21" stroke="#9fd8ff" stroke-width="1"/><path d="M16 14l-5 15M16 14l5 15" stroke="#fff" stroke-width="1.5"/></svg>',
  cross: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 9h22M5 23h22M9 5v22M23 5v22" stroke="#fff" stroke-width="2.4" stroke-dasharray="2 1.6"/><path d="M8 8l16 16M24 8 8 24" stroke="#ffd27a" stroke-width="1.6" stroke-dasharray="2 1.6"/></svg>',
  orbs: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="11" cy="12" r="6" fill="#ff8ad8"/><circle cx="21" cy="11" r="5" fill="#7fd6ff"/><circle cx="17" cy="21" r="7" fill="#ffe27a" opacity=".9"/></svg>',
  glass: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 29V9l5-6 5 6v20z" fill="#9fc0ff" stroke="#fff" stroke-width=".9"/><path d="M13 12h6M13 16h6M13 20h6M13 24h6" stroke="#fff" stroke-width=".7" opacity=".7"/></svg>',
  brick: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 12h24v16H4z" fill="#c4583f" stroke="#fff" stroke-width=".9"/><path d="M4 17h24M4 22h24M10 12v5M18 17v5M24 12v5M12 22v6M22 22v6" stroke="#ffd9c7" stroke-width=".7"/><path d="M8 12V7h3v5M21 12V7h3v5" fill="#c4583f" stroke="#fff" stroke-width=".8"/></svg>',
};

export type GlyphName = Category | "walk" | "bus";

export const GLYPH: Record<GlyphName, string> = {
  food: "M7 3v7a2 2 0 0 0 1.5 1.9V21h2v-9.1A2 2 0 0 0 12 10V3h-1.3v6h-.9V3H8.2v6h-.9V3zM17.5 3C15.6 3 14 5.4 14 9v4h2v8h2V3z",
  cafe: "M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16.5 9.2h1.2a2.6 2.6 0 0 1 0 5.2h-1.6v-1.7h1.6a.9.9 0 0 0 0-1.8h-1.2zM4 19.5h12V21H4z",
  shop: "M5.5 8h13l-1 13h-11zM9 8V6.6a3 3 0 0 1 6 0V8h-1.6V6.6a1.4 1.4 0 0 0-2.8 0V8z",
  sight: "M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z",
  museum: "M12 2.5l9 4.2V8.5H3V6.7zM5 10h2.2v7H5zM10.9 10h2.2v7h-2.2zM16.8 10H19v7h-2.2zM3 18.3h18v2.2H3z",
  park: "M12 2.5l6 8h-3l4 5.5h-6V21h-2v-5H5l4-5.5H6z",
  stay: "M3 6h2.2v7H21v6h-2.2v-2.2H5.2V19H3zM7.6 8.2a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2zM11 8.5h7.5a2.5 2.5 0 0 1 2.5 2.5v.9H11z",
  transit: "M7 2.5h10a2.5 2.5 0 0 1 2.5 2.5v10a3 3 0 0 1-3 3l1.6 2.5h-2.3L14.3 18H9.7l-1.5 2.5H5.9L7.5 18a3 3 0 0 1-3-3V5A2.5 2.5 0 0 1 7 2.5zM7 5.5v4.5h10V5.5zM8 12.3a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zM16 12.3a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z",
  health: "M9.8 3.5h4.4v6.3h6.3v4.4h-6.3v6.3H9.8v-6.3H3.5V9.8h6.3z",
  misc: "M12 6.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z",
  walk: "M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9.8 8.8 7 22h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3A7 7 0 0 0 19 12v-2a5 5 0 0 1-4.3-2.4l-1-1.6a2 2 0 0 0-1.7-1c-.3 0-.5 0-.8.1L6 7.3V12h2V8.6z",
  bus: "M5 3h14a2 2 0 0 1 2 2v12a2 2 0 0 1-1 1.7V21h-2.5v-2h-11v2H4v-2.3A2 2 0 0 1 3 17V5a2 2 0 0 1 2-2zM5.5 6v5h13V6zM7 13.5a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zM17 13.5a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z",
};

export const glyphSvg = (name: GlyphName, fill = "#fff") =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="${fill}" d="${GLYPH[name]}"/></svg>`;
