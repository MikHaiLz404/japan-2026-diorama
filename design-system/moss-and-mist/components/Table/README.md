A table is for comparing records across the same fields. It sits in a `mm-table-wrap` (1px `separator` edge, `radius-lg`, `surface` fill) so it can scroll sideways on narrow screens.

- Header row 40px, 12px type in `ink-muted`, weight 600. Body rows 48px with 1px `separator` lines; hover is `surface-muted`, selected is `green-soft`.
- Text left-aligned, numbers right-aligned in `mono` with tabular digits (`mm-num`), and the header of a number column aligns the same way.
- Sortable headers are buttons (`mm-sort`) with the `sort` icon and `aria-sort="ascending"` or `descending` on the `th`; the sorted column also turns `ink`, so state is not colour only. Status cells use tags with icons.
- Narrow screens: keep the table and let the wrapper scroll horizontally when there are more than three columns; for two or three columns, restack each row into a ListRow instead.
- Use real `table`, `thead`, `th` and `td` markup, with `scope` on headers and a caption or accessible name.
