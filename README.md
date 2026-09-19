# Japan 2026 diorama

Mobile-first Three.js miniature tray for the **Japan 2026** trip. Tap a city block to zoom into that day’s plate (lodging + activities). Visited stops stay bright; upcoming ones stay dim. The trip is still live (`2026-09-17`–`2026-09-27`), so status is derived from activity dates vs today in `Asia/Tokyo`.

Source of truth: **Tripsy trip `1213687`**. Notion is out of scope.

## Setup

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

Tests (date / city / visit status):

```bash
npm test
```

No API keys are required. The app reads the committed fixture at `src/data/japan-2026.json`.

## Stack

- Vite + TypeScript
- three.js (vanilla, no R3F)
- Static Vercel deploy (`vercel.json` → `dist`)

## Interaction

- One-finger orbit, pinch or `+` / `−` to zoom, **มุมถาด** to reset
- Tap a city block, day tile, or chip (no hover-only targets)
- Mobile: detail opens as a bottom sheet
- Small screens: fewer blossom particles, no shadow maps, capped pixel ratio

## Tripsy data shape

Fixture type: `src/data/types.ts` (`TripFixture`).

```ts
{
  source: "tripsy",
  trip_id: "1213687",
  name: "Japan 2026",
  starts_at: "2026-09-17",
  ends_at: "2026-09-27",
  timezone: "Asia/Tokyo",
  fetched_at: "ISO-8601",
  activities: [{
    id, name, type,           // type is the Tripsy activity_type slug
    starts_at, ends_at,       // UTC ISO-8601; display in activity.timezone
    latitude, longitude,
    address?, timezone, notes?, website?
  }],
  lodging: [{
    id, name, starts_at, ends_at,
    latitude, longitude, address?, timezone, notes?, website?
  }],
  transportations: [{
    id, type,                 // airplane | train | bus | walk | …
    name?, transport_number?,
    departure_at?, arrival_at?,
    departure: { name, latitude, longitude },
    arrival: { name, latitude, longitude }
  }]
}
```

City blocks are **stylized diorama tiles**, not GIS. Activities are assigned to the nearest catalog city (Tokyo, Yokohama, Kamakura, Enoshima, Chiba, Takao, Kawagoe). Train/flight ribbons only draw between different cities (walks stay off the tray).

## Refresh trip data

The demo always runs from the fixture. When the itinerary changes:

1. In Cursor, call Tripsy MCP for trip `1213687`:
   - `tripsy_trips_show`
   - `tripsy_activities_list`
   - `tripsy_hostings_list`
   - `tripsy_transportations_list`
2. Save the raw JSON envelopes to `scripts/cache/` as `trip.json`, `activities.json`, `hostings.json`, `transportations.json`
3. Run `npm run refresh-data`

Optional live fetch (not used by `dev`/`build`):

```bash
TRIPSY_API_BASE=https://example.invalid/ \
TRIPSY_API_TOKEN=… \
TRIP_ID=1213687 \
npm run refresh-data
```

`scripts/refresh-trip.mjs` maps MCP/API fields into the fixture. Owner emails and other account metadata are stripped.

## Deploy

Connect the repo to Vercel. Framework is a static Vite app; `npm run build` emits `dist/`.
