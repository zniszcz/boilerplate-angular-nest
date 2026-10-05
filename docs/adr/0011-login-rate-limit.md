# 0011. Rate limit for login and refresh

- Status: Accepted
- Date: 2026-10-05

## Context

The server is open to the internet and gets password guessing attempts. Each
login attempt also hashes a password, which is expensive on a 2 core server.
On the server every request reaches the API from Traefik, so the connection
address is the same for all clients.

## Decision

- Login: 5 attempts a minute per client address, then a 15 minute block.
  About 480 attempts a day per address instead of 7200.
- Refresh: 20 attempts a minute, then a 1 minute block, because the web app
  calls it on its own.
- Other routes have no limit.
- The client address comes from `CF-Connecting-IP`. It can be trusted because
  the firewall lets only Cloudflare reach ports 80 and 443. Without it, as
  locally, the connection address is used.
- Counters live in memory, which fits one API instance.

Rejected: a block that grows with each repeat, because it needs custom code
and an attacker changes addresses anyway. Attacks from many addresses are
better stopped by a Cloudflare rate limiting rule, in front of the server.

## Consequences

- There is no way to unblock an address from a panel. Restarting the API
  clears all counters.
- A block hits everyone behind one address, such as one office.
- More API instances need shared counters, for example in Valkey.
