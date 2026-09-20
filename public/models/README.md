# Diorama models

Optional glTF 2.0 binaries (`.glb`) for the Japan 2026 tray. The scene still builds from the procedural meshes in `src/scene/` — these files are overlays.

**Missing, empty, or invalid files fall back to the procedural mesh.** Do not commit placeholder binaries.

## Expected filenames

| File | Used for |
| --- | --- |
| `tokyo.glb` | Tokyo city block |
| `yokohama.glb` | Yokohama |
| `kamakura.glb` | Kamakura |
| `enoshima.glb` | Enoshima |
| `chiba.glb` | Chiba |
| `takao.glb` | Takao |
| `kawagoe.glb` | Kawagoe |
| `tray.glb` | Wooden tray (optional) |

Served as `/models/{name}.glb`.

## Authoring

- One self-contained `.glb` per city id (no external `.bin` / `.png` sidecars).
- Keep textures small; the loader does not downsample at runtime (mobile). Do not reintroduce 60MB assets.
- Sit each city model on y = 0 in its own space. The app recenters XZ, sits the floor on the block, and uniformly scales it to the existing catalog footprint and tray slot.
- `tray.glb` is scaled to the current wooden base (~11.6 × 9.4) and placed under the city blocks.

## Current files (untextured remesh)

The committed `*.glb` files were remeshed for size: one `low_poly_matte` material, **no images / textures / vertex colors**. They stay mobile-friendly (~0.7–1.5 MiB each).

Until new **textured** city GLBs are authored (self-contained, still under a few MiB), the runtime paints stylized PBR + vertex colors in `src/scene/paint.ts` so buildings read as cream/terracotta miniatures instead of flat gray. If a later GLB includes an albedo map, that texture is left as-is.

**Wanted later (not required to run the app, no Tripo login in CI):** per-city GLBs with small baked color maps that match the Liberogic cream tray. Swap the files in this folder; the loader already falls back if a file is missing or invalid.
