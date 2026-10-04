A NavMenu is a list of destinations that opens from a menu button in the TopBar. It comes in three sizes of takeover; pick by how many items there are.

- **Dropdown:** a panel under the top bar. For 3 to 6 short items. Closes on selection or outside tap.
- **Drawer:** a 240px panel from the left over a scrim. For 6 or more items, or when items have groups.
- **Full-screen:** fills the screen with large items (64px, 24px text, weight 600). For sites where the menu is the main way to move around.

Items are the shared `mm-nav-item`: 48px, `radius-md`, icon plus label. The current page uses the active state (see Navigation in the main README). The menu button needs `aria-expanded`; move focus into the menu on open, return it to the button on close, and close on Escape.

**Menu side.** The standard is the start (left) side, and that is the default. Because most people hold a phone in the right hand and the top-left corner is the hardest to reach, let the user move the menu button and the drawer to the right. Set `data-menu-side="end"` on `<html>`: `mm-bar-menu` (the menu button) moves to the right end of the bar and `mm-over--drawer` opens from the right. The button and the drawer always share a side. Remember the choice in a cookie so it survives reloads and works before scripts run on the server:

```js
document.cookie = "mm-menu-side=end; path=/; max-age=31536000; SameSite=Lax";
document.documentElement.setAttribute("data-menu-side", "end");
```

Read the cookie on load (or on the server) and set the attribute before first paint, to avoid a jump. Offer the switch in settings, not in the bar. Where possible, reorder the DOM too so keyboard order matches what people see. SideNav on wide screens stays on the left and ignores this setting.
