#!/usr/bin/env bash
# Builds the production images and checks them the way the cluster runs them:
# migrations and seed first, as an initContainer would, then the API.
# Usage: scripts/test-prod-images.sh
set -euo pipefail
cd "$(dirname "$0")/.."

API=boilerplate-api:prod
WEB=boilerplate-web:prod
NETWORK=boilerplate-prod-test
VOLUME=boilerplate-media-test
API_PORT=13000
WEB_PORT=18080
JWT_SECRET=prod-test-secret
B="http://127.0.0.1:$API_PORT/api"

cleanup() {
  docker rm -f prod-test-api prod-test-web prod-test-db >/dev/null 2>&1 || true
  docker volume rm "$VOLUME" >/dev/null 2>&1 || true
  docker network rm "$NETWORK" >/dev/null 2>&1 || true
}
trap cleanup EXIT
cleanup

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "ok: $*"; }

wait_for() {
  for _ in $(seq 30); do curl -fs "$1" >/dev/null && return 0; sleep 0.5; done
  fail "no answer from $1"
}

# Runs the API image with the environment the cluster will give it.
api() {
  docker run --network "$NETWORK" -e LOG_LEVEL=info \
    -e DATABASE_URL=postgres://app:app@prod-test-db:5432/app \
    -e JWT_SECRET="$JWT_SECRET" \
    -e SEED_USER_EMAIL=admin@example.com -e SEED_USER_PASSWORD=admin "$@"
}

run_api() {
  api -d --name prod-test-api -v "$VOLUME:/app/media" \
    -p "127.0.0.1:$API_PORT:3000" "$@" "$API" >/dev/null
  wait_for "$B/health/live"
}

# Logs in and prints the Set-Cookie header of the answer.
login_cookie() {
  curl -fs -o /dev/null -D - -H 'content-type: application/json' \
    -d '{"email":"admin@example.com","password":"admin"}' "$B/auth/login" \
    | grep -i '^set-cookie: access_token='
}

# A valid token for a user without permissions, signed with the test secret.
token_without_permissions() {
  node -e '
    const { createHmac } = require("node:crypto");
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const body = b64({ alg: "HS256", typ: "JWT" }) + "." +
      b64({ sub: "x", email: "x@example.com", permissions: [], iat: now, exp: now + 60 });
    const sig = createHmac("sha256", process.argv[1]).update(body).digest("base64url");
    console.log(body + "." + sig);' "$JWT_SECRET"
}

status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

docker build -q -f apps/api/Dockerfile --target prod -t "$API" . >/dev/null
docker build -q -f apps/web/Dockerfile --target prod -t "$WEB" . >/dev/null
pass "images built"

docker network create "$NETWORK" >/dev/null
docker run -d --name prod-test-db --network "$NETWORK" \
  -e POSTGRES_USER=app -e POSTGRES_PASSWORD=app -e POSTGRES_DB=app \
  postgres:18.6 >/dev/null
for _ in $(seq 30); do
  docker exec prod-test-db pg_isready -U app -d app >/dev/null 2>&1 && break
  sleep 1
done

# Backend
docker run --rm --entrypoint sh "$API" -c 'grep -q "^ID=alpine" /etc/os-release' \
  || fail "api image is not Alpine"
pass "api image is Alpine"

api --rm "$API" node migrate.js | grep -q 'Migrations run: Init' \
  || fail "migrations"
api --rm "$API" node migrate.js | grep -q 'Migrations run: none' \
  || fail "second migration run is not a no-op"
pass "migrations run once"
api --rm "$API" node seed.js >/dev/null && api --rm "$API" node seed.js >/dev/null \
  || fail "seed"
pass "seed can run many times"
# The cleanup command runs without JWT_SECRET, like a CronJob would give it.
docker run --rm --network "$NETWORK" \
  -e DATABASE_URL=postgres://app:app@prod-test-db:5432/app "$API" \
  node cleanup.js | grep -q '^Removed [0-9]* refresh tokens' || fail "cleanup"
