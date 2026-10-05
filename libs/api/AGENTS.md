# libs/api

Backend logic, one library per domain.

## Errors and responses

See [ADR 0012](../../docs/adr/0012-response-envelope.md).

- Controllers return plain data, never an envelope.
- Throw only `AppException` from `@boilerplate/api-responses`, with a code
  from the catalog in `libs/shared/contracts/src/lib/codes.ts`. Never throw
  Nest's own exceptions, and never rely on the fallback code in a designed
  interaction.
- A code says what the client needs to know and nothing about how the system
  works inside.
- Document every error a route can return in Swagger with `@ApiError` from
  `@boilerplate/api-responses`. The 401 for protected routes and the 403 of
  `@RequirePermissions()` are added automatically.
- No `message` for texts the frontend translates. Use `message` only for text
  the backend must translate itself: dynamic data, e-mails, files.
- Return 200 with data instead of 204.
- Field errors use our own codes (`FIELD_CODES` in contracts), never the
  rule names of class-validator. A new validation rule in a DTO needs an entry
  in `FIELD_RULES` in `libs/api/responses/src/lib/validation.ts`.

## Data

- Entities never leave the backend. Copy them to a DTO field by field.
- The schema changes only through migration files.

## Security

- Every route needs a token unless marked `@Public()`.
- Login and refresh are rate limited. See
  [ADR 0011](../../docs/adr/0011-login-rate-limit.md).
- Tokens live only in httpOnly cookies, never in a response body. See
  [ADR 0010](../../docs/adr/0010-cookie-authentication.md).
