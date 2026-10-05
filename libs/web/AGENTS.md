# libs/web

Frontend pages in `libs/web/<feature>` and shared frontend code.

- Handle API responses with a `switch` on `code` from the envelope, typed
  with `@boilerplate/contracts`. Never branch on a message text. See
  [ADR 0012](../../docs/adr/0012-response-envelope.md).
- Texts for codes come from Transloco, built from `code` and `params`, never
  from the backend.
- State lives in NgRx Signal Store.
- Pages connect stores to organisms from `libs/web/ui` and have no look of
  their own.
- Never drop a subscription. Use `toSignal`, the `async` pipe or
  `takeUntilDestroyed()`.
