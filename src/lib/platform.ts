export function isSmallScreen(width = window.innerWidth): boolean {
  return width < 768;
}

/** Matches CSS `@media (max-width: 859px)` — compact overlay chrome. */
export function isMobileLayout(width = window.innerWidth): boolean {
  return width <= 859;
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}
