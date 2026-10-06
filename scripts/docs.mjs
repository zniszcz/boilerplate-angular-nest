// Keeps the lists in the documentation in sync with the repository, so they
// never go stale: the projects with what their README says, the concepts,
// the ADR index, the agent skills and the impact of each project, whose
// rules it also checks. Only the
// parts between generated markers change.
//   node scripts/docs.mjs generate   rewrites them
//   node scripts/docs.mjs check      fails when they are out of date (CI)
// See docs/adr/0020-documentation-layout.md.
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  writeFileSync,
} from 'node:fs';
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

// Every rule is checked and every broken one reported, like a linter; the
// lists are written only when nothing is broken.
const problems = [];
const problem = (message) => problems.push(message);

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

function projectDirs() {
  return execFileSync('git', ['ls-files', '*project.json'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .filter((file) => file && !file.includes('node_modules'))
    .sort()
    .map((file) => dirname(file));
}

function projects() {
  const rows = projectDirs().map((dir) => {
    const file = join(dir, 'project.json');
    const project = JSON.parse(read(file));
    if (!existsSync(join(ROOT, dir, 'README.md'))) {
      problem(`${dir} has no README.md`);
      return '';
    }
    const what = summary(read(join(dir, 'README.md')));
    if (!what || what.includes('generated with')) {
      problem(`${dir}/README.md needs a first paragraph about it`);
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

/** The bullets of a README's `## Impact` section, each on one line. */
function impactOf(markdown) {
  const section = markdown.split(/^## Impact\s*$/m)[1]?.split(/^## /m)[0];
  return (section ?? '')
    .split(/\n(?=- )/)
    .filter((item) => item.startsWith('- '))
    .map((item) => item.replace(/\s+/g, ' ').trim());
}

/** What each project's change needs, from the `## Impact` of its README. */
function impact() {
  return projectDirs()
    .map((dir) => {
      const name = JSON.parse(read(join(dir, 'project.json'))).name;
      const readme = join(dir, 'README.md');
      const items = existsSync(join(ROOT, readme))
        ? impactOf(read(readme))
        : [];
      if (items.length === 0) {
        problem(
          `${readme} needs a ## Impact section with at least one "- " item`,
        );
      }
      const link = relative('docs/development', join(dir, 'README.md'));
      // Links in the README are relative to it; make them work from here.
      const fixed = items.map((item) =>
        item
          .replace(/\]\(#([^)]+)\)/g, `](${link}#$1)`)
          .replace(
            /\]\((?!https?:|#)([^)]+)\)/g,
            (_, target) =>
              `](${relative('docs/development', join(dir, target))})`,
          ),
      );
      return `### [${name}](${link})\n\n${fixed.join('\n')}`;
    })
    .join('\n\n');
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

/** The frontmatter fields a skill needs: name, description, metadata.kind. */
function frontmatter(markdown, file) {
  const block = markdown.match(/^---\n([\s\S]*?)\n---/)?.[1];
  if (!block) {
    problem(`${file} has no frontmatter`);
    return {};
  }
  const field = (key, indent = '') => {
    const match = block.match(
      new RegExp(
        `^${indent}${key}:[ \\t]*(.*)((?:\\n${indent}[ \\t]+.*)*)`,
        'm',
      ),
    );
    if (!match) {
      return undefined;
    }
    // A folded or literal block (`>` or `|`) continues on indented lines.
    const first = /^[>|][-+]?$/.test(match[1]) ? '' : match[1];
    return `${first} ${match[2]}`.replace(/\s+/g, ' ').trim();
  };
  return {
    name: field('name'),
    description: field('description'),
    kind: field('kind', '  '),
  };
}

const KINDS = ['step', 'aggregator'];

/** GitHub's anchor for a heading. */
const slug = (heading) =>
  heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .replace(/ /g, '-');

/** Fails on a link in a skill to a Markdown file or heading that is gone,
 * so renaming a step in CONTRIBUTING.md cannot break skills silently. */
function checkLinks(file) {
  for (const [, target] of read(file).matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^https?:/.test(target)) {
      continue;
    }
    const [path, anchor] = target.split('#');
    const linked = path ? join(dirname(file), path) : file;
    if (!existsSync(join(ROOT, linked))) {
      problem(`${file} links to ${target}, which does not exist`);
      continue;
    }
    if (anchor && linked.endsWith('.md')) {
      const text = read(linked);
      const headings = [
        ...[...text.matchAll(/^#+ (.+)$/gm)].map((match) => slug(match[1])),
        ...[...text.matchAll(/<a id="([^"]+)"/g)].map((match) => match[1]),
      ];
      if (!headings.includes(anchor)) {
        problem(`${file} links to ${target}, a heading that does not exist`);
      }
    }
  }
}

function isLinkTo(path, target) {
  try {
    return (
      lstatSync(join(ROOT, path)).isSymbolicLink() &&
      readlinkSync(join(ROOT, path)) === target
    );
  } catch {
    return false;
  }
}

function skills() {
  const dirs = (dir) =>
    existsSync(join(ROOT, dir))
      ? readdirSync(join(ROOT, dir), { withFileTypes: true })
          .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
          .map((entry) => entry.name)
          .sort()
      : [];
  const names = dirs('.agents/skills');
  for (const link of dirs('.claude/skills')) {
    if (!names.includes(link)) {
      problem(
        `.claude/skills/${link} has no skill in .agents/skills. Remove it.`,
      );
    }
  }
  const rows = names.map((name) => {
    const dir = `.agents/skills/${name}`;
    const file = `${dir}/SKILL.md`;
    const text = read(file);
    const meta = frontmatter(text, file);
    if (meta.name !== name) {
      problem(`${file}: name must be "${name}", like its folder`);
    }
    if (!meta.description) {
      problem(`${file} needs a description`);
    }
    if (!KINDS.includes(meta.kind)) {
      problem(`${file} needs metadata.kind: ${KINDS.join(' or ')}`);
    }
    if (!isLinkTo(`.claude/skills/${name}`, `../../${dir}`)) {
      problem(`${dir} is not linked for Claude Code. Run: pnpm skills:link`);
    }
    checkLinks(file);
    const contract = text.split(/^## Contract\s*$/m)[1]?.split(/^## /m)[0];
    if (existsSync(join(ROOT, dir, 'scripts')) && !contract) {
      problem(`${file} has scripts, so it needs a ## Contract section`);
    }
    const statuses = [...(contract ?? '').matchAll(/^\|\s*(`[^`]+`)/gm)]
      .map((match) => match[1])
      .join(' ');
    return `| [${name}](${name}/SKILL.md) | ${meta.kind} | ${summary(meta.description ?? '')} | ${statuses} |`;
  });
  if (rows.length === 0) {
    return 'No skills yet.';
  }
  return [
    '| Skill | Kind | Goal | Script statuses |',
    '| --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}

const TARGETS = [
  { file: 'docs/README.md', blocks: { projects, concepts } },
  { file: 'docs/adr/README.md', blocks: { adrs } },
  { file: '.agents/skills/README.md', blocks: { skills } },
  { file: 'docs/development/impact.md', blocks: { impact } },
];

const outputs = [];
for (const { file, blocks } of TARGETS) {
  let text = read(file);
  for (const [name, build] of Object.entries(blocks)) {
    const start = `<!-- generated:${name} -->`;
    const end = `<!-- /generated:${name} -->`;
    const from = text.indexOf(start);
    const to = text.indexOf(end);
    if (from < 0 || to < 0) {
      problem(`${file} has no ${start} ... ${end} markers`);
      continue;
    }
    text = `${text.slice(0, from + start.length)}\n\n${build()}\n\n${text.slice(to)}`;
  }
  const path = join(ROOT, file);
  const options = await prettier.resolveConfig(path);
  const formatted = await prettier.format(text, { ...options, filepath: path });
  if (formatted !== read(file)) {
    outputs.push({ file, path, formatted });
  }
}

if (problems.length > 0) {
  // One line each, so an agent or a person can act on every one.
  for (const message of problems) {
    console.error(message);
  }
  console.error(`${problems.length} problems`);
  process.exit(1);
}
for (const { file, path, formatted } of outputs) {
  if (mode === 'check') {
    console.error(`${file} is out of date. Run: pnpm docs:generate`);
  } else {
    writeFileSync(path, formatted);
    console.log(`Updated ${file}`);
  }
}
process.exit(mode === 'check' && outputs.length > 0 ? 1 : 0);
