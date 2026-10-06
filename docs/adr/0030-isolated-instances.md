# 0030. Isolated instances of the apps per branch

- Status: Accepted
- Date: 2026-10-06

## Context

Several features are worked on at once, often by agents, and each must run
to be tried in a browser. Running them from one checkout means switching
branches and sharing one database; running each fully in Docker costs
images and memory for every branch. Starting by hand failed often on a
missing variable or a taken port.

## Decision

- **One instance per branch**: a git worktree next to the main checkout,
  named `<repository>--<branch>`, with the apps run by Nx on the machine,
  not in Docker.
- **Shared servers, separate data.** PostgreSQL, Valkey, Adminer and
  RedisInsight are the main checkout's containers. An instance has its own
  database `app_<branch>` and its own Valkey database, numbered like its
  slot.
- **Slots and port blocks.** Slot N has the ten ports from 41000 + 10·N,
  and the main checkout is slot 0, so the ports of one instance are always
  next to each other. The variables between
  `# per-instance-ports` markers in `.env.example` get the offsets 0, 1,
  2, … in their order; a new app that runs per instance adds its variable
  at the end.
- **One `.env`.** The instance's `.env` is a copy of the main one, made once
  when the instance is created, with its ports, database and Valkey number.
- **At most three instances** besides the main checkout.
- **Handle failures, do not pre-check.** A taken port moves the instance to
  the next free slot. Any other failure stops with the log.
- **`pnpm instance`** (`scripts/instances.mjs`) does it all: `up`, `stop`,
  `down`, `sweep` and `list`. Its registry is `instances.json` in the git
  directory, shared by all worktrees and never committed. It ends with one
  JSON line, like a skill's script ([ADR 0028](0028-agent-skills.md)).
- **Cleanup.** `down` refuses while the worktree has uncommitted changes or
  commits no other branch or remote has. `sweep` removes every instance
  whose pull request is merged and only reports those closed without a
  merge. `up` sweeps first, and so does the end of a feature.

Rejected: keeping the main checkout on Angular's and NestJS's usual ports,
because its ports would then not form a block like the others. Rejected: an
instance fully in Docker, because of the memory and images per
branch. Rejected: a Valkey key prefix per instance, because the code would
have to remember it. Rejected: a port map in each `project.json`, because
`.env` stays the one place for local settings. Rejected: regenerating the
instance's `.env` on every start, because it was not needed.

## Consequences

- Each worktree has its own `node_modules` and Nx daemon; `pnpm install`
  reuses the pnpm store, so it takes seconds.
- A change to the main `.env` reaches existing instances only when they are
  created again.
- Storybook's port is reserved in each block, but the instance does not
  start Storybook; run it with `pnpm nx run storybook:storybook
--port=<STORYBOOK_PORT>` in the worktree.
