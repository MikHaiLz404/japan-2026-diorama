A toast confirms something that already happened, or reports a failure that needs no decision. It is `surface` with a 2px `ink` edge and `radius-md`, 48px tall, no shadow, with a leading status icon, one short line and at most one text action (Undo, Retry).

- Icon colour carries status (`green` check, `error` cross, neutral `info`), and the icon and text always say it, so colour is never alone.
- Success clears after 5 seconds; a toast with an action stays 8 seconds; errors stay until dismissed. Pause the timer on hover and focus.
- Use `role="status"` for success and info and `role="alert"` for errors. Never put the only way to fix a problem in a toast; errors that block work belong inline next to the field or in a dialog.
- Place at bottom centre on mobile above any bottom tabs, bottom left on wide screens; show one at a time and replace rather than stack.
- Motion: add `mm-motion-toast` when it mounts (fade and 8px rise, 200 ms); leave with a 120 ms fade.
