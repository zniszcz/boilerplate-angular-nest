# web

The Angular app. In production it is served by nginx, configured in
[nginx.conf.template](nginx.conf.template).

## Storybook

The image contains Storybook (`apps/storybook`) under `/storybook/`. nginx
serves it only when the container gets `STORYBOOK_ENABLED=true`; the image
sets `false`, so it is off unless the deployment turns it on. Turn it on for
local and test environments, never for production, like `SWAGGER_ENABLED` in
the API. Storybook gets its own, looser headers, because it needs inline
scripts and an iframe; the app keeps the strict ones below.

## Security headers

Why: [ADR 0014](../../docs/adr/0014-strict-content-security-policy.md).

nginx sends security headers with every response. The Content Security
Policy (CSP) lets the page load and run only files from its own domain.

The production build does not inline critical CSS (`inlineCritical: false` in
[project.json](project.json)). Inlining puts a `<style>` tag and an `onload`
handler into `index.html`, and the CSP blocks both.

### Allowing an outside source

Allow a source only when the app really needs it, and only for the kind of
file it serves.

1. Find which CSP directive covers the file:

   | File                         | Directive     |
   | ---------------------------- | ------------- |
   | script                       | `script-src`  |
   | stylesheet                   | `style-src`   |
   | font file                    | `font-src`    |
   | image                        | `img-src`     |
   | `fetch` or XHR to an address | `connect-src` |

2. Add the exact origin, with `https://`, to that directive in the
   `Content-Security-Policy` header in [nginx.conf.template](nginx.conf.template). Never add a
   whole scheme such as `https:`, a wildcard or `'unsafe-inline'`.
3. Check the page in a browser built with `scripts/test-prod-images.sh`:
   the console reports every blocked file as a CSP violation.

nginx.conf.template has a commented example for Google Fonts. The stylesheet comes
from `https://fonts.googleapis.com` (`style-src`), the font files from
`https://fonts.gstatic.com` (`font-src`). To use it, replace the active
`Content-Security-Policy` line with the example.

The dev server (`pnpm dev`) does not send these headers, so a missing source
shows up only in the production image.
