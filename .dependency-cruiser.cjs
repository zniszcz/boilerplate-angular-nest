// Layers inside each backend domain library, and cycles everywhere.
// Boundaries between libraries are Nx's job (eslint.config.mjs), so no rule
// here repeats one there. See docs/adr/0015-ddd-layers.md.
const { readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

// Domain libraries are the projects tagged `type:domain`, so the Nx tags stay
// the one place that says what a domain is.
const DOMAINS = readdirSync(join(__dirname, 'libs/api')).filter((name) => {
  try {
    const project = JSON.parse(
      readFileSync(join(__dirname, 'libs/api', name, 'project.json'), 'utf8'),
    );
    return (project.tags ?? []).includes('type:domain');
  } catch {
    return false;
  }
});
const domains = DOMAINS.join('|');
const layer = (name) => `^libs/api/(${domains})/src/lib/${name}/`;
const own = (names) => `^libs/api/$1/src/lib/(${names})/`;

module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'Cycles make modules impossible to understand or move alone. A cycle made only of `import type` is gone at runtime, so it does not count.',
      from: {},
      to: {
        circular: true,
        viaOnly: { dependencyTypesNot: ['type-only'] },
      },
    },
    {
      name: 'domain-is-pure',
      severity: 'error',
      comment:
        'domain imports only its own domain folder: no framework, no other layer, no other library.',
      from: { path: layer('domain') },
      to: { pathNot: own('domain') },
    },
    {
      name: 'application-uses-domain',
      severity: 'error',
      comment:
        'application imports only domain and @nestjs/common for dependency injection. Ports for everything else.',
      from: { path: layer('application') },
      to: {
        pathNot: [
          own('application|domain'),
          '(^|/)node_modules/@nestjs/common/',
        ],
      },
    },
    {
      name: 'api-skips-infrastructure',
      severity: 'error',
      comment: 'api talks to application, never to infrastructure directly.',
      from: { path: layer('api') },
      to: { path: own('infrastructure') },
    },
    {
      name: 'infrastructure-skips-api',
      severity: 'error',
      from: { path: layer('infrastructure') },
      to: { path: own('api') },
    },
    {
      name: 'other-domains-only-from-infrastructure',
      severity: 'error',
      comment:
        'Only infrastructure adapters may use another domain, through a port of this one.',
      from: {
        path: `^libs/api/(${domains})/src/lib/(domain|application|api)/`,
      },
      to: { path: `^libs/api/(${domains})/`, pathNot: '^libs/api/$1/' },
    },
    {
      name: 'other-domains-through-index',
      severity: 'error',
      comment: 'Another domain is used only through its src/index.ts.',
      from: { path: `^libs/api/(${domains})/` },
      to: {
        path: `^libs/api/(${domains})/src/lib/`,
        pathNot: '^libs/api/$1/',
      },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['\\.spec\\.ts$', '(^|/)dist/', '(^|/)tmp/'] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.js', '.mjs', '.cjs', '.json'],
    },
  },
};
