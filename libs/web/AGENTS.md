# libs/web

Frontend pages in `libs/web/<feature>` and shared frontend code.

- Handle API responses with a `switch` on `code` from the envelope, typed
  with `@boilerplate/contracts`. Never branch on a message text. See
  [ADR 0012](../../docs/adr/0012-response-envelope.md).
- Texts for codes come from Transloco, built from `code` and `params`, never
  from the backend.
- State lives in NgRx Signal Store.
- A page only places organisms and templates from `libs/web/ui` and connects
  them to stores. No Tailwind classes, no markup of its own beyond those
  blocks. A missing look is a missing block in `libs/web/ui`, with a story.
  See [ADR 0017](../../docs/adr/0017-spartan-and-storybook.md).
- Mobile first, always: design for a phone, then add `sm:` and `md:`.
- Never drop a subscription. Use `toSignal`, the `async` pipe or
  `takeUntilDestroyed()`.
