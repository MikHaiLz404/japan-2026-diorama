A tooltip names an icon-only control or adds a short hint. It is a solid `ink` bubble with `background` text (12px), `radius-md`, no arrow and no shadow, up to 240px wide.

- Appears on hover after 400 ms and on keyboard focus right away; hides on Escape, blur or mouse leave. It must never be the only place information lives, and never holds buttons or links.
- Touch screens have no hover: icon-only buttons still need an `aria-label`, and anything essential belongs in visible text.
- Link it with `aria-describedby` and give the bubble `role="tooltip"`. Place it 8px from the control, below by default, flipping above at the edge of the screen.
- Motion: add `mm-motion-tooltip` (120 ms fade) when it shows.
