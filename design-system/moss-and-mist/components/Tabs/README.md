Content tabs switch between views of the same page or object. They are not site navigation; for destinations use the navigation family, and note that bottom tabs are `mm-tabs` while content tabs are `mm-tablist` and `mm-tab`.

- A row of 48px tabs on a 1px `separator` line. Selected is `green` text, weight 600 and a 2px `green` underline; the underline is always present in transparent, so nothing moves when selection changes. Hover is a `surface-muted` fill; focus is the purple ring.
- Two to five tabs, short labels. If they do not fit, let the row scroll horizontally rather than wrapping.
- Markup: `role="tablist"`, `role="tab"` with `aria-selected` and `aria-controls`, and `role="tabpanel"` for the content. Arrow keys move between tabs, Home and End jump to the first and last, and only the selected tab is in the Tab order.
