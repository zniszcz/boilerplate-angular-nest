# apps/api

The NestJS app. It only bootstraps and wires modules from `libs/api`.

- Response envelope ([ADR 0012](../../docs/adr/0012-response-envelope.md)):
  one interceptor wraps success and one exception filter wraps errors, both
  here. Only they set `status`, derived from the HTTP status.
- The fallback code for unexpected exceptions is set only in that filter.
- Swagger runs only locally and on the test environment
  (`SWAGGER_ENABLED`), never on production.
- Every route without `@Public()` gets the 401 in Swagger automatically,
  in `src/swagger.ts`.
- Migrations live in `src/database/migrations`. Never turn on `synchronize`.
