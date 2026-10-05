# 0003. Node.js 24 and TypeScript 6

- Status: Accepted
- Date: 2026-10-01

## Context

The template should use the newest LTS Node.js and the newest TypeScript, the
same for frontend and backend. On 2026-10-01 Node.js 24.21.0 was the newest
LTS, and Node.js 26 becomes LTS in the second half of October 2026.
TypeScript 7.0 was out, but typescript-eslint, Angular and the NestJS CLI
supported only 6.0.

## Decision

- Node.js 24.21.0, written exactly in `.nvmrc`, without `lts/*`.
- TypeScript 6.0.3.
- NestJS stays on 11, because Nx supports NestJS only up to 11.

## Consequences

- Move to Node.js 26 once it is LTS.
- Move to TypeScript 7 and NestJS 12 once the tools support them.
