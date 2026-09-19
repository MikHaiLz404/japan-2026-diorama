export function isSmallScreen(width = window.innerWidth): boolean {
  return width < 768;
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}
