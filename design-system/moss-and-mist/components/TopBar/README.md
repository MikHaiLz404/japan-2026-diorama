The top bar sits at the head of a screen: 56px tall on `background`, with a 1px `separator` line beneath it. It holds a title and, at most, a leading button and one or two actions.

- **Title:** `heading-3` size at weight 600, `ink`, one line, shortened with an ellipsis when it is too long.
- **Leading slot:** a menu button (opens a NavMenu), a back button (on a detail screen), or nothing.
- **Actions:** compact secondary icon buttons on the right, such as a contrast toggle. Keep it to two.
- **Accessibility:** the menu button carries `aria-expanded` and an accessible name; icon buttons need labels.

Use `mm-bar` and `mm-bar-title`. Pair it with BottomTabs on apps, or with NavMenu on content sites.

**Menu side.** The menu button carries `mm-bar-menu`, so it follows the `data-menu-side` setting (start by default, end on request). See NavMenu for the cookie and the rule that the button and drawer share a side.
