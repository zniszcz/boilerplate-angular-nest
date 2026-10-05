# 0017. spartan/ui atoms and Storybook as an app

- Status: Accepted
- Date: 2026-10-05

## Context

The web app should always be built mobile first, from blocks up to a page
that only places them. spartan/ui is the component library used at work.
Storybook was planned as `apps/storybook`, collecting stories from the UI
libraries.

## Decision

- **spartan/ui**: the headless layer (brain, `@spartan-ng/brain`) comes from
  npm; the styled layer (helm) is generated into `libs/web/helm` and is our
  code. The CLI is configured in `components.json` to put every component in
  one library with an entry point each, imported as
  `@boilerplate/web-helm/<name>`. The project name `ui-helm` is fixed by the
  CLI, so it stays. Theme colors are CSS variables in
  `apps/web/src/styles.css` (slate); components use tokens such as
  `bg-card`, never raw colors.
- **Atomic design**: helm components are the atoms. `libs/web/ui` holds
  molecules, organisms and templates built from them. A page in
  `libs/web/<feature>` only places organisms and templates and has no classes
  of its own.
- **Mobile first**: helm button and input are 44px high on phones, a touch
  target, and the spartan 36px from `md`. Storybook opens every story at
  phone width; Tailwind breakpoints are in the viewport menu.
- **Storybook** is `apps/storybook` (`type:app`). Stories sit next to their
  components in `libs/web/helm` and `libs/web/ui`. `pnpm storybook` runs it
  locally.
- **Visibility like Swagger**: the web image contains the Storybook build
  under `/storybook/`. nginx serves it only when `STORYBOOK_ENABLED=true`;
  otherwise `/storybook/` is a 404. Storybook needs inline scripts and an
  iframe, so only its location gets a looser CSP and `SAMEORIGIN` framing;
  the app keeps the strict policy of [ADR 0014](0014-strict-content-security-policy.md).

Rejected: brain only with our own styles, because helm is already Tailwind
code we own and change. Rejected: one Nx project per helm component, the CLI
default, because it adds a project per component.

## Consequences

- Storybook for Angular builds with the webpack builder
  (`@angular-devkit/build-angular`), which Angular 22 marks as deprecated,
  while the app builds with esbuild. Revisit when Storybook supports the
  application builder.
- Updating a helm component means generating it again and reapplying our
  changes, marked `Changed from spartan` in the code.
- Turning Storybook on for an environment is one environment variable; on
  production it stays unset.
