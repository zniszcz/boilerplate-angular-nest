# libs/web/helm

spartan/ui helm components: the atoms. Generated code that we own. See
[ADR 0017](../../../docs/adr/0017-spartan-and-storybook.md).

- Add a component only with the CLI, never by hand:
  `pnpm nx g @spartan-ng/cli:ui <name> --directory=libs/web/helm`. It reads
  `components.json`. Keep the Nx project name `ui-helm`; the CLI looks for it.
- Every component gets a story next to it, titled `Atoms/<Name>`.
- Mark every change to generated code with a `Changed from spartan:` comment
  and the reason, so it can be reapplied after regenerating.
- The CLI also edits `.gitignore` and `.prettierignore`; revert those.
