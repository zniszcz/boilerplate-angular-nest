// Links every skill in .agents/skills to .claude/skills, the only place
// Claude Code reads skills from, so all agents share one copy. Run by the
// pre-commit hook; pnpm docs:check fails on a missing or orphaned link.
// See docs/adr/0028-agent-skills.md.
//   node scripts/skills.mjs link
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
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

function isLink(path) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}
