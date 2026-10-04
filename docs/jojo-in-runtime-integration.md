# jojo-in-runtime integration

Portfolio repo: [`MikHaiLz404/my-journey`](https://github.com/MikHaiLz404/my-journey) (live:
[jojo-in-runtime.vercel.app](https://jojo-in-runtime.vercel.app)).

## Current setup (2026-10)

- **Logs only.** Trip Replay appears on the portfolio through Logs posts, not Works. The Works entry
  `japan-2026-diorama` was removed: its Notion Works row is archived and the local `worksFallback` entry was dropped
  in my-journey PR #17.
- The existing Logs post `japan-2026-diorama` stays as the history of the original Three.js diorama (git tag
  `diorama-v1` in this repo).
- Logs content comes from the Notion Logs database. `/logs/[slug]` revalidates hourly (my-journey PR #16), so Notion
  edits show up without a redeploy. Only posts with **Published** checked are listed.

## Linking from a log

- Live app: `https://trip-replay.vercel.app/` (home, all trips)
- One trip: `https://trip-replay.vercel.app/japan-2026`
- Embedded in a page: append `?embed=1` for compact chrome plus an **Open fullscreen** link. `frame-ancestors` in
  `vercel.json` allows `jojo-in-runtime.vercel.app`, Vercel previews and localhost.

The URLs above assume the Vercel project is renamed to `trip-replay`. Until then the app is served from
`japan-2026-diorama.vercel.app`.
