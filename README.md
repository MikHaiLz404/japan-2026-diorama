# Japan 2026 Replay

A 3D map of the **Japan 2026** trip (17–27 Sep 2026). Pick a day or press **เล่นทริป** to replay the trip stop by stop:
the camera follows the real rail lines, and the map is lit by the real sun at each moment — bright at noon, golden at
sunset, city lights at night. Landmarks the trip reached are modelled in three.js with Apple Maps–style badges.

Source of truth: **Tripsy trip `1213687`**. Receipt-accurate times live in Notion and are kept in sync into Tripsy
(a receipt's time is when a visit *ended*; start times are shifted back from it).

The earlier Three.js diorama is kept at git tag `diorama-v1`.

## Setup

```bash
npm install
npm run dev
```

```bash
npm test          # vitest: geo, trip shaping, sun, palette, landmarks, replay timeline
npm run build     # tsc --noEmit && vite build
```

No API keys are required. Basemap tiles come from [OpenFreeMap](https://openfreemap.org), terrain from the AWS
terrarium DEM.

## Stack

- Vite + TypeScript
- [MapLibre GL JS](https://maplibre.org) 4 — basemap, POIs, routes, replay trail
- three.js — landmark models in a MapLibre custom layer
- Static Vercel deploy (`vercel.json` → `dist`)

## Layout

```text
src/
  data/      trip.ts (fixture → stops, legs, days), japan-2026.json, routes.json, scramble.json
  map/       style (palettes), sun, lighting, landmarks + builders + landmarkLayer, tripLayers, scramble
  replay/    timeline (pure, tested) + player (camera / trail)
  ui/        panel (day strip, list, mobile sheet), playbar (replay controls, clock, day card)
  lib/       geo, embed, motion
```

## Interaction

- **Day strip** — tap a day (mouse wheel / drag / ←→ also scroll it); the map dims other days and fits the day
- **เล่นทริป** — replay with play/pause, previous/next stop, scrubber with day ticks, 1×/2×/4×; Space / Esc
- Tap a landmark badge or list row to fly there; ⟳ orbits, 2D/3D toggles pitch
- Mobile: the panel is a bottom sheet with three snap points
- The camera can't zoom out past the Kantō trip area (`minZoom` 8.5 + `maxBounds`)

## Data

Only what actually happened is shown: undated Tripsy entries (dropped plans) are ignored, and a landmark appears only
if a dated stop is within 400 m of it or named after it.

### Refresh trip data

1. Use the Tripsy MCP for trip `1213687` (`tripsy_trips_show`, `tripsy_activities_list`, `tripsy_hostings_list`,
   `tripsy_transportations_list`) and save the JSON envelopes to `scripts/cache/` as `trip.json`, `activities.json`,
   `hostings.json`, `transportations.json`
2. `npm run refresh-data` → `src/data/japan-2026.json`
3. `npm run build-routes` → `src/data/routes.json` (snaps train legs to OSM rail via Overpass — cached in
   `scripts/cache/rail.json` — and bus legs to roads via OSRM; anything implausible falls back to an arc)

`npm run fetch-scramble` re-pulls the Shibuya crosswalk geometry from OSM (rarely needed).

## Deploy

Static Vite app on Vercel; `npm run build` emits `dist/`.

## Embed in jojo-in-runtime

`https://japan-2026-replay.vercel.app/?embed=1` — compact chrome plus an **Open fullscreen** link.
`frame-ancestors` allows `jojo-in-runtime.vercel.app` and Vercel previews. See
[`docs/jojo-in-runtime-integration.md`](docs/jojo-in-runtime-integration.md).
