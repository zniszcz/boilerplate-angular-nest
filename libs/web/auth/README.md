# web-auth

Login on the web side: the login page, `AuthStore` with the logged in user,
route guards and the interceptor that refreshes the session. How it works:
[authentication](../../../docs/concepts/authentication.md).

## Impact

What else a change here needs:

- A change to login, guards or refresh updates [authentication](../../../docs/concepts/authentication.md) and the login scenarios in `apps/web-e2e`.
