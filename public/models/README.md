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
- Keep textures small; the loader does not downsample at runtime (mobile).
- Sit each city model on y = 0 in its own space. The app recenters XZ, sits the floor on the block, and uniformly scales it to the existing catalog footprint and tray slot.
- `tray.glb` is scaled to the current wooden base (~11.6 × 9.4) and placed under the city blocks.
