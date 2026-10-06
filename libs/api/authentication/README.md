# api-authentication

The authentication domain: login, refresh and logout, with the Session
aggregate and its refresh token rotation rules. A generic domain, kept thin.
It knows users only through the `UserLookup` port. See
[ADR 0010](../../../docs/adr/0010-cookie-authentication.md).

## Impact

What else a change here needs:

- A change to sessions or refresh rotation updates [authentication](../../../docs/concepts/authentication.md) and the login scenarios in `apps/web-e2e`.
- A changed entity needs a migration in `apps/api`.
- Login limits follow [ADR 0011](../../../docs/adr/0011-login-rate-limit.md).
