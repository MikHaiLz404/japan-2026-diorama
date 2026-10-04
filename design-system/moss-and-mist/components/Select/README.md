Pick one option from a list. The closed select is a `mm-input` (48px, 2px edge) with a trailing `chevron-down`. Use the native `<select>` by default because it is accessible and handles long lists and mobile pickers well.

- Wrap it in `mm-select-wrap` and add the chevron icon after it, so the arrow is drawn in `ink`; set `appearance: none` through `mm-select`.
- For a styled list use a `mm-menu` of `mm-option` rows: 48px each, hover `surface-muted`, selected `green-soft` with `green` text and a check, so selection is never colour only. Mark the container `role="listbox"` and each row `role="option"` with `aria-selected`.
- Fewer than 4 options and room to show them: use radios instead. More than about 8: add search.
- Errors and hints follow the Input pattern (2px `error` edge, message beneath).
