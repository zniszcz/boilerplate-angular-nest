# Adding an app

Every step to add an app to `apps/`, from generating it to shipping it.
There are two kinds, and a new app follows one of them:

- a **backend**, a NestJS API like `apps/api`;
- a **frontend**, an Angular app like `apps/web`.

Below, `<name>` is the app's name in kebab-case, for example `admin`, and
`<NAME>` the same in upper snake case, `ADMIN`. A new library needs only
steps 2 and 3.

## 1. Generate it

From the repository root:

```sh
# a backend
pnpm nx g @nx/nest:application apps/<name> --linter=eslint --unitTestRunner=none --e2eTestRunner=none
# a frontend
pnpm nx g @nx/angular:application apps/<name> --linter=eslint --unitTestRunner=none --e2eTestRunner=none --style=css
```

Tests are added by hand in step 9. The app only wires libraries together;
its logic goes to libraries in `libs/`
([ADR 0005](../adr/0005-nx-monorepo-layout.md)).

## 2. Tags

Set the tags in `apps/<name>/project.json`, so the boundary rules can check
it:

```json
"tags": ["scope:api", "type:app"]
```

A backend gets `scope:api`, a frontend `scope:web`. An app that fits no tag
in the table in [AGENTS.md](../../AGENTS.md#where-code-goes) needs a new
tag, decided in an ADR.

## 3. README

Replace the generated `apps/<name>/README.md`:

```md
# <name>

One true, specific sentence about what the app is; it becomes its
description in the project list.

## Impact

What else a change here needs:

- A new environment variable goes to `.env.example`, with a safe local
  default, and to 1Password if it is a secret.
```

Add an item to `## Impact` whenever a change here needs something
elsewhere. `pnpm docs:check` fails without the first sentence or the
section.

## 4. Ports

Every port comes from the root `.env`, never from `project.json`.

1. In `.env.example`, add the ports at the end of the `# per-instance-ports`
   block, with the next free offsets, and copy them to your `.env`:

   ```sh
   <NAME>_PORT=41004
   <NAME>_DEBUG_PORT=41005   # a backend only
   ```

2. Rename the generated `serve` target in `project.json` to `dev-server`,
   remove any `port` from its options, and add a `serve` target that passes
   the port from `.env`:

   ```json
   "serve": {
     "continuous": true,
     "executor": "nx:run-commands",
     "options": { "command": "nx run <name>:dev-server --port=$<NAME>_PORT" }
   }
   ```

   For a backend the command passes the debugger's port instead,
   `--port=$<NAME>_DEBUG_PORT`, and `src/main.ts` listens on its own
   variable; `PORT` is what the cluster sets:

   ```ts
   const port = process.env.PORT || process.env.<NAME>_PORT;
   ```

3. A frontend that calls an API gets a `proxyConfig` like
   `apps/web/proxy.conf.mjs`, whose target comes from a variable in `.env`.

## 5. Isolated instances

In `.env.example`, add `<name>` to `INSTANCE_APPS`, and any target it must
run once in a new instance, such as `<name>:migrate`, to `INSTANCE_SETUP`.
`pnpm instance up` then starts it in every instance on its own ports
([setup](setup.md#instances)).

## 6. Configuration

Every other value the app reads goes to `.env.example`, with a comment and
a safe local default. A secret also goes to 1Password for the cluster. All
ways of running the app read the root `.env`
([Configuration](setup.md#configuration)).

## 7. Docker for local development

1. Copy the `Dockerfile` of `apps/api` or `apps/web` to `apps/<name>/` and
   replace the project name in it. Its `dev` stage runs `nx serve <name>`.
2. Add a service to `compose.yaml`, like `api` or `web`:

   ```yaml
   <name>:
     profiles: [apps]
     build:
       context: .
       dockerfile: apps/<name>/Dockerfile
       target: dev
     env_file:
       - path: .env
         required: true
     network_mode: host
     develop:
       watch:
         - action: sync
           path: ./apps/<name>
           target: /app/apps/<name>
         - action: sync
           path: ./libs
           target: /app/libs
         - action: rebuild
           path: ./package.json
         - action: rebuild
           path: ./pnpm-lock.yaml
   ```

   A backend that needs a database adds `depends_on` like `api`.

## 8. Diagrams

Add the app as a node to the container diagram in
[docs/README.md](../README.md#5-building-blocks), with an arrow for each
service it talks to:

```text
<name>["<b><Name></b><br/><i>NestJS or Angular</i><br/>What it does"]:::container
```

## 9. Tests

- A backend gets API tests on a real PostgreSQL, like `apps/api/test`, with
  a `vitest.config.mts` like `apps/api`'s, including its JSON report.
- A frontend's logic is tested in its libraries; user-facing behaviour gets
  `.feature` scenarios in `apps/web-e2e`.
- The rules are in [AGENTS.md](../../AGENTS.md#tests).

## 10. Images, for an app that ships

1. Give its `Dockerfile` a production stage, like `apps/api` or `apps/web`.
2. Add `<name>: '<name>'` to `IMAGE_OF_APP` in
   `scripts/changed-images.mjs`, so CI builds and pushes its image.
3. Add its checks to `scripts/test-prod-images.sh`.
4. Describe it in the deployment section of
   [docs/README.md](../README.md#7-deployment).

## 11. Check

```sh
pnpm docs:generate && pnpm docs:check   # README, Impact, lists
pnpm lint && pnpm architecture && pnpm build
pnpm instance up test/<name>            # runs in an instance
pnpm instance down test/<name>
```
