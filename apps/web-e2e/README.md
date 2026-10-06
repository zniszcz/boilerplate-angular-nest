# web-e2e

End-to-end scenarios in English `.feature` files, run by Playwright through
playwright-bdd on the built apps. Run with `pnpm e2e`. How it works:
[Testing](../../docs/concepts/testing.md#end-to-end-scenarios); why:
[ADR 0023](../../docs/adr/0023-end-to-end-tests.md).

## Impact

What else a change here needs:

- A new user-facing feature starts here, as a `.feature` file, before any code.
- A new step goes to `steps/`; reuse an existing step before writing one.
