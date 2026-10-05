# 0009. Media files on a volume, S3 later

- Status: Accepted
- Date: 2026-10-01

## Context

Apps need a place for uploaded media. An S3 compatible store would be more
flexible but costs memory on a small server.

## Decision

- Media files live on a persistent volume mounted only in the backend, at
  `/app/media`, and served under `/api/media/`.
- An S3 compatible store is added when an app needs it. Rejected: MinIO,
  because its free version lost the admin panel and ready images, and the
  project is in maintenance mode. Candidates for later: Garage, RustFS.

## Consequences

- Only one API instance can write media while it is a local volume.
