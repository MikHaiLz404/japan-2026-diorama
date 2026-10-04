# Moss & Mist: how to use these files

- `README.md` is the system's rules (palette roles, borders, navigation, icons, type, elevation, motion, data-viz, voice, breakpoints, theme switching). Read it first.
- `tokens.json` is the source of truth for colour, type, spacing and radius. `tokens.css` is generated from it as CSS variables (`--green`, `--ink`, `--radius-md`, ...). Regenerate it when `tokens.json` changes.
- `components/bundle.css` holds every component style (`mm-` classes), the motion variables (`--mm-dur-*`) and the `mm-motion-*` classes. Load `tokens.css` first, then `bundle.css`.
- `components/<Name>/README.md` says how each component behaves; `preview.html` shows it (open it with both CSS files loaded). `components/Icons/README.md` includes the SVG sprite.
- `design-system.json` is the artifact index and can be ignored outside Claude.

Status: the logo is not decided (Logo is a set of concept sketches only) and there are no product-specific accents yet. Source of this export: the Moss & Mist design system artifact, version 31.
