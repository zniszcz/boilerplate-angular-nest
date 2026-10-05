# 0013. Own field codes, and no backend translations for now

- Status: Accepted
- Date: 2026-10-05

## Context

[ADR 0012](0012-response-envelope.md) gives validation errors a list of
`details` with a code for each field. The first version used the rule names
of class-validator, such as `IS_LENGTH` or `WHITELIST_VALIDATION`.

After ADR 0012 the frontend translates every text for a code, and the backend
no longer had any text to translate.

## Decision

- Field codes are our own catalog, `FIELD_CODES` in `libs/shared/contracts`,
  for example `REQUIRED`, `UNKNOWN_FIELD`, `INVALID_EMAIL`, `TOO_SHORT`.
  A table in `libs/api/responses` maps class-validator rules to these codes
  and names their arguments as `params`, for example `{ min: 8 }`.
- A rule missing from the table gives `INVALID_VALUE` and a warning in the
  logs.
- nestjs-i18n is removed. Language support for the backend, such as e-mails
  or files, will be designed as a whole when it is needed.

Rejected: exposing class-validator rule names. They make the library part of
the API contract, so replacing it, for example with Zod, would break the
frontend, and the names describe the library instead of the problem.

## Consequences

- A new validation rule in a DTO needs an entry in the mapping table.
- The first backend text that must be translated brings back an i18n library,
  chosen as part of that design.
