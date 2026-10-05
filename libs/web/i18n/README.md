# web-i18n

Transloco setup and the language switcher.

## Translations

English is the default language, Polish the second one. The web app
translates every text, including API errors: the API sends codes, not
messages. See [ADR 0012](../../../docs/adr/0012-response-envelope.md).

- Texts are in `apps/web/public/i18n/<language>.json`, handled by Transloco.
  The language changes without a reload and the choice is remembered in the
  browser. One build serves every language.
- API error codes are translated under `errors.<CODE>`, with `params` from the
  error envelope.
- A new language needs a file there and an entry in `LANGUAGES` in
  `apps/web/src/app/i18n.ts`.
