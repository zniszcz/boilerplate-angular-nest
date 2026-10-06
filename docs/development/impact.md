# Impact of a change

What else a change in each project needs: migrations, translations, docs,
secrets. Read it when planning a feature, to see what the plan must include,
and after the code, for the projects the change really touched. Why it
works this way: [CONTRIBUTING.md](../../CONTRIBUTING.md#3-plan-the-tasks-and-scan-the-impact).

Each entry is the `## Impact` section of the project's `README.md`, collected
by `pnpm docs:generate`; change it there. A new project needs one, or
`pnpm docs:check` fails.

<!-- generated:impact -->

### [api](../../apps/api/README.md)

- A new environment variable goes to `.env.example`, to the `api` service in `compose.yaml`, and to 1Password if it is a secret.
- A changed entity needs a migration (see [Adding a migration](../../apps/api/README.md#adding-a-migration)).
- A new or changed route or DTO needs `pnpm contracts:generate`.
- A new service or outside system changes the diagrams in `docs/README.md`.

### [storybook](../../apps/storybook/README.md)

- Stories are found only under `libs/web`; a component elsewhere needs its folder in `stories` in `.storybook/main.ts`.

### [web-e2e](../../apps/web-e2e/README.md)

- A new user-facing feature starts here, as a `.feature` file, before any code.
- A new step goes to `steps/`; reuse an existing step before writing one.

### [web](../../apps/web/README.md)

- A new outside source, such as a font, a script or another API, needs the Content Security Policy in `nginx.conf.template` ([ADR 0014](../adr/0014-strict-content-security-policy.md)).
- A new page needs a route here, a guard if it needs a permission, and a link in `libs/web/shell`.
- A new text needs both language files in `public/i18n`.

### [api-access](../../libs/api/access/README.md)

- Every route goes through the guard here, so a change reaches the whole API; check the API tests of each domain.
- A change to cookies, tokens or passwords updates [authentication](../concepts/authentication.md), and may need an ADR next to [ADR 0010](../adr/0010-cookie-authentication.md).

### [api-authentication](../../libs/api/authentication/README.md)

- A change to sessions or refresh rotation updates [authentication](../concepts/authentication.md) and the login scenarios in `apps/web-e2e`.
- A changed entity needs a migration in `apps/api`.
- Login limits follow [ADR 0011](../adr/0011-login-rate-limit.md).

### [api-responses](../../libs/api/responses/README.md)

- A change to the envelope changes every response: the types in `libs/shared/contracts` and the error handling of the web app ([ADR 0012](../adr/0012-response-envelope.md)).

### [api-users](../../libs/api/users/README.md)

- A new permission needs the seed in `apps/api`, the guards and links of the web app, and possibly a role in the users page.
- A changed entity needs a migration in `apps/api`.
- Other domains use only `src/index.ts`; a change there reaches `libs/api/authentication`.

### [contracts](../../libs/shared/contracts/README.md)

- A new response code needs its text under `errors.<CODE>` in both language files of `apps/web/public/i18n`.
- The API types are generated; change the API and run `pnpm contracts:generate`, never edit them by hand.

### [web-account](../../libs/web/account/README.md)

- A change to the view goes to `AccountView` in `libs/web/ui`, with its story; texts go to both language files.

### [web-auth](../../libs/web/auth/README.md)

- A change to login, guards or refresh updates [authentication](../concepts/authentication.md) and the login scenarios in `apps/web-e2e`.

### [web-errors](../../libs/web/errors/README.md)

- A new error page needs a route in `apps/web` and texts in both language files.

### [ui-helm](../../libs/web/helm/README.md)

- An atom is used by every view in `libs/web/ui`; check their stories in Storybook after a change.

### [web-home](../../libs/web/home/README.md)

- A change to the view goes to `HomeView` in `libs/web/ui`, with its story; texts go to both language files.

### [web-i18n](../../libs/web/i18n/README.md)

- A new language needs a file in `apps/web/public/i18n` and an entry in `LANGUAGES` in `apps/web/src/app/i18n.ts`.

### [web-shell](../../libs/web/shell/README.md)

- A new page needs its link here, shown only with the permission the page needs.

### [web-ui](../../libs/web/ui/README.md)

- Every component here has a story; a new one needs one too.
- Components only show data; state and API calls belong in a feature library.

### [web-users](../../libs/web/users/README.md)

- A change to the view goes to `UsersView` in `libs/web/ui`, with its story; texts go to both language files.
- A new action needs its permission from `libs/api/users`.

<!-- /generated:impact -->
