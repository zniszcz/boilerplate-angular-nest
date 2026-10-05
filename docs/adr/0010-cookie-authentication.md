# 0010. JWT in httpOnly cookies with refresh rotation

- Status: Accepted
- Date: 2026-10-02

## Context

The web app and the API share one domain. Tokens must not be readable by page
scripts, and a stolen refresh token must be detectable.

## Decision

- A 15 minute JWT access token and a 30 day refresh token, both in httpOnly,
  `SameSite=Strict` cookies. Tokens never appear in a response body.
- The refresh token is sent only to `/api/auth`, stored as a hash and rotated
  on every use. Reusing an exchanged token revokes the whole session.
- Permissions are stored in a table and travel in the access token.

Rejected: tokens in `localStorage`, because an XSS attack could read them.

## Consequences

- A permission change applies at the next refresh, at most after 15 minutes.
- Non-browser clients send the access token in an `Authorization: Bearer`
  header.
- Expired and revoked refresh tokens must be cleaned up.
