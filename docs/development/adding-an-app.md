# Adding an app

Everything a new app in `apps/` needs, so it is checked, documented,
configured and shipped like the others. Each step links to the place that
owns the rule; this page only collects them. A new library needs steps 2
and 3 only.

1. **Generate it with Nx** in `apps/`. Apps only wire libraries together;
   the logic goes to libraries ([Code](../README.md#code),
   [ADR 0005](../adr/0005-nx-monorepo-layout.md)).
2. **Tags.** Give `project.json` one `scope:*` and one `type:*` tag, from
   the table in [AGENTS.md](../../AGENTS.md#where-code-goes). Without them
   the boundary rules cannot check it.
3. **README.** Its first sentence describes the app in the project list,
   and its `## Impact` section says what else a change there needs
   ([AGENTS.md](../../AGENTS.md#documentation)). `pnpm docs:check` fails
   without either.
4. **Diagrams.** Add the app to the container diagram in
   [docs/README.md](../README.md#5-building-blocks), as the table in
   [AGENTS.md](../../AGENTS.md#documentation) says.
5. **Configuration.** Every value it reads goes to `.env.example`, with a
   comment and a local default; a secret also goes to 1Password
   ([Configuration](setup.md#configuration)).
6. **Ports and instances.** If it listens, follow
   [Adding an app to instances](setup.md#adding-an-app-to-instances): its
   port in `.env.example`, a `serve` target that takes it from there, and
   the project in `INSTANCE_APPS`.
7. **Docker for local development.** Add a service to `compose.yaml` like
   `api` or `web`: a `dev` stage in the app's `Dockerfile`, `env_file: .env`,
   `network_mode: host`, the `apps` profile and `develop.watch`
   ([option A](setup.md#option-a)).
8. **Images.** For an app that ships, give its `Dockerfile` a production
   stage, add it to `IMAGE_OF_APP` in `scripts/changed-images.mjs`, add its
   checks to `scripts/test-prod-images.sh`, and update the deployment
   section of [docs/README.md](../README.md#7-deployment).
9. **Tests.** Its behaviour is tested as
   [AGENTS.md](../../AGENTS.md#tests) says; a user-facing app gets
   `.feature` scenarios.
