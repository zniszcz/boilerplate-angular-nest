# 0016. Scheduled jobs are commands, the schedule belongs to the deployment

- Status: Accepted
- Date: 2026-10-05

## Context

Refresh tokens pile up: expired ones, and those of ended sessions. Removing
them needs a job that runs on a schedule. A job inside the API would run once
per API instance, and a job tied to Kubernetes would bind the app to it.

## Decision

- The logic is a use case in its domain, here `SessionCleanup` in
  `authentication`.
- It runs as a command in the same image, `node cleanup.js`, like
  `migrate.js` and `seed.js`. The command loads only the modules it needs, so
  it does not need secrets such as `JWT_SECRET`.
- The schedule is deployment configuration: a Kubernetes CronJob in the
  cluster, once a day. Any other scheduler (system cron, a systemd timer,
  GitHub Actions) can run the same command.
- Cleanup removes expired tokens, and tokens of sessions that ended over 7
  days ago, so a suspected theft can still be looked into. Tokens used in
  rotation stay until they expire, because they detect theft. Tokens of
  deleted users need no step of their own; they expire like any other.

Rejected: `@nestjs/schedule` inside the API, because every API instance would
run the job.

## Consequences

- Moving off Kubernetes changes one manifest, not the code.
- Each new scheduled job is a new entry in `apps/api/webpack.config.js`, an
  Nx target and a scheduler entry in the deployment.
