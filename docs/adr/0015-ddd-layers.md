# 0015. Strict DDD layers, checked by Nx and dependency-cruiser

- Status: Accepted
- Date: 2026-10-05

## Context

The template should teach DDD and NestJS, and help AI agents put code in the
right place. Nx checks imports only between projects, not between folders of
one project. dependency-cruiser is the tool used at work.

## Decision

Every backend domain library (`type:domain`) has the same four layers as
folders in `src/lib`, plus a module file that wires them:

| Layer            | Holds                                                    | May import                        |
| ---------------- | -------------------------------------------------------- | --------------------------------- |
| `domain`         | aggregates, value objects, repository ports              | only `domain`                     |
| `application`    | use cases, other ports                                   | `domain`, `@nestjs/common` for DI |
| `infrastructure` | TypeORM records, repositories, adapters to other domains | anything except `api`             |
| `api`            | controllers, DTOs                                        | anything except `infrastructure`  |

- Ports are abstract classes, so NestJS uses them as injection tokens and the
  domain needs no framework.
- One repository per aggregate. An aggregate changes only through its own
  methods and refers to another aggregate by id.
- Only `infrastructure` may use another domain, through that domain's
  `src/index.ts`, behind a port named in this domain's words (an
  anti-corruption layer). No foreign keys between domains.
- Generic domains (authentication, notifications) follow the same layers but
  stay thin. `libs/api/experience` will be the rich example.
- Sessions moved from `users` to a new `authentication` domain, and the
  technical library `auth` became `access`, so it is not mistaken for a
  domain.

Two tools, no rule in both:

- Nx (`@nx/enforce-module-boundaries`, tags in `project.json`): boundaries
  between libraries. Tags: `scope:api|web|shared` and
  `type:app|domain|platform|feature|ui|contracts`.
- dependency-cruiser (`.dependency-cruiser.cjs`, `pnpm architecture`): layers
  inside a domain library and cycles. It reads the `type:domain` tag from
  the Nx projects, so the tags stay the one list of domains.

Rejected: a library per layer, because every domain would become four
projects. Rejected: Sheriff and eslint-plugin-boundaries, good tools, but
dependency-cruiser is the one used at work. Rejected: generating one tool's
rules from the other, because with no shared rules there is nothing to sync.

## Consequences

- Nx reports in the editor; layer mistakes show up only when
  `pnpm architecture` runs.
- Even a thin domain has mapping between records, aggregates and DTOs.
- Orphan rows can appear across domains, for example tokens of a deleted
  user. Readers must tolerate them; cleanup jobs remove them.
