# libs/web/ui

Presentational components by atomic design: `molecules`, `organisms`,
`templates`. Atoms are the spartan/ui helm components in `libs/web/helm`.
See [ADR 0017](../../../docs/adr/0017-spartan-and-storybook.md).

- Build from atoms up: a molecule uses helm atoms, an organism uses
  molecules and atoms, a template places organisms.
- Every component has a story next to it, `<name>.stories.ts`, with a title
  `Molecules/…`, `Organisms/…` or `Templates/…`. Add a story for each state
  that looks different, such as an error or a pending form.
- Data comes in through inputs, events go out through outputs.
- No store, HTTP or router. Texts may use the transloco pipe.
- Tailwind 4, mobile first: plain classes for phones, `sm:` and `md:` for
  bigger screens. Touch targets are at least 44px high on phones.
- An organism that shows remote data takes a `ResourceSnapshot` input and
  has a `<Name>Skeleton` component of the same size, shown while the first
  load runs. Stories: Loading, Ready and Error, plus Empty where it applies.
  See [ADR 0018](../../../docs/adr/0018-loading-states-and-motion.md).
- An action in progress shows a spinner inside its button, through a
  `pending` input.
- Motion only from the catalog in `apps/web/src/styles.css`
  (`motion-appear`, `motion-disappear`, `motion-swap`, `motion-alert`), with
  `animate.enter` and `animate.leave`. No other animation, no
  `@angular/animations`.
- Colors only through theme tokens (`bg-card`, `text-muted-foreground`,
  `text-destructive`...), never raw colors such as `slate-500`.
