// Links every skill in .agents/skills to .claude/skills, the only place
// Claude Code reads skills from, so all agents share one copy, and removes
// links whose skill is gone. It fixes only what has one right answer and
// prints each fix. Run by the pre-commit hook; pnpm docs:check, run by CI,
// only reports.
// See docs/adr/0028-agent-skills.md.
//   node scripts/skills.mjs link
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = join(ROOT, '.agents/skills');
const LINKS = join(ROOT, '.claude/skills');

if (process.argv[2] !== 'link') {
  console.error('Usage: node scripts/skills.mjs link');
  process.exit(2);
}

const skills = existsSync(SKILLS)
  ? readdirSync(SKILLS, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  : [];
for (const name of skills) {
  const link = join(LINKS, name);
  if (existsSync(link) || isLink(link)) {
    continue;
  }
  mkdirSync(LINKS, { recursive: true });
  symlinkSync(join('../../.agents/skills', name), link);
  console.log(`Linked .claude/skills/${name}`);
}

// A link to a removed skill. A real folder here is left for a person to
// move into .agents/skills, and pnpm docs:check reports it.
const links = existsSync(LINKS) ? readdirSync(LINKS) : [];
for (const name of links) {
  const link = join(LINKS, name);
  if (isLink(link) && !existsSync(link)) {
    rmSync(link);
    console.log(`Removed .claude/skills/${name}, its skill is gone`);
  }
}

function isLink(path) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}
