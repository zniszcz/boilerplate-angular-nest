# 0012. Response envelope with codes from one catalog

- Status: Accepted, implemented 2026-10-05
- Date: 2026-10-05

## Context

The frontend must handle every backend response deterministically, with a
`switch` on a fixed code. Neither the message text nor the HTTP status is
enough: one HTTP status, such as 400 or 500, has many possible causes, and
messages are translated texts for the user.

## Decision

Every response the frontend sees has an envelope:

```ts
// success
{ status: 'success', code: 'OK', data: { ... } }
// error
{ status: 'error', code: 'AUTH_TOO_MANY_ATTEMPTS', params: { retryAfter: 900 } }
// validation
{
  status: 'error',
  code: 'VALIDATION_ERROR',
  details: [{ field: 'password', code: 'TOO_SHORT', params: { min: 8 } }],
}
```

- Consistency matters more than performance here.
- One code catalog for the whole application, grouped by prefix, generated as
  a TypeScript type into `libs/shared/contracts`.
- Success uses the shared code `OK`. An operation gets its own success code
  only when it can succeed in more than one way.
- Codes may carry `params`. Field errors have the same shape plus `field`.
- The author of a code designs a message that is useful to the client and
  reveals nothing about the system. One fallback code for unexpected
  exceptions is set in one place, and designed interactions never rely on it.
- Texts for codes are translated only in the frontend, from `code` and
  `params`. `message` appears only where the backend must translate: dynamic
  data, e-mails, files.
- The HTTP status stays and matches the code, because Cloudflare, Traefik,
  Grafana and logs rely on it.
- HTTP headers such as `Retry-After`, `ETag` and `Last-Modified` stay. Data the
  frontend logic needs is repeated in the envelope.
- 200 with an envelope instead of 204. A 304 is fine, because the browser hands
  the cached 200 to the page.
- Files (`/api/media`, downloads) have no envelope, because the body is the
  bytes.
- A `correlationId` for each request is a separate topic, added if cheap.

### Comparison with practice

- Error codes from one catalog with params and field details are what Stripe
  (`code`, `param`), Google AIP-193 (`reason`, `metadata`) and the Microsoft
  REST API Guidelines (`code`, `target`, `details`) do. RFC 9457 (Problem
  Details) allows the same with extension fields.
- An envelope for success is less common: Stripe, Google, Microsoft, GitHub
  and Zalando do not use one, JSON:API does. It is accepted here because one
  way of handling every response is worth the small cost.
- `status` repeats what the HTTP status says, so only one place in the backend
  may set it, from the HTTP status, never a controller.

Rejected: HATEOAS. It helps APIs with many unknown clients whose addresses
change. Here the frontend and backend share a repository and generated types,
so the compiler already keeps addresses in sync.

## Consequences

- Controllers return plain data. One interceptor wraps success, one exception
  filter wraps errors, both in `apps/api`.
- Every error a route can return is documented in Swagger with its code.
- The OpenAPI document needs a generic envelope schema, which makes the
  generated types more complex.
- Backend translations of error messages (nestjs-i18n `auth.json`) go away,
  except for texts the backend must translate itself.
