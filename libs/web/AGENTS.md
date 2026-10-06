# libs/web

Frontend pages in `libs/web/<feature>` and shared frontend code.

- Handle API responses with a `switch` on `code` from the envelope, typed
  with `@boilerplate/contracts`. Never branch on a message text. See
  [ADR 0012](../../docs/adr/0012-response-envelope.md).
- Texts for codes come from Transloco, built from `code` and `params`, never
  from the backend.
- State lives in NgRx Signal Store. Remote data is an Angular `httpResource`
  created in the store with `withProps`; pages pass its `snapshot()` to
  organisms. See [ADR 0018](../../docs/adr/0018-loading-states-and-motion.md).
- Pages are lazy routes (`loadComponent`). Use `@defer (on viewport)` only
  for parts below the first screen, with the part's skeleton as the
  placeholder and `@loading (after 150ms; minimum 300ms)`. Never defer the
  largest element of the first screen.
- Every routed page has a view in `libs/web/ui/src/lib/pages`: the whole
  screen from organisms and templates, data in through inputs, with stories
  under `Pages/` that show it in the app's layout (`pageFrame`). The page in
  `libs/web/<feature>` only connects that view to stores and the router.
- One page per screen. A new feature gets its own page and route, linked in
  the navigation, instead of joining an existing page.
- A page only places organisms and templates from `libs/web/ui` and connects
  them to stores. No Tailwind classes, no markup of its own beyond those
  blocks. A missing look is a missing block in `libs/web/ui`, with a story.
  See [ADR 0017](../../docs/adr/0017-spartan-and-storybook.md).
- Mobile first, always: design for a phone, then add `sm:` and `md:`.
- Never drop a subscription. Use `toSignal`, the `async` pipe or
  `takeUntilDestroyed()`.
