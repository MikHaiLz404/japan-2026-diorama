Three controls for choices. All have a 48px row (label included in the hit area), a label on the right, a 2px edge, and the purple focus ring.

- **Checkbox** (`mm-box`, 24px, `radius-md`): for any number of independent choices, or one yes or no inside a form. Checked is a `green` fill with a white check.
- **Radio** (`mm-box--round`): for exactly one choice from a short list; one option is always selected. Selected is a `green` edge with a `green` dot.
- **Switch** (`mm-switch`, 48 by 28, `radius-md`): for a setting that takes effect immediately. On is a `green` track with the knob on the right and the word On beside it, so state is told by position and text as well as colour. Use a checkbox, not a switch, when the choice waits for a Save button.
- Markup: a `label.mm-opt` wrapping a real `input` (visually hidden, 24px) followed by the drawn box, then the label text. The native input keeps keyboard and screen reader behaviour; give a switch `role="switch"`.
- Hover darkens the edge to `ink`; disabled is 45% opacity. State changes colour only, never size.
