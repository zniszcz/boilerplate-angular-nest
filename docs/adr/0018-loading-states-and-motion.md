# 0018. Loading states and motion as a system

- Status: Accepted
- Date: 2026-10-06

## Context

The app should load code lazily as much as possible without turning into one
big loading screen, keep Web Vitals good, and show with gentle motion that
it is doing something. Each component inventing its own loading look and its
own animation would make neither consistent.

## Decision

Loading has three levels, each with one tool:

| What waits               | Tool                                                                       | Looks like                             |
| ------------------------ | -------------------------------------------------------------------------- | -------------------------------------- |
| code of a page           | lazy route (`loadComponent`), preloaded in the background                  | nothing: preloaded before it is needed |
| code of a part of a page | `@defer (on viewport)`, only below the first screen                        | the skeleton of that part              |
| data                     | Angular `httpResource` in a store, its `snapshot()` passed to the organism | the skeleton of that organism          |
| an action                | `pending` input on the organism                                            | a spinner inside the button            |

- Remote data is an Angular `httpResource`, created in an NgRx Signal Store
  with `withProps`. Organisms take its `ResourceSnapshot` (`@angular/core`),
  a plain object, so `libs/web/ui` needs no HTTP and stories pass objects.
  A reload keeps the old value on screen; only a first load shows the
  skeleton.
- Every organism with data has a `<Name>Skeleton` component of the same size,
  so nothing moves when data arrives (no CLS). The `@defer` placeholder shows
  the same skeleton, so waiting for code and for data looks the same.
- Skeletons show at once, because they hold the layout. Spinners and the
  start screen show only after 150ms, so a fast answer never flashes;
  `@defer` loading uses `after 150ms; minimum 300ms`.
- Never `@defer` what is on the first screen, above all the largest element,
  because it would delay LCP.
- Motion comes from one catalog of classes in `apps/web/src/styles.css`,
  built on `tw-animate-css` and used with Angular's `animate.enter` and
  `animate.leave`: `motion-appear`, `motion-disappear`, `motion-swap`,
  `motion-alert`. Only `opacity` and `transform` move, 150 to 300ms, with
  two easing curves. Motion explains a change of state and never decorates.
  With `prefers-reduced-motion` nothing moves.
- The start screen is plain markup inside `<app-root>` in `index.html`, with
  no script and no inline style, so the strict CSP of
  [ADR 0014](0014-strict-content-security-policy.md) stays.
- Unknown addresses show a 404 page from `libs/web/errors`; the address
  stays in the browser bar.

Rejected: a shared `Loadable` type of our own, because `httpResource` and
`ResourceSnapshot` already cover it. Rejected: `@angular/animations`,
deprecated in favour of `animate.enter` and `animate.leave`.

## Consequences

- A new organism with data needs a skeleton component and Loading, Ready and
  Error stories.
- `web-auth` is needed at start for its guards and store, so the login page
  is not lazy.
- Measuring Web Vitals automatically, for example with Lighthouse CI, is a
  later step.
