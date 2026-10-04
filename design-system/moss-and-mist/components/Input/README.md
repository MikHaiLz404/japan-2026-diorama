A single-line text input with its label and helper line.

- The label sits above in `ink`, 14px at weight 600. Helper text sits below in `ink-muted`, 12px.
- The field has a 2px `ink-muted` border (never `separator`, which is too faint for a control edge), a `surface` fill, `radius-md`, 16px type. Placeholder text is `ink-subtle`.
- Heights match buttons: 48px comfortable, 36px compact (`mm-input--sm`), so inputs and buttons line up in a row.
- States: hover darkens the border to `ink`; focus keeps the `ink` border and adds the 2px `purple` ring with a 2px offset; disabled uses `surface-muted` with a `separator` border at 70% opacity.
- Error: the border becomes `error`, still 2px and the helper line turns to `error` with a cross icon and a message that says what to fix. Never signal error by colour alone.
