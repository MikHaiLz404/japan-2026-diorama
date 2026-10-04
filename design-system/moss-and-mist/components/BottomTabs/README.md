Bottom tabs keep 3 to 5 equal destinations one thumb-tap away. They suit apps, where people switch between sections often.

- **Count:** 3 to 5 tabs. More than 5, or secondary items, belong in a NavMenu.
- **Tab:** icon above a 12px label, 56px tall, always labelled. Icon-only tabs are not allowed.
- **Active:** the shared active state (`green-soft` fill, `green` icon and label, weight 600) with `aria-current="page"`.
- **Bar:** `surface` fill with a 1px `separator` line on top, 8px padding.

Use `mm-tabs` with `mm-nav-item mm-nav-item--col`. Hide the bar when it would cover content the user is typing into.
