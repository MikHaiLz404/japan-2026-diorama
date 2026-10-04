# Motion and elevation

Durations and curves are CSS custom properties in `components/bundle.css`: `--mm-dur-1` 120 ms, `--mm-dur-2` 200 ms, `--mm-dur-3` 320 ms, `--mm-ease` for entering and `--mm-ease-exit` for leaving. The card above loops each enter animation, shows the drawer from both sides, and shows the reduced-motion version next to the normal one.

**Use.** Control state changes (hover, press, focus, checkbox, switch, tab, option) transition colour only, at `--mm-dur-1`, and press adds `scale(.98)`. Add the matching class when an overlay mounts: `mm-motion-scrim` and `mm-motion-dialog` (fade and 4px rise), `mm-motion-toast` (fade and 8px rise), `mm-motion-menu` (dropdown, 4px rise), `mm-motion-tooltip` (fade), `mm-motion-drawer` (slides in from the menu side and follows `data-menu-side`), `mm-motion-full` (full-screen menu rises 24px over 320 ms). Skeletons pulse opacity every 1.6 s.

**Exit.** Leaving is one step shorter than entering (200 becomes 120, 320 becomes 200) with `--mm-ease-exit`, and the element is removed after the animation ends.

**Rules.** Animate only `opacity` and `transform`, plus colour on state. No bounce, no overshoot, no staggering, no animation on page load, and nothing that loops except a loading skeleton. Never move content the user is reading or about to press.

**Reduced motion.** Under `prefers-reduced-motion: reduce`, or inside an element with `data-reduce-motion="true"`, all movement and press scaling are removed: overlays fade in over 120 ms, state changes stay colour only, and skeletons stop pulsing.

**Elevation.** No shadows. The three layers (`background`, `surface` with a 1px edge, `surface-muted`) and an overlay on a 45% scrim with a 2px `ink` edge are the whole depth model.
