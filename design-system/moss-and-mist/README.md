A personal palette: Cloud Dancer for the ground, green for action, purple for the spark, marigold for warmth, black for ink. It is a starter system: colours, type, spacing, radii, components, icons, data-viz colours, voice, elevation and motion are defined; the logo is still being designed.

## Palette roles

- **Ground.** Put every screen on `background`: Cloud Dancer (Pantone 11-4201, colour of the year 2026) in light, black in dark. Raise content onto `surface`, rest quiet fills (secondary buttons, tags, empty areas, disabled) on `surface-muted`, and draw hairlines in `separator`.
- **Ink.** Set text and icons in `ink`; use `ink-muted` for secondary text and `ink-subtle` only for captions and hints. All three hold 4.5:1 on every ground in both themes. Black is also a design element: a solid `ink` block is the strongest accent a layout has.
- **Green is the action colour.** Primary buttons, links, selected and active states and progress use `green`, with `on-green` for the label. A screen has one green primary action.
- **Purple is the spark.** Use `purple` for highlights, rewards, achievements, featured or new labels, and the keyboard focus ring (2px, offset 2px). It never sits beside green as a second action colour, and no component uses both as fills.
- **Marigold is the warmth.** The one warm colour, there to break the intensity of green, purple and black. Use `marigold` fills (label `on-marigold`, always black) for badges, streaks, chart series, illustration and small celebratory moments, and `marigold-soft` with `marigold-text` for notes and callouts. It is never the primary action fill and never sits as a large block beside the green primary button; keep it to about one small warm moment per screen.
- **Tints.** `green-soft`, `purple-soft` and `marigold-soft` are quiet backgrounds for a selected row, chip, badge or note; text on them is `ink`, `ink-muted`, or the matching hue (`green`, `purple` or `marigold-text`).

## Status

Status uses colours already in the palette plus one new red, and always pairs colour with an icon so it never carries meaning alone.

- **Success** is `green` on `green-soft`, with a check icon. Green is also the action colour, so tell a success message from a button by its icon and its soft background; never fill a success banner solid green.
- **Warning** is `marigold-text` on `marigold-soft`, with a triangle icon. Use a `marigold` fill with `on-marigold` for small warning badges. On a screen that shows a real warning, keep marigold for it and drop it from decoration.
- **Error** is `error` (raspberry) on `error-soft`, with a cross icon. `error` fills destructive buttons and error badges, with `on-error` for the label. Invalid fields get a 2px `error` border and a message in `error` beneath.
- **Info** is neutral: `ink` icon and text on `surface-muted`, with an i icon. It has no colour of its own, which keeps colour for states that need action. Purple stays reserved for the spark.

## Components

Button, Input, Chip (with Tag), Card, ListRow and EmptyState are designed as one set; navigation (TopBar, NavMenu, BottomTabs, SideNav) is a second family built from them. They share two sizes, comfortable (48px controls) and compact (36px), the same 2px border weight, the same purple focus ring, and the same rule that colour is never the only signal: selection shows a check, status shows an icon, errors show a message. Buttons, inputs, chips and tags use `radius-md` (4px); cards and lists use `radius-lg` (8px). Cards hold a header, text and at most two compact buttons; lists are rows divided by 1px lines. Nothing has a shadow. Compose with the `mm-` classes in `components/bundle.css`.

Beyond that core, the set also has Dialog, Toast, Tooltip (overlays), Controls (checkbox, radio, switch), Select, Tabs (content tabs, distinct from bottom tabs) and Table. They follow the same rules: 2px control edges, purple focus ring, state by colour never width, and status never by colour alone.

## Navigation

Four containers, one item. Every pattern uses the same `mm-nav-item`, so the current page looks identical everywhere: `green-soft` fill, `green` icon and label, weight 600, and `aria-current="page"`. Hover is a `surface-muted` fill; focus is the purple ring. Colour is backed by weight and position, never alone.

Pick the container by the product, not by habit:

