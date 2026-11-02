#!/usr/bin/env bash
# The one command that starts or resumes the agent fleet's manager: tmux
# session <name>-manager with the manager's conversation (window claude) and
# the guard (window guard). It resumes the conversation by the id saved in
# .fleet/manager-session, never with --continue. See
# docs/development/agent-fleet.md and scripts/fleet/fleet-manager.sh.
exec "$(dirname "$(readlink -f "$0")")/scripts/fleet/fleet-manager.sh" "$@"
