# web-helm (Nx project `ui-helm`)

The styled layer of [spartan/ui](https://spartan.ng): Tailwind components on
top of the headless `@spartan-ng/brain`. Each component is an entry point,
imported as `@boilerplate/web-helm/<name>`, for example
`@boilerplate/web-helm/button`. Rules for changing it:
[AGENTS.md](AGENTS.md).

## Impact

What else a change here needs:

- An atom is used by every view in `libs/web/ui`; check their stories in Storybook after a change.