pass "cleanup runs without JWT_SECRET"

run_api
[ "$(docker exec prod-test-api id -un)" = node ] || fail "api runs as root"
pass "api runs as node"

curl -fs "$B" | grep -q 'Hello API' || fail "api answer"
pass "api answers"

curl -fs "$B/health/live" | grep -q '"status":"ok"' || fail "liveness probe"
pass "liveness probe answers"
ready=$(curl -fs "$B/health/ready") || fail "readiness probe"
grep -q '"database":{[^}]*"status":"up"' <<<"$ready" || fail "readiness: database"
grep -q '"media":{"status":"up"' <<<"$ready" || fail "readiness: media"
pass "readiness probe reports database and media as up"

docker logs prod-test-api 2>&1 | grep -q 'Log levels' && fail "debug log at LOG_LEVEL=info"
pass "LOG_LEVEL=info hides debug logs"

[ "$(status "$B/docs")" = 404 ] || fail "Swagger is on without SWAGGER_ENABLED"
pass "Swagger is off by default"

[ "$(status "$B/users/me")" = 401 ] || fail "users/me without a token"
pass "routes need a token"
[ "$(status -H 'content-type: application/json' \
  -d '{"email":"admin@example.com","password":"wrong"}' "$B/auth/login")" = 401 ] \
  || fail "login with a wrong password"
pass "wrong password is rejected"
[ "$(status -H 'content-type: application/json' \
  -d '{"email":"admin@example.com","password":"admin","admin":true}' "$B/auth/login")" = 400 ] \
  || fail "unknown body field accepted"
pass "unknown body fields are rejected"

set_cookie=$(login_cookie) || fail "login sets no access_token cookie"
for flag in HttpOnly SameSite=Strict Secure; do
  grep -qi "$flag" <<<"$set_cookie" || fail "access_token cookie without $flag"
done
pass "login sets an HttpOnly, SameSite=Strict, Secure cookie"
cookie="Cookie: $(sed -n 's/^[Ss]et-[Cc]ookie: \(access_token=[^;]*\).*/\1/p' <<<"$set_cookie")"
me=$(curl -fs -H "$cookie" "$B/users/me") || fail "users/me"
grep -q '"email":"admin@example.com"' <<<"$me" || fail "users/me answer"
grep -qi 'password\|token' <<<"$me" && fail "users/me returns a password or token field"
pass "the cookie logs in and users/me has no password field"
[ "$(status -H "$cookie" "$B/users")" = 200 ] || fail "users list with users:read"
[ "$(status -H "authorization: Bearer $(token_without_permissions)" "$B/users")" = 403 ] \
  || fail "users list without users:read"
pass "users:read permission is enforced"

curl -fs -o /dev/null -D - -X POST "$B/auth/logout" \
  | grep -qi '^set-cookie: access_token=;' || fail "logout does not clear the cookie"
pass "logout clears the cookie"

# Refresh tokens: rotation, a race between two tabs, theft and logout.
cookie_value() { sed -n "s/^[Ss]et-[Cc]ookie: \($1=[^;]*\).*/\1/p"; }
login_headers() {
  curl -fs -o /dev/null -D - -H 'content-type: application/json' \
    -d '{"email":"admin@example.com","password":"admin"}' "$B/auth/login"
}
refresh() { curl -s -o /dev/null -D - -X POST -H "Cookie: $1" "$B/auth/refresh"; }
code() { head -1 | awk '{print $2}'; }

headers=$(login_headers)
grep -qi '^set-cookie: refresh_token=.*Path=/api/auth' <<<"$headers" \
  || fail "refresh cookie is not limited to /api/auth"