- **Bottom tabs** for apps with 3 to 5 equal destinations used often.
- **Menu** (dropdown, drawer or full-screen) for content sites, or when there are more than 5 items or secondary ones. It is less discoverable than tabs, so label the button and keep the title visible.
- **Side nav or rail** on wide screens. The item set stays the same and only the container changes with width.
- **Top bar** in all of them, holding the title, a back or menu button, and up to two actions.

Menu side is standard-left by default; users can switch the menu button and drawer to the right and the choice is kept in a cookie (details in NavMenu). Wide-screen side nav stays left. Breakpoints are in the Breakpoints section.

## Borders

One rule for every control edge. Width: buttons, inputs and chips all use a 2px border; 1px is only for decorative lines (`separator`, the edge of a static card or list). Cards stay 1px even when pressable: they are told apart by edge colour, a `surface-muted` fill on hover (as list rows do), and a check with a green fill when selected. State changes the colour and never the width, so nothing shifts when you hover or select. Colour has four meanings: `ink-muted` is the resting edge of a neutral control, `ink` is hover and the active edge of a focused field, `green` marks a selected or intended action (selected chip, ghost button, primary), and `error` marks invalid or destructive (invalid input, danger button). `ink-subtle` and `separator` are never control edges: they are too faint. The focus ring is separate from the border: 2px `purple`, offset 2px.

## Iconography

Moss & Mist has its own icon set of 49 line icons (see Icons): 24px grid, 2px stroke, round ends and corners, `currentColor`, used at 16, 20 and 24px. The 2px stroke matches the 2px control edges. Icons support text and never replace it where meaning matters; status and selection always pair a colour with an icon.

## Visual foundations

**Type.** Three families, the same as the In Runtime site, with IBM Plex Sans Thai for Thai script in all of them: `headline` (Space Grotesk) for `display`, `heading-1` and `heading-2`; `sans` (Inter) for everything else, including `heading-3`, body and labels; `mono` (Geist Mono) for live data such as status values, timestamps, hashes and metrics, never for body copy. The browser picks each glyph from the first family that has it, so Latin text uses Space Grotesk, Inter or Geist Mono and Thai text uses IBM Plex Sans Thai automatically; Plex Sans Thai also covers Latin and numerals as a fallback. Licences: all four are SIL Open Font License 1.1 (commercial use and web embedding allowed; the fonts may not be sold on their own, and the licence text must stay with any copy you redistribute). Load them from Google Fonts or Fontsource, not from unofficial downloads. Use `display` once per screen, `heading-1` to `heading-3` for structure, `body` for running text, `small` for supporting lines and `caption` for labels. Keep body copy in `ink`.

**Spacing and radii.** Spacing steps are `space-1` 4, `space-2` 8, `space-3` 16, `space-4` 24, `space-5` 32. Corners are tight and geometric, matching the In Runtime site: buttons, inputs, chips, tags and nav items use `radius-md` (4px), cards, lists, menus and tiles use `radius-lg` (8px), and `radius-sm` (2px) is for hairline details only. Separate surfaces with `separator` or by stepping from `background` to `surface`; there are no shadows at all (see Elevation).

**Dark theme.** Dark swaps the ground to black and brightens green, purple and marigold so they stay readable; the text colour becomes Cloud Dancer. Always use the role tokens, never the raw `cloud-dancer` and `black` swatches, for text and grounds so both themes work.

## Elevation

No shadows, no glows, anywhere. Layers are told apart by fill and edge: `background` is the page, `surface` sits on it with a 1px `separator` edge, and `surface-muted` is a raised or resting fill. Overlays (dialogs, drawers, menus) sit on a 40% `ink` scrim and carry a 2px `ink` edge so they read as above the page without depth effects. When bringing existing screens over, remove any `box-shadow`, `drop-shadow` or glow, including the mobile menu's `shadow-lg`.

## Motion

