# libs/api

Backend logic. Domain libraries (`type:domain`: `users`, `authentication`)
hold one bounded context each. Platform libraries (`type:platform`:
`access`, `responses`) hold technical code shared by every domain.

## Layers of a domain library

See [ADR 0015](../../docs/adr/0015-ddd-layers.md). `pnpm architecture`
checks every rule here; `libs/api/users` is the reference layout.

```
src/lib/
  domain/<aggregate>/   aggregate, value objects, <aggregate>.repository.ts
  application/          use cases (@Injectable), ports as abstract classes
  infrastructure/       *.record.ts (TypeORM), repositories, adapters
  api/                  controllers, *.dto.ts
  <domain>.module.ts    binds ports to adapters, the only file seeing all
src/index.ts            public API for other domains and apps/api
```

- `domain` imports nothing outside `domain`: no NestJS, no TypeORM, no
  `node:` modules. Anything technical becomes a port.
- `application` imports `domain` and `@nestjs/common` only. It returns
  results, such as `{ status: 'refused' }`, and never throws `AppException`;
  the `api` layer turns results into HTTP.
- `api` never imports `infrastructure`; `infrastructure` never imports `api`.
- Ports are abstract classes, bound in the module file with
  `{ provide: Port, useClass: Adapter }`.
- Name TypeORM classes `*Record` in `*.record.ts`. Aggregates are built from
  records in the repository, never returned as records.

## DDD rules

- One repository per aggregate, never for an entity inside one.
- An aggregate changes only through its own methods; no public setters.
- An aggregate refers to another aggregate by id, not by object.
- Another domain is used only from `infrastructure`, through its
  `src/index.ts`, behind a port named in this domain's words.
- No foreign keys between tables of different domains. Code must tolerate a
  missing row on the other side.

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

- Records and aggregates never leave the backend. Copy to a DTO field by
  field in the `api` layer.
- The schema changes only through migration files.

## Security

- Every route needs a token unless marked `@Public()`.
- Login and refresh are rate limited. See
  [ADR 0011](../../docs/adr/0011-login-rate-limit.md).
- Tokens live only in httpOnly cookies, never in a response body. See
  [ADR 0010](../../docs/adr/0010-cookie-authentication.md).
