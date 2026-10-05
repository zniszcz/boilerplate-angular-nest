# 0008. Docker Compose watch for local development

- Status: Accepted
- Date: 2026-10-01

## Context

Local development should match the cluster closely, with live reload and
adjustable log levels.

## Decision

- Code gets into containers through `docker compose watch`, not a mounted
  directory.
- Volumes only for PostgreSQL and Redis data and for app media. In the backend
  media is under a fixed path, `/app/media`, the same as in the cluster.
- The log level comes from `LOG_LEVEL`: `debug` locally, `info` in production.

## Consequences

- The apps can also run outside Docker against databases in Docker.
