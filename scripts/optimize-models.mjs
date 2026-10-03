#!/usr/bin/env node
/**
 * Shrink Tripo GLB exports and drop them into public/models/.
 *
 *   npm run optimize-models                    # every .glb in scripts/raw/
 *   npm run optimize-models -- a.glb b.glb     # specific files
 *   npm run optimize-models -- a.glb --as haneda --texture-size 2048
 *
 * Pipeline: gltf-transform optimize, meshopt geometry + WebP textures, no simplify
 * (retopologize inside Tripo first; simplifying afterwards drops thin parts like wings
 * and scrambles UVs). Raw exports live in scripts/raw/ (gitignored) so they never land
 * in public/ or in a commit.
 *
 * Output name: the file name lowercased, with a trailing "_lowpoly" / "-lp" / "_raw"
 * removed and "+" / spaces turned into "_". Names starting with "tokyo-" are Tokyo
 * landmark props and go to public/models/props/. Use --as to choose the name.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rawDir = join(root, "scripts/raw");
const modelsDir = join(root, "public/models");

/** City tiles are ~9-15k triangles; warn when a model is far past that. */
const TRIANGLE_WARN = 40_000;
const SIZE_WARN_KB = 1500;

function parseArgs(argv) {
  const files = [];
  const options = { textureSize: "1024", as: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--as") options.as = argv[++i];
    else if (arg === "--texture-size") options.textureSize = argv[++i];
    else if (arg.startsWith("--")) throw new Error(`Unknown option ${arg}`);
    else files.push(arg);
  }
  return { files, options };
}

function outputPath(input, as) {
  const stem = (as ?? basename(input, extname(input)))
    .toLowerCase()
    .replace(/[+\s]+/g, "_")
    .replace(/(_lowpoly|-lowpoly|_lp|-lp|_raw|-raw)$/, "");
  const dir = stem.startsWith("tokyo-") ? join(modelsDir, "props") : modelsDir;
  return join(dir, `${stem}.glb`);
}

function gltfTransform(args) {
  return execFileSync("npx", ["--yes", "@gltf-transform/cli", ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/** Triangle count from `gltf-transform inspect --format csv` (glPrimitives per mesh). */
function triangleCount(file) {
  const lines = gltfTransform(["inspect", file, "--format", "csv"]).split("\n");
  const start = lines.findIndex((line) => line.startsWith("#,name,mode"));
  if (start < 0) return null;
  const header = lines[start].split(",");
  const column = header.indexOf("glPrimitives");
  let total = 0;
  for (const line of lines.slice(start + 1)) {
    if (!/^\d+,/.test(line)) break;
    const value = Number(line.split(",")[column]?.replaceAll('"', "").replaceAll(" ", ""));
    if (Number.isFinite(value)) total += value;
  }
  return total;
}

function main() {
  const { files, options } = parseArgs(process.argv.slice(2));
  const inputs =
    files.length > 0
      ? files.map((file) => resolve(file))
      : existsSync(rawDir)
        ? readdirSync(rawDir)
            .filter((name) => name.toLowerCase().endsWith(".glb"))
            .map((name) => join(rawDir, name))
        : [];

  if (inputs.length === 0) {
    console.error(`No .glb files. Put Tripo exports in ${rawDir} or pass paths.`);
    process.exit(1);
  }
  if (options.as && inputs.length > 1) {
    console.error("--as needs exactly one input file.");
    process.exit(1);
  }
  mkdirSync(rawDir, { recursive: true });

  let failed = false;
  for (const input of inputs) {
    if (!existsSync(input)) {
      console.error(`Missing ${input}`);
      failed = true;
      continue;
    }
    const output = outputPath(input, options.as);
    if (resolve(input) === resolve(output)) {
      console.error(`${input} is already the output file; move the raw export to scripts/raw/ first.`);
      failed = true;
      continue;
    }
    mkdirSync(dirname(output), { recursive: true });

    const before = statSync(input).size;
    const trianglesIn = triangleCount(input);
    gltfTransform([
      "optimize",
      input,
      output,
      "--compress",
      "meshopt",
      "--texture-compress",
      "webp",
      "--texture-size",
      options.textureSize,
      "--simplify",
      "false",
    ]);
    const after = statSync(output).size;
    const trianglesOut = triangleCount(output);

    const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;
    console.log(
      `${basename(input)} -> ${output.replace(`${root}/`, "")}: ${kb(before)} -> ${kb(after)}, ` +
        `${trianglesOut?.toLocaleString() ?? "?"} triangles`,
    );
    if (trianglesOut && trianglesOut > TRIANGLE_WARN) {
      console.warn(
        `  warning: ${trianglesOut.toLocaleString()} triangles is heavy for a tile (source had ` +
          `${trianglesIn?.toLocaleString() ?? "?"}). Retopologize to ~10-15k in Tripo, then rerun.`,
      );
    }
    if (after / 1024 > SIZE_WARN_KB) {
      console.warn(`  warning: ${kb(after)} is large; try --texture-size 512 or a lower triangle count.`);
    }
  }
  if (failed) process.exit(1);
}

main();
