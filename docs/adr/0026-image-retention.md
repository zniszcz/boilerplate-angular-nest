# 0026. Keep the 10 newest images and every image tagged prod

- Status: Accepted
- Date: 2026-10-06

## Context

CI pushes an image of every changed app on each push to `main`
([ADR 0019](0019-ci-pipeline.md)), tagged `latest` and the commit SHA. GHCR
keeps them all, so the registry grows forever, and CI should need no care.
Production will run an image chosen by a promotion tag, which may be older
than the newest ones; the tag's name is not decided yet.

## Decision

- After each push, `scripts/prune-images.sh` keeps the **10 newest
  versions** of that app's image and deletes the rest.
- A version tagged **`prod`** is never deleted, however old. `prod` is the
  working name of the promotion tag; if promotion picks another name, the
  script's `PROTECTED` changes with it.
- `latest` stays on the newest image, as before.
- Own script, not `actions/delete-package-versions`, because that action
  matches container versions by digest, not by tag, so it cannot spare
  `prod`.

## Consequences

- A rollback can go back up to 10 versions, or to whatever `prod` points at.
- `DRY_RUN=1 scripts/prune-images.sh api` lists what would be deleted.
- An image deleted from GHCR cannot be pulled again; a pod restarted on an
  image older than the 10 newest and not tagged `prod` would fail to start.
