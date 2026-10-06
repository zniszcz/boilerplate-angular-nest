# api-users

The users domain: the User aggregate with its permissions. Other domains use
it only through `src/index.ts`: `Credentials` checks a password, `UserQueries`
reads users. The reference for the layer layout, see
[libs/api/AGENTS.md](../AGENTS.md).

## Impact

What else a change here needs:

- A new permission needs the seed in `apps/api`, the guards and links of the web app, and possibly a role in the users page.
- A changed entity needs a migration in `apps/api`.
- Other domains use only `src/index.ts`; a change there reaches `libs/api/authentication`.
