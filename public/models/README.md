# Diorama models

Optional glTF 2.0 binaries (`.glb`) for the Japan 2026 tray. The scene still builds from the procedural meshes in `src/scene/` — these files are overlays.

**Missing, empty, or invalid files fall back to the procedural mesh.** Invalid includes corrupt topology (far too few triangles vs vertices, or collapsed/empty geometry). Do not commit placeholder binaries.

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
| `haneda.glb` | Haneda Airport tile |
| `narita.glb` | Narita Airport tile |
| `bangkok.glb` | Suvarnabhumi (BKK) origin token, fitted to 1.5 × 1.25 × 0.95 at the Bangkok token |
| `tray.glb` | Wooden tray (optional) |

Served as `/models/{name}.glb`.

## Authoring

- One self-contained `.glb` per city id (no external `.bin` / `.png` sidecars).
- Keep textures small; the loader does not downsample at runtime (mobile). Do not reintroduce 60MB assets.
- Sit each city model on y = 0 in its own space. The app recenters XZ, sits the floor on the block, and uniformly scales it to the existing catalog footprint and tray slot.
- `tray.glb` is scaled to the current wooden base (~11.6 × 9.4) and placed under the city blocks.

## Current files (textured Tripo exports)

The committed city `*.glb` files are self-contained Tripo meshes with embedded color maps and UVs. Tokyo and Yokohama are real triangle meshes (not the old truncated-index point clouds).

The loader keeps those maps. Vertex paint in `src/scene/paint.ts` only runs on untextured materials; any PBR map (`map`, `normalMap`, …) skips stylization. Topology that is empty, collapsed, or far too sparse still falls back to the procedural block.

| File | Size |
| --- | ---: |
| `tokyo.glb` | 920 KiB |
| `yokohama.glb` | 846 KiB |
| `kamakura.glb` | 870 KiB |
| `enoshima.glb` | 831 KiB |
| `chiba.glb` | 5.74 MiB |
| `takao.glb` | 5.55 MiB |
| `kawagoe.glb` | 5.85 MiB |

## Airports (`haneda.glb`, `narita.glb`)

Generated in Tripo3D (text to 3D), then reduced for the tray: the raw exports are ~1.95M triangles and ~60 MB, and texture seams block glTF-transform's simplifier. They were decimated to 30k triangles with MeshLab quadric edge collapse, with the texture baked to per-vertex colors (`COLOR_0`) and normals kept, then packed with `gltf-transform optimize --compress meshopt --simplify false` (~160 KB each). Because they carry vertex colors instead of a texture map, `topology` tests that require embedded textures skip them. Do not commit the raw Tripo exports.

## Compression

All `.glb` files are packed with meshopt geometry + WebP textures (~11MB → ~3.4MB total). After replacing a model, re-run:

```bash
npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress webp --simplify false
```

`tryLoadGltf` registers `MeshoptDecoder`, so compressed and uncompressed files both load.