Quiet and short: three durations, two curves, only `opacity` and `transform` (plus colour on state). `--mm-dur-1` 120 ms for hover, press, focus, toggles and tooltips; `--mm-dur-2` 200 ms for menus, dialogs, toasts, drawers and scrims; `--mm-dur-3` 320 ms for full-screen menus and page-level changes. Enter with `--mm-ease` (`cubic-bezier(.2, 0, 0, 1)`), leave with `--mm-ease-exit` (`cubic-bezier(.4, 0, 1, 1)`) one duration step shorter. Overlays rise 4 to 8px while fading in, the drawer slides in from the menu side, and press scales to 98%. No bounce, no overshoot, no staggering, nothing loops except a loading skeleton. Under `prefers-reduced-motion: reduce` all movement is dropped and overlays only fade in 120 ms. Motion is not a token family, so the values are CSS variables in `components/bundle.css` with `mm-motion-*` classes to add when an overlay mounts; see the Motion card, where each one loops. They were checked in a browser here for animation names, durations and reduced-motion behaviour, but not yet felt on a real device.

## Data visualisation

Colour follows the entity, not its rank. Series colours are `data-1` Green, `data-2` Purple, `data-3` Marigold, `data-4` Blue, `data-5` Orange, always in that order and never cycled; with more than five series fold the rest into "Other" or split the chart. Both themes were checked with the dataviz palette validator (lightness band, chroma, colour-blind separation and contrast on `surface`). `data-3` is 2.9:1 on `surface` in light, so a chart must also carry direct labels or a table view. Status colours (`error`, `marigold-text`) are reserved and never used as series. For magnitude use the one-hue green ramp `data-seq-1` to `data-seq-6`, low to high; in dark mode low values are dark and high values light. Rules: one y axis only, thin marks (4px rounded data ends, 2px lines, at least 8px markers), a 2px `surface` gap between adjacent fills, a legend for two or more series plus direct labels on the last point, hover tooltips, and a table view. Text beside a mark stays in `ink` or `ink-muted`, never the series colour.

## Voice

Clear, polite, slightly warm. Short sentences. Say what happened and what to do next, with no blame, no jargon, no exclamation marks and no emoji in the interface. Thai first, with English at parity: both say the same thing at the same length, and Thai uses polite-neutral register without particles that sound over-familiar. Buttons are verbs ("Save changes", not "Submit"). Errors give the cause and the fix ("Couldn't save. Check your connection and try again."). Empty states invite the first action. Success is one word or short phrase ("Saved."). Confirmations name the object and say if it can be undone. See the Voice card for pairs.

## Breakpoints

Layout breaks follow content width, not device type, and match Tailwind's defaults so the In Runtime site needs no extra config. Write mobile-first with `min-width`. Three ranges are used for navigation: below 768px bottom tabs or a drawer menu, from 768px (`md`) a side rail with icons only, from 1024px (`lg`) the expanded side nav with icons and labels. The other Tailwind steps (`sm` 640, `xl` 1280, `2xl` 1536) are available for page layout but navigation does not change at them.

## Theme switching

Three states: system, light and dark, defaulting to system (`prefers-color-scheme`). The chosen theme is set as `data-theme` on `<html>` together with the matching `color-scheme`, so browser scrollbars and form controls follow. Store the choice in a cookie (`mm-theme`: `system|light|dark`, 1 year, SameSite=Lax) so the server can render the right theme on first paint and avoid a flash; where a cookie cannot be read before paint, set the attribute from a small inline script in `<head>`. In Tailwind, point the `dark` variant at the attribute: `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));`, so existing `dark:` classes keep working.

## Logo

Not decided. Four concept sketches are in the Logo card (J with a cursor block, three shapes, terrain steps, orbit) for discussion only; do not use them as the logo.

## Not defined yet

The logo (see Logo) and product-specific accents, icons with brand character and per-product copy. Brand logos for social networks are not drawn; use `mail`, `link` and `globe` or the network's own official mark. Motion has not been tried on a real screen yet. Components so far are Button, Input, Chip, Card, ListRow, EmptyState and the navigation family (see Components and Navigation), and the icon set (see Iconography). Ask before inventing any of these.
