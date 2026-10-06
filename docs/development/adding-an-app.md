# Adding an app

Every step to add an app to `apps/`, from generating it to shipping it.
There are two kinds, and a new app copies the existing one of its kind:

- a **backend**, a NestJS API, copies `apps/api`;
- a **frontend**, an Angular app, copies `apps/web`.

Below, `<name>` is the app's name in kebab-case, for example `admin`, and
`<NAME>` the same in upper snake case, `ADMIN`. The rules each step follows
are linked, not repeated. A new library needs only steps 2 and 3.

## 1. Generate it

From the repository root:

```sh
# a backend
pnpm nx g @nx/nest:application apps/<name> --linter=eslint --unitTestRunner=none --e2eTestRunner=none
# a frontend
pnpm nx g @nx/angular:application apps/<name> --linter=eslint --unitTestRunner=none --e2eTestRunner=none --style=css
```

Tests come in step 9. Logic goes to libraries, not to the app
([ADR 0005](../adr/0005-nx-monorepo-layout.md)).

## 2. Tags

Copy the `tags` of `apps/api/project.json` or `apps/web/project.json` into
`apps/<name>/project.json`. Which tags exist and what to do when none fits:
[AGENTS.md](../../AGENTS.md#where-code-goes).

## 3. README

Replace the generated `apps/<name>/README.md` with a first sentence and an
`## Impact` section, as [AGENTS.md](../../AGENTS.md#documentation) says;
`apps/api/README.md` is an example.

## 4. Ports

1. In `.env.example`, add `<NAME>_PORT`, and for a backend also
   `<NAME>_DEBUG_PORT`, at the end of the `# per-instance-ports` block,
   with the next free numbers. Copy them to your `.env`.
2. In `apps/<name>/project.json`, rename the generated `serve` target to
   `dev-server` and remove any `port` from its options. Then copy the
   `serve` target of `apps/api/project.json` or `apps/web/project.json`,
   replacing `api` or `web` with `<name>` and `API_` or `WEB_` with
   `<NAME>_`.
3. A backend: make `src/main.ts` listen like `apps/api/src/main.ts`, with
   `<NAME>_PORT` instead of `API_PORT`.
4. A frontend that calls an API: copy `apps/web/proxy.conf.mjs` and the
   `proxyConfig` option of its `dev-server` target.

## 5. Isolated instances

In `.env.example`, add `<name>` to `INSTANCE_APPS`, and any target a new
instance must run once, such as `<name>:migrate`, to `INSTANCE_SETUP`
([setup](setup.md#instances)).

## 6. Configuration

Every other value the app reads goes where
[CONTRIBUTING.md](../../CONTRIBUTING.md#4-new-environment-variables-or-secrets)
says.

## 7. Docker for local development

1. Copy `apps/api/Dockerfile` or `apps/web/Dockerfile` to `apps/<name>/`
   and replace the project name in it.
2. Copy the `api` or `web` service in `compose.yaml` and replace `api` or
   `web` with `<name>` in its name, `dockerfile` and `watch` paths.

## 8. Diagrams

Add the app to the container diagram in
[docs/README.md](../README.md#5-building-blocks): copy the `api` or `web`
node, rename it, and add an arrow for each service it talks to.

## 9. Tests

A backend copies `apps/api/vitest.config.mts` and `apps/api/test`'s setup
for its API tests; a frontend tests its logic in its libraries and
user-facing behaviour in `apps/web-e2e`. The rules:
[AGENTS.md](../../AGENTS.md#tests).

## 10. Images, for an app that ships

1. Its `Dockerfile` from step 7 already has the production stages.
2. Add it to `IMAGE_OF_APP` in `scripts/changed-images.mjs`, so CI builds
   and pushes its image.
3. Add its checks to `scripts/test-prod-images.sh`, like those of `api` or
   `web`.
4. Add it to the deployment section of
   [docs/README.md](../README.md#7-deployment).

## 11. Check

```sh
pnpm docs:generate && pnpm docs:check
pnpm lint && pnpm architecture && pnpm build
pnpm instance up test/<name>
pnpm instance down test/<name>
```
