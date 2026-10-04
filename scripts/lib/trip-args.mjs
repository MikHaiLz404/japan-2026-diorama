// Shared CLI parsing for the per-trip data scripts:  --trip <slug>  (required)
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

export function flag(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

/** Resolve --trip into its source folder (src/trips/<slug>) and cache folder (scripts/cache/<slug>). */
export function tripPaths({ mustExist = true } = {}) {
  const slug = flag("trip");
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    console.error("Usage: --trip <slug>   (folder name under src/trips/, e.g. japan-2026)");
    process.exit(1);
  }
  const dir = join(root, "src/trips", slug);
  if (mustExist && !existsSync(dir)) {
    console.error(`No trip folder ${dir} — create it first (copy src/trips/japan-2026 as a template).`);
    process.exit(1);
  }
  return { slug, dir, cache: join(root, "scripts/cache", slug), fixture: join(dir, "trip.json") };
}
