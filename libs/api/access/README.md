# api-access

Technical access control for the backend, shared by every domain: the
global guard, `@Public()`, `@RequirePermissions()`, `@CurrentUser()`, JWT
access tokens, cookie settings and password hashing. It holds no domain
model; sessions live in `libs/api/authentication`.
