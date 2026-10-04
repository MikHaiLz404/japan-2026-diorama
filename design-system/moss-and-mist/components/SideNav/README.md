Side navigation is for wide screens, where a vertical list of destinations stays visible beside the content.

- **Side nav:** 220px wide, `surface` fill, 1px `separator` edge, items with icon and label.
- **Rail:** 72px wide, icons only, for tight widths. Each item needs an accessible name (`aria-label` or visually hidden text), and a tooltip on hover.
- **Same items:** use the same item set as the mobile pattern, only the container changes with width.

The current page uses the shared active state with `aria-current="page"`. Use `mm-side` and `mm-side--rail`.
