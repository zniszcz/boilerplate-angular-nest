#!/usr/bin/env bash
# Switches CI between GitHub-hosted runners (the default) and self-hosted
# runners, and helps set one up. Every job has
#   runs-on: ${{ vars.CI_RUNNER || 'ubuntu-24.04' }}
# so without the repository variable CI_RUNNER nothing changes, and with it
# every job goes to runners that carry that label. How and when to use it:
# docs/development/ci-runners.md and docs/adr/0033-ci-runner-switch.md.
#
# Usage:
#   scripts/ci-runner.sh status                    the variable and the registered runners
#   scripts/ci-runner.sh check                     every job in .github/workflows uses the switch
#   scripts/ci-runner.sh use-hosted                delete CI_RUNNER: back to GitHub-hosted runners
#   scripts/ci-runner.sh use-self-hosted [label]   set CI_RUNNER (default label self-hosted); refuses
#                                                  without an online runner with that label, or on a
#                                                  public repository, unless --force
#   scripts/ci-runner.sh register <dir> [name] [label]
#                                                  download the runner into <dir> and register it
#   scripts/ci-runner.sh unregister <dir>          remove the runner registered in <dir>
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SWITCH="runs-on: \${{ vars.CI_RUNNER || 'ubuntu-24.04' }}"

repo() { gh repo view --json nameWithOwner --jq .nameWithOwner; }

online_with_label() {
  gh api "repos/$(repo)/actions/runners" --paginate \
    --jq ".runners[] | select(.status == \"online\") | select([.labels[].name] | index(\"$1\")) | .name"
}

case "${1:-}" in
  status)
    r="$(repo)"
    value="$(gh variable get CI_RUNNER --repo "$r" 2>/dev/null || true)"
    if [ -n "$value" ]; then
      echo "CI_RUNNER=$value: jobs run on self-hosted runners labelled $value"
    else
      echo "CI_RUNNER is not set: jobs run on GitHub-hosted ubuntu-24.04"
    fi
    echo "repository: $r ($(gh repo view "$r" --json visibility --jq .visibility | tr '[:upper:]' '[:lower:]'))"
    echo "self-hosted runners:"
    gh api "repos/$r/actions/runners" --paginate \
      --jq '.runners[] | "  \(.name)  \(.status)  \([.labels[].name] | join(","))"' 2>/dev/null || echo "  (cannot list, needs admin rights)"
    ;;
  check)
    bad=0
    for wf in "$ROOT"/.github/workflows/*.yml; do
      while IFS= read -r line; do
        trimmed="${line#"${line%%[![:space:]]*}"}"
        if [ "$trimmed" != "$SWITCH" ]; then
          echo "${wf#"$ROOT"/}: $trimmed"
          bad=1
        fi
      done < <(grep -E '^[[:space:]]*runs-on:' "$wf" || true)
    done
    [ "$bad" = 0 ] && echo "every job uses the runner switch"
    exit "$bad"
    ;;
  use-hosted)
    gh variable delete CI_RUNNER --repo "$(repo)" 2>/dev/null || true
    echo "CI_RUNNER deleted: jobs run on GitHub-hosted runners"
    ;;
  use-self-hosted)
    shift
    force=0; label=self-hosted
    for a in "$@"; do case "$a" in --force) force=1 ;; *) label="$a" ;; esac; done
    r="$(repo)"
    if [ "$force" = 0 ] && [ "$(gh repo view "$r" --json visibility --jq .visibility)" = PUBLIC ]; then
      echo "error: $r is public. A pull request from a fork would run its code on your machine," >&2
      echo "and hosted runners are free for public repositories. Use --force only if you know why." >&2
      exit 1
    fi
    if [ "$force" = 0 ] && [ -z "$(online_with_label "$label")" ]; then
      echo "error: no online runner with the label $label; jobs would wait forever." >&2
      echo "Register one first: scripts/ci-runner.sh register <dir>" >&2
      exit 1
    fi
    gh variable set CI_RUNNER --repo "$r" --body "$label"
    echo "CI_RUNNER=$label: jobs run on self-hosted runners; back with scripts/ci-runner.sh use-hosted"
    ;;
  register)
    dir="${2:?usage: $0 register <dir> [name] [label]}"
    name="${3:-$(hostname)-$(basename "$dir")}"
    label="${4:-self-hosted}"
    r="$(repo)"
    mkdir -p "$dir"
    if [ ! -x "$dir/config.sh" ]; then
      case "$(uname -m)" in x86_64) arch=x64 ;; aarch64 | arm64) arch=arm64 ;; *) echo "error: unknown machine $(uname -m)" >&2; exit 1 ;; esac
      case "$(uname -s)" in Linux) os=linux ;; Darwin) os=osx ;; *) echo "error: unknown system" >&2; exit 1 ;; esac
      tag="$(gh api repos/actions/runner/releases/latest --jq .tag_name)"
      file="actions-runner-$os-$arch-${tag#v}.tar.gz"
      echo "downloading $file into $dir"
      gh release download "$tag" --repo actions/runner --pattern "$file" --dir "$dir" --clobber
      # The release notes list a SHA-256 for every archive; refuse one that does not match.
      want="$(gh api "repos/actions/runner/releases/tags/$tag" --jq .body \
        | grep -oE "<!-- BEGIN SHA $os-$arch -->[0-9a-f]{64}" | grep -oE '[0-9a-f]{64}' | head -1 || true)"
      have="$(sha256sum "$dir/$file" | cut -d' ' -f1)"
      if [ -z "$want" ] || [ "$want" != "$have" ]; then
        echo "error: checksum of $file does not match the release notes (${want:-none found}); not unpacked" >&2
        exit 1
      fi
      tar -xzf "$dir/$file" -C "$dir"
      rm -f "$dir/$file"
    fi
    token="$(gh api -X POST "repos/$r/actions/runners/registration-token" --jq .token)"
    (cd "$dir" && ./config.sh --unattended --replace --url "https://github.com/$r" --token "$token" \
      --name "$name" --labels "$label")
    cat <<OUT
registered $name with the label $label. Start it and keep it running:
  cd "$dir" && ./run.sh              (in a terminal or a tmux window)
  cd "$dir" && sudo ./svc.sh install && sudo ./svc.sh start   (as a service)
Then: scripts/ci-runner.sh use-self-hosted $label
OUT
    ;;
  unregister)
    dir="${2:?usage: $0 unregister <dir>}"
    token="$(gh api -X POST "repos/$(repo)/actions/runners/remove-token" --jq .token)"
    (cd "$dir" && ./config.sh remove --token "$token")
    ;;
  *)
    sed -n '9,18p' "$0" | sed 's/^# \{0,1\}//'
    exit 2
    ;;
esac
