List rows stack inside one list card (`surface` fill, 1px `separator` edge, `radius-lg`), divided by 1px `separator` lines. A row has no edge of its own.

- Anatomy, left to right: an optional 36px leading tile in `surface-muted` with a 20px icon, a body with a title (16px, weight 500, `ink`) and an optional subtitle (14px, `ink-muted`), and an optional trailing group with a tag, a value, or a chevron.
- Heights: 56px comfortable, 44px compact (`mm-list--compact`, usually without the leading tile).
- States: hover fills the row with `surface-muted`; selected fills it with `green-soft` and turns the leading tile `green` with a check; focus is a 2px `purple` ring drawn inside the row; disabled is 45% opacity.
- Only rows that lead somewhere get a chevron. Keep trailing content to one tag or one value, not both.
