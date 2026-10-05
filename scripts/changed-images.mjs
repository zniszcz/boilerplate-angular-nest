// Prints, as a JSON array, the images to build: the apps that Nx sees as
// affected between NX_BASE and NX_HEAD. Storybook ships inside the web image,
// so a change to it rebuilds web. Usage: NX_BASE=<sha> node scripts/changed-images.mjs
import { execFileSync } from 'node:child_process';

const IMAGE_OF_APP = { api: 'api', web: 'web', storybook: 'web' };

const base = process.env.NX_BASE ?? 'HEAD~1';
const head = process.env.NX_HEAD ?? 'HEAD';
const affected = JSON.parse(
  execFileSync(
    'pnpm',
    [
      '--silent',
      'nx',
      'show',
      'projects',
      '--affected',
      '--type=app',
      `--base=${base}`,
      `--head=${head}`,
      '--json',
    ],
    { encoding: 'utf8' },
  ),
);
const images = [
  ...new Set(affected.map((app) => IMAGE_OF_APP[app]).filter(Boolean)),
].sort();
console.log(JSON.stringify(images));
