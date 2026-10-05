# apps/api

The NestJS app. It only bootstraps and wires modules from `libs/api`.

- Response envelope ([ADR 0012](../../docs/adr/0012-response-envelope.md)):
  one interceptor wraps success and one exception filter wraps errors, both
  in `src/responses`. Only they set `status`, derived from the HTTP status.
- The fallback code for unexpected exceptions is set only in that filter.
- Swagger runs only locally and on the test environment
  (`SWAGGER_ENABLED`), never on production.
- `src/swagger.ts` adds the envelope to every success response, the 401 to
  every route without `@Public()` and the 500 fallback to every route.
- Routes whose client is not the web app, such as health probes, use
  `@NoEnvelope()`.
- Migrations live in `src/database/migrations`. Never turn on `synchronize`.
