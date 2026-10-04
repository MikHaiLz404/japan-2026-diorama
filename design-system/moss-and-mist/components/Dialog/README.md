A dialog asks for one decision or shows one short message. It sits on a `mm-scrim` (45% `ink`) with a 2px `ink` edge, `surface` fill and `radius-lg` (8px), and has no shadow. Width is up to 400px, padding 24px.

- Anatomy: a title (`heading-3`), one or two sentences of text in `ink-muted`, and a row of actions aligned right. Put the safe action first (Cancel) and the main action last. A destructive confirmation uses `mm-btn--danger` and names what is lost, as in the Voice rules.
- Never stack a dialog on a dialog. For forms or long content use a full page or a drawer.
- Behaviour: focus moves into the dialog and returns to the trigger on close; Tab stays inside; Escape closes unless the choice is destructive and in progress; the page behind does not scroll. Use `role="dialog"` (or `alertdialog` for destructive confirmations), `aria-modal="true"` and `aria-labelledby` on the title.
- Motion: add `mm-motion-scrim` to the scrim and `mm-motion-dialog` to the dialog when it mounts (fade and 4px rise, 200 ms). On close, fade out over 120 ms.
- On small screens the dialog is full width with 16px side margins and actions stack, primary on top.
