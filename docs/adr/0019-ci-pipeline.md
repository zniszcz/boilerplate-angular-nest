# 0019. CI checks everything, builds only changed images

- Status: Accepted
- Date: 2026-10-06

## Context

CI runs on GitHub Actions. Runs should not be wasted, but every run must
confirm that the whole version works. Building and testing both images on
every push is the slowest part, and most changes touch one app.

## Decision

`.github/workflows/ci.yml`, on pushes to `main` and on pull requests:

1. **Skipped** when only `*.md` files or `docs/` change. A newer push to the
   same branch cancels the older run.
2. **verify**, always the whole repository, never `nx affected`: `versions`,
   `format:check`, `lint`, `architecture`, `build`, the Storybook build and
   `contracts:check`. Tests join when they exist.
3. **changes**, on `main` only: `scripts/changed-images.mjs` asks Nx which
   apps changed since the last successful run on `main` (`nx-set-shas`).
   Storybook ships inside the web image, so it maps to `web`. With no
   successful run yet, the base is git's empty tree, so everything builds.
4. **images**, one job per changed app: build the `prod` stage, run
   `scripts/test-prod-images.sh <app>` on that very image, then push it to
   GHCR as `ghcr.io/<repository>/<app>` with the tags `latest` and the commit
   SHA. An image that fails its test is never pushed.

- The base is the last _successful_ run, so a failed build is retried by
  the next push instead of being forgotten.
- Docker layers are cached in the GitHub Actions cache, per app.
- Actions are pinned to a commit SHA with the release in a comment, like
  exact versions of every other dependency
  ([ADR 0004](0004-exact-versions.md)).

Rejected: `nx affected` for the checks, because a run must vouch for the
whole version. Rejected: building every image on every push.

## Consequences

- Deploying (manifests, rollout) is a separate step, still manual.
- A change only to files outside any Nx project, such as a script, builds
  no image, though verify still runs.
