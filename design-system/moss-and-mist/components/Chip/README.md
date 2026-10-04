Chips are choices the user can toggle; tags are read-only labels. Both use `radius-md` (4px), not a capsule, to match the geometric corners of the system.

- **Chip:** `surface-muted` fill, 2px `ink-muted` border, `ink` label, 40px tall (32px compact). Hover darkens the border to `ink`. Selected switches to `green-soft` with a `green` border, `green` label and a leading check icon, so selection never relies on colour alone. Focus is the 2px `purple` ring.
- **Tag:** 24px tall, 12px type, not clickable. Neutral uses `surface-muted`; success, warning, error and spark use `green-soft`, `marigold-soft`, `error-soft` and `purple-soft` with the matching text colours. Status tags always carry an icon (check, triangle, cross) and spark carries a star.
- Info status is the neutral tag.
- A row of chips sits 8px apart. A filter bar is an input, an optional secondary button and a row of chips, all compact, sharing the same left edge.
