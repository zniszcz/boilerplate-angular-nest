# storybook

Storybook for the web UI, opening every story at phone width. It collects the stories that sit next to the
components in `libs/web/helm` (atoms) and `libs/web/ui` (molecules,
organisms, templates). Stories open at phone width; the viewport menu has the
Tailwind breakpoints.

- Locally: `pnpm storybook`, at http://localhost:4400.
- Build: `pnpm nx run storybook:build-storybook`, into `dist/storybook`.
- Deployed inside the web image under `/storybook/`, served only with
  `STORYBOOK_ENABLED=true`. See
  [apps/web/README.md](../web/README.md#storybook).
- Styles come from `apps/web/src/styles.css`, texts from
  `apps/web/public/i18n`, so stories look like the app.