r1=$(cookie_value refresh_token <<<"$headers")
rotated=$(refresh "$r1")
[ "$(code <<<"$rotated")" = 200 ] || fail "refresh"
r2=$(cookie_value refresh_token <<<"$rotated")
a2=$(cookie_value access_token <<<"$rotated")
[ "$(status -H "Cookie: $a2" "$B/users/me")" = 200 ] || fail "new access token"
pass "refresh issues new tokens"
[ "$(refresh "$r1" | code)" = 401 ] || fail "a used refresh token works again"
r3=$(refresh "$r2" | cookie_value refresh_token)
[ -n "$r3" ] || fail "a reuse within the grace time ended the session"
pass "a used token is refused, a reuse right after does not end the session"
docker exec prod-test-db psql -U app -d app -qc \
  "update refresh_tokens set used_at = now() - interval '1 minute' where used_at is not null"
[ "$(refresh "$r1" | code)" = 401 ] || fail "stolen token accepted"
[ "$(refresh "$r3" | code)" = 401 ] || fail "theft did not end the session"
pass "reusing an old token ends the whole session"
r=$(login_headers | cookie_value refresh_token)
[ "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Cookie: $r" "$B/auth/logout")" = 200 ] \
  || fail "logout"
[ "$(refresh "$r" | code)" = 401 ] || fail "refresh after logout"
pass "logout ends the session"

# Another client address, because the logins above used up the limit.
curl -s -H 'content-type: application/json' -H 'cf-connecting-ip: 192.0.2.1' \
  -d '{"email":"admin@example.com","password":"wrong"}' "$B/auth/login" \
  | grep -q '"code":"AUTH_INVALID_CREDENTIALS"' || fail "no error code"
curl -s -H 'content-type: application/json' -H 'cf-connecting-ip: 192.0.2.1' \
  -d '{"email":"nope","password":"x"}' "$B/auth/login" \
  | grep -q '"field":"email","code":"INVALID_EMAIL"' || fail "no field code"
pass "errors come in the envelope with codes"

curl -fs -D - -o /dev/null "$B/health/live" \
  | grep -qi '^x-content-type-options: nosniff' || fail "no helmet headers"
pass "api sends security headers"

docker exec prod-test-api sh -c 'echo media-ok > /app/media/test.txt' \
  || fail "media volume not writable"
docker rm -f prod-test-api >/dev/null
run_api -e SWAGGER_ENABLED=true
[ "$(curl -fs "$B/media/test.txt")" = media-ok ] || fail "media file lost after restart"
pass "media file survives restart and is served"
[ "$(status "$B/docs")" = 200 ] || fail "Swagger with SWAGGER_ENABLED=true"
pass "SWAGGER_ENABLED=true turns Swagger on"

docker stop prod-test-db >/dev/null
[ "$(status "$B/health/ready")" = 503 ] || fail "readiness with the database down"
[ "$(status "$B/health/live")" = 200 ] || fail "liveness depends on the database"
pass "database down: not ready, but still live"
docker start prod-test-db >/dev/null
docker rm -f prod-test-api >/dev/null

api --rm -v "$VOLUME:/app/media:ro" "$API" >/dev/null 2>&1 \
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

curl -fsI "http://127.0.0.1:$WEB_PORT/" \
  | grep -qi "^content-security-policy: default-src 'self'; script-src 'self'" \
  || fail "no strict CSP"
curl -fsI "http://127.0.0.1:$WEB_PORT/favicon.ico" \
  | grep -qi '^content-security-policy:' || fail "CSP lost where cache headers are set"
curl -fs "http://127.0.0.1:$WEB_PORT/" | grep -qiE '<style|onload=|<script>' \
  && fail "index.html has inline code the CSP blocks"
pass "web sends a strict CSP and index.html has no inline code"

for language in en pl; do
  curl -fs "http://127.0.0.1:$WEB_PORT/i18n/$language.json" | grep -q '"auth"' \
    || fail "no $language translations in the web image"
done
pass "translations are in the web image"

echo "All checks passed."
