# api-authentication

The authentication domain: login, refresh and logout, with the Session
aggregate and its refresh token rotation rules. A generic domain, kept thin.
It knows users only through the `UserLookup` port. See
[ADR 0010](../../../docs/adr/0010-cookie-authentication.md).
