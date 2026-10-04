The type system uses three families with one Thai companion, all under the SIL Open Font License 1.1, which allows commercial use and web embedding.

- **Space Grotesk** (`headline`, Florian Karsten): `display`, `heading-1`, `heading-2`.
- **Inter** (`sans`, Rasmus Andersson): `heading-3`, `body`, `small`, `caption` and all UI labels.
- **Geist Mono** (`mono`): status values, timestamps, hashes and metrics. Never body copy.
- **IBM Plex Sans Thai** (Mike Abbink, Bold Monday, with IBM): every Thai character. Each family stack lists it right after the Latin face, so a mixed line renders Latin in Space Grotesk or Inter and Thai in Plex automatically.

Load weights 400, 500, 600 and 700 from Google Fonts or Fontsource (`next/font/google` self-hosts them at build). Do not use unofficial copies. Keep the licence text with any redistributed font files. Thai script stacks tone marks and vowels above and below the line, so it needs more line height than Latin at the same size. Body (16/24) and below are comfortable; check `display` (48/52) and `heading-1` (32/40) with real Thai text before shipping, and raise their line height if marks collide or clip.
