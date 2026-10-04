A card groups related content on `background`. It comes in four forms, all with `radius-lg` and 24px padding (16px compact).

- **Default:** `surface` fill with a 1px `separator` edge. Holds a header row (title in `heading-3` weight plus an optional tag), body text in `ink-muted`, and up to two compact buttons in the footer.
- **Muted:** `surface-muted` fill and no edge, for quiet groupings and notes.
- **Ink block:** `ink` fill with `background`-coloured text, the strongest block a layout has. Use at most one per screen, for the thing that matters most.
- **Pressable:** a card the user taps or chooses keeps the 1px card edge, so every card has the same weight. It is told apart by colour and fill: `ink-muted` edge at rest, on hover the edge goes `ink` and the fill steps to `surface-muted` (the same hover fill list rows use), `green` edge with a `green-soft` fill and a check when selected, plus the purple focus ring. Do not nest buttons inside a pressable card.
- Static cards never have shadows or hover states. Do not put a green primary button on an ink block; use a secondary button there.
