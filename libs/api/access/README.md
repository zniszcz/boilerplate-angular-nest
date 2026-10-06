# api-access

Technical access control for the backend, shared by every domain: the
global guard, `@Public()`, `@RequirePermissions()`, `@CurrentUser()`, JWT
access tokens, cookie settings and password hashing. It holds no domain
model; sessions live in `libs/api/authentication`.

## Impact

What else a change here needs:

- Every route goes through the guard here, so a change reaches the whole API; check the API tests of each domain.
- A change to cookies, tokens or passwords updates [authentication](../../../docs/concepts/authentication.md), and may need an ADR next to [ADR 0010](../../../docs/adr/0010-cookie-authentication.md).
