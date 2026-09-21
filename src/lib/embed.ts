/** Hosts allowed to frame this app (also listed in vercel.json CSP). */
export const FRAME_ANCESTORS = [
  "https://jojo-in-runtime.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
] as const;

/**
 * Embed when `?embed=1` / `?embed=true`, or when running inside a cross-origin iframe.
 * Standalone opens keep full chrome; portfolio Works pages pass `?embed=1`.
 */
export function isEmbedMode(
  search = typeof window !== "undefined" ? window.location.search : "",
  framed = typeof window !== "undefined" ? window.self !== window.top : false,
): boolean {
  const params = new URLSearchParams(search);
  const flag = params.get("embed");
  if (flag === "1" || flag === "true") return true;
  if (flag === "0" || flag === "false") return false;
  return framed;
}

export function standaloneUrl(
  href = typeof window !== "undefined" ? window.location.href : "https://japan-2026-diorama.vercel.app/",
): string {
  const url = new URL(href);
  url.searchParams.delete("embed");
  return url.toString();
}
