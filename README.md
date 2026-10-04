# Trip Replay

3D maps of my trips. The home page lists every trip; each one opens at `/<slug>` (e.g. `/japan-2026`). Pick a day
or press **เล่นทริป** to replay the trip stop by stop. The camera follows the real rail lines, and the map is lit by
the real sun at each moment: bright at noon, golden at sunset, city lights at night. Landmarks the trip reached are
modelled in three.js with Apple Maps–style badges.

Source of truth for every trip: **Tripsy**. Receipt-accurate times live in Notion and are kept in sync into Tripsy
(a receipt's time is when a visit *ended*; start times are shifted back from it).

The original Japan 2026 Three.js diorama is kept at git tag `diorama-v1`.

## Setup

```bash
npm install
npm run dev        # http://localhost:5173 → home, /japan-2026 → the trip
```

```bash
npm test           # vitest: geo, trip shaping, sun, palette, landmarks, replay timeline, trip registry
npm run build      # tsc --noEmit && vite build
```

No API keys are required. Basemap tiles come from [OpenFreeMap](https://openfreemap.org), terrain from the AWS
terrarium DEM.

## Stack

- Vite + TypeScript
- [MapLibre GL JS](https://maplibre.org) 4: basemap, POIs, routes, replay trail
- three.js: landmark models in a MapLibre custom layer
- Static Vercel deploy (`vercel.json` → `dist`, all paths rewrite to `index.html`)

## Layout

```text
src/
  main.ts       route: "/" → home cards, "/<slug>" → that trip's map
  app/          home.ts (trip cards), tripView.ts (one trip's map + replay, driven by a TripConfig)
  trips/        index.ts (registry), types.ts (TripConfig), <slug>/ (data + config per trip)
  data/         trip.ts (fixture → stops, legs, days), types.ts
  map/          style (palettes), sun, lighting, landmark model + builders + layer, tripLayers
  replay/       timeline (pure, tested) + player (camera / trail)
  ui/           panel (day strip, list, mobile sheet), playbar (replay controls, clock, day card)
```

## Add a trip

1. **Folder:** create `src/trips/<slug>/` by copying `src/trips/japan-2026/`.
2. **Data:** dump the trip from the Tripsy MCP (`tripsy_trips_show`, `tripsy_activities_list`,
   `tripsy_hostings_list`, `tripsy_transportations_list`) into `scripts/cache/<slug>/` as `trip.json`,
   `activities.json`, `hostings.json` and `transportations.json`. Then run:

   ```bash
   npm run refresh-data -- --trip <slug> --tripsy-id <id>
   npm run build-routes -- --trip <slug>
   ```

   The first command writes `src/trips/<slug>/trip.json` (the trip's timezone comes from Tripsy). The second writes
   `routes.json`: train legs are snapped to OSM rail and bus legs to roads via OSRM.
3. **Config:** edit `src/trips/<slug>/index.ts`: title, subtitle, opening camera, overview camera and clock, bounds,
   hilly regions for 3D terrain, and area names for the day card.
4. **Landmarks:** edit `src/trips/<slug>/landmarks.ts`. Leave it empty if there are none. Only landmarks with a dated
   stop within 400 m (or a stop named after them) are shown.
5. **Registry:** add the trip to `src/trips/index.ts` (slug, title, dates, areas, `startsAt`, `load`).

Only what actually happened is shown: undated Tripsy entries (dropped plans) are ignored.

### Refresh an existing trip

Dump the four files into `scripts/cache/<slug>/` again, then run the same two commands without `--tripsy-id` (it is
read from the existing `trip.json`).

## Interaction

- **Day strip:** tap a day (mouse wheel, drag or ←→ also scroll it). The map dims other days and fits the selected one.
- **เล่นทริป:** play/pause, previous/next stop, scrubber with day ticks, 1×/2×/4×, Space / Esc.
- **Landmarks:** tap a badge or list row to fly there. ⟳ orbits; 2D/3D toggles pitch.
- **Mobile:** the panel is a bottom sheet with three snap points.
- **Bounds:** the camera can't zoom out past each trip's bounds.
- **Embed:** `?embed=1` gives compact chrome plus an **Open fullscreen** link. `frame-ancestors` allows
  `jojo-in-runtime.vercel.app` and Vercel previews.

## Deploy

Static Vite app on Vercel; `npm run build` emits `dist/`.
