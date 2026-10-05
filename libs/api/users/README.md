# api-users

The users domain: the User aggregate with its permissions. Other domains use
it only through `src/index.ts`: `Credentials` checks a password, `UserQueries`
reads users. The reference for the layer layout, see
[libs/api/AGENTS.md](../AGENTS.md).
