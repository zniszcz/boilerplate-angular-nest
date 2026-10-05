# 0014. Strict Content Security Policy and helmet

- Status: Accepted
- Date: 2026-10-05

## Context

The web app and the API share one domain behind Cloudflare. Security headers
tell the browser what a page may load and run, which limits the damage of an
XSS bug. Apps made from the template will almost surely use Google Fonts, and
later analytics, but the template itself loads nothing from outside.

## Decision

- nginx sends a Content Security Policy that allows only the app's own files
  (`'self'`), plus `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` and
  `Strict-Transport-Security`. `add_header_inherit merge` keeps them in
  locations that set their own cache headers.
- An outside source is added only when an app needs it, as an exact origin in
  the matching directive. `apps/web/README.md` describes how, and `nginx.conf`
  has a commented example for Google Fonts.
- The production build does not inline critical CSS, because the inlined
  `<style>` tag and `onload` handler would need `'unsafe-inline'`.
- The API uses the `helmet` defaults. Its policy also lets the Swagger UI
  work.

Rejected: allowing Google Fonts in advance, because the template does not use
them, and every allowed source widens what an attacker could load.
Rejected: `'unsafe-inline'` for styles, because inlined critical CSS is a small
speed gain.

## Consequences

- The dev server sends none of these headers, so a missing source shows up
  only in the production image. `scripts/test-prod-images.sh` checks the
  policy and that `index.html` has no inline code.
- A first paint may be slightly later without inlined critical CSS.
