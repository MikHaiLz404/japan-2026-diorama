An empty state fills a list or screen that has no content yet, centred inside a card.

- A 64px black mark (`ink` fill, `background`-coloured icon, `radius-lg`), a `heading-3` title, one or two lines of `ink-muted` help text (300px wide at most), then actions.
- Actions: one primary button for creating the first item, and optionally one ghost button for a secondary route such as Import.
- The title says what is missing ("No tasks yet"), the help text says what to do next. The consumer supplies the icon, the title, the text and the actions.
- Use the black mark rather than a status colour: an empty state is not a warning or an error.
