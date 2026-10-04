Buttons trigger an action. Four variants share one shape: `radius-md`, a 2px border and a 600-weight label.

- **Primary** (`green` fill and border, `on-green` label): the one main action on a screen. Only one per screen.
- **Secondary** (`surface-muted` fill, 2px `ink-muted` border, `ink` label): alternatives to the primary action. The border keeps it readable as a button on both grounds; hover darkens the border to `ink`.
- **Ghost** (2px `green` border, no fill, `green` label): low-emphasis actions such as Skip. It keeps an edge so it still reads as a button.
- **Danger** (`error` fill and border, `on-error` label): destructive actions, never next to a primary in the same row.
- Sizes: comfortable is 48px tall with 16px type; compact (`mm-btn--sm`) is 36px with 14px type for dense screens. Icon-only buttons are square at the same heights and always need an accessible label.
- States: hover and pressed shift brightness (darker in light, lighter in dark on hover, darker on press) and press scales to 0.98. Focus is a 2px `purple` ring with a 2px offset. Disabled is 45% opacity with no hover.
- A leading icon is 20px (16px compact) in the label colour, with an 8px gap.
- Do not use `marigold` or `purple` as button fills.
