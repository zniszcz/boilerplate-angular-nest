// Keeps the lists in the documentation in sync with the repository, so they
// never go stale: the projects with what their README says, the concepts and
// the ADR index. Only the parts between generated markers change.
//   node scripts/docs.mjs generate   rewrites them
//   node scripts/docs.mjs check      fails when they are out of date (CI)
// See docs/adr/0020-documentation-layout.md.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2];
if (mode !== 'generate' && mode !== 'check') {
  console.error('Usage: node scripts/docs.mjs generate|check');
  process.exit(2);
}

const read = (path) => readFileSync(join(ROOT, path), 'utf8');

/** The first sentence after the title, as one line without links. */
function summary(markdown) {
  const paragraph = markdown
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .find((block) => block && !block.startsWith('#') && !block.startsWith('-'));
  const line = (paragraph ?? '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .replace(/\|/g, '\\|');
  // Up to the first full stop that ends a sentence, not one in `a.b`.
  return line.match(/^.*?\.(?=\s|$)/)?.[0] ?? line;
}

function projects() {
  const files = execFileSync('git', ['ls-files', '*project.json'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .filter((file) => file && !file.includes('node_modules'))
    .sort();
  const rows = files.map((file) => {
    const dir = dirname(file);
    const project = JSON.parse(read(file));
    let readme;
    try {
      readme = read(join(dir, 'README.md'));
    } catch {
      throw new Error(`${dir} has no README.md`);
    }
    const what = summary(readme);
    if (!what || what.includes('generated with')) {
      throw new Error(`${dir}/README.md needs a first paragraph about it`);
    }
    const tags = (project.tags ?? []).map((tag) => `\`${tag}\``).join(' ');
    const link = relative('docs', join(dir, 'README.md'));
    return `| [${dir}](${link}) | ${tags} | ${what} |`;
  });
  return [
    '| Project | Tags | What it is |',
    '| --- | --- | --- |',
    ...rows,
  ].join('\n');
}

function concepts() {
  return readdirSync(join(ROOT, 'docs/concepts'))
    .filter((file) => file.endsWith('.md'))
    .sort()
    .map((file) => {
      const text = read(join('docs/concepts', file));
      const title = text.match(/^# (.+)$/m)[1];
      return `- [${title}](concepts/${file}): ${summary(text)}`;
    })
    .join('\n');
}

function adrs() {
  const rows = readdirSync(join(ROOT, 'docs/adr'))
    .filter((file) => /^\d{4}-.+\.md$/.test(file))
    .sort()
    .map((file) => {
      const [, nr, title] = read(join('docs/adr', file)).match(
        /^# (\d{4})\. (.+)$/m,
      );
      return `| [${nr}](${file}) | ${title} |`;
    });
  return ['| Nr | Decision |', '| --- | --- |', ...rows].join('\n');
}

const TARGETS = [
  { file: 'docs/README.md', blocks: { projects, concepts } },
  { file: 'docs/adr/README.md', blocks: { adrs } },
];

let stale = false;
for (const { file, blocks } of TARGETS) {
  let text = read(file);
  for (const [name, build] of Object.entries(blocks)) {
    const start = `<!-- generated:${name} -->`;
    const end = `<!-- /generated:${name} -->`;
    const from = text.indexOf(start);
    const to = text.indexOf(end);
    if (from < 0 || to < 0) {
      throw new Error(`${file} has no ${start} ... ${end} markers`);
    }
    text = `${text.slice(0, from + start.length)}\n\n${build()}\n\n${text.slice(to)}`;
  }
  const path = join(ROOT, file);
  const options = await prettier.resolveConfig(path);
  const formatted = await prettier.format(text, { ...options, filepath: path });
  if (formatted === read(file)) {
    continue;
  }
  if (mode === 'check') {
    console.error(`${file} is out of date. Run: pnpm docs:generate`);
    stale = true;
  } else {
    writeFileSync(path, formatted);
    console.log(`Updated ${file}`);
  }
}
process.exit(stale ? 1 : 0);
