# contracts

Types shared by the web app and the API: the generated API types and the
catalog of response codes with the envelope. How they are made:
[API contracts](../../../docs/concepts/api-contracts.md). Rules:
[AGENTS.md](AGENTS.md).

## Impact

What else a change here needs:

- A new response code needs its text under `errors.<CODE>` in both language files of `apps/web/public/i18n`.
- The API types are generated; change the API and run `pnpm contracts:generate`, never edit them by hand.
