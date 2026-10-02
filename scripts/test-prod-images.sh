#!/usr/bin/env bash
# Builds the production images and checks them the way the cluster runs them.
# Usage: scripts/test-prod-images.sh
set -euo pipefail
cd "$(dirname "$0")/.."

API=boilerplate-api:prod
WEB=boilerplate-web:prod
VOLUME=boilerplate-media-test
API_PORT=13000
WEB_PORT=18080

cleanup() {
  docker rm -f prod-test-api prod-test-web >/dev/null 2>&1 || true
  docker volume rm "$VOLUME" >/dev/null 2>&1 || true
}
trap cleanup EXIT
cleanup

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "ok: $*"; }

wait_for() {
  for _ in $(seq 30); do curl -fs "$1" >/dev/null && return 0; sleep 0.5; done
  fail "no answer from $1"
}

run_api() {
  docker run -d --name prod-test-api -e LOG_LEVEL=info \
    -v "$VOLUME:/app/media" -p "127.0.0.1:$API_PORT:3000" "$API" >/dev/null
  wait_for "http://127.0.0.1:$API_PORT/api"
}

docker build -q -f apps/api/Dockerfile --target prod -t "$API" . >/dev/null
docker build -q -f apps/web/Dockerfile --target prod -t "$WEB" . >/dev/null
pass "images built"

# Backend
docker run --rm --entrypoint sh "$API" -c 'grep -q "^ID=alpine" /etc/os-release' \
  || fail "api image is not Alpine"
pass "api image is Alpine"

run_api
[ "$(docker exec prod-test-api id -un)" = node ] || fail "api runs as root"
pass "api runs as node"

curl -fs "http://127.0.0.1:$API_PORT/api" | grep -q 'Hello API' || fail "api answer"
pass "api answers"

curl -fs "http://127.0.0.1:$API_PORT/api/health/live" | grep -q '"status":"ok"' \
  || fail "liveness probe"
pass "liveness probe answers"
curl -fs "http://127.0.0.1:$API_PORT/api/health/ready" | grep -q '"media":{"status":"up"' \
  || fail "readiness probe does not report media as up"
pass "readiness probe reports media as up"

docker logs prod-test-api 2>&1 | grep -q 'Log levels' && fail "debug log at LOG_LEVEL=info"
pass "LOG_LEVEL=info hides debug logs"

docker exec prod-test-api sh -c 'echo media-ok > /app/media/test.txt' \
  || fail "media volume not writable"
docker rm -f prod-test-api >/dev/null
run_api
[ "$(curl -fs "http://127.0.0.1:$API_PORT/api/media/test.txt")" = media-ok ] \
  || fail "media file lost after restart"
pass "media file survives restart and is served"
docker rm -f prod-test-api >/dev/null

docker run --rm -v "$VOLUME:/app/media:ro" "$API" >/dev/null 2>&1 \
  && fail "api starts with read-only media"
pass "api refuses to start with read-only media"

# Frontend
docker run -d --name prod-test-web -p "127.0.0.1:$WEB_PORT:8080" "$WEB" >/dev/null
wait_for "http://127.0.0.1:$WEB_PORT/"
docker exec prod-test-web grep -q '^ID=alpine' /etc/os-release || fail "web image is not Alpine"
pass "web image is Alpine"
[ "$(docker exec prod-test-web id -u)" != 0 ] || fail "web runs as root"
pass "web runs without root"

curl -fs "http://127.0.0.1:$WEB_PORT/some/route" | grep -q '<app-root' \
  || fail "unknown path does not fall back to index.html"
pass "Angular routes fall back to index.html"

curl -fsI "http://127.0.0.1:$WEB_PORT/" | grep -qi 'cache-control: no-cache' \
  || fail "index.html is cached"
pass "index.html is not cached"

echo "All checks passed."
