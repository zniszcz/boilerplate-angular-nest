// Reads and updates a task list (<feature>.todo.md), so an agent never has
// to load the whole file or edit checkboxes by hand. See CONTRIBUTING.md,
// steps 3 and 5, and the format in .agents/skills/todo-new/references.
//   node .agents/skills/todo-next/scripts/todo.mjs <command> <file> [args]
//   check <file>                  is the file in the right format
//   next <file>                   the next task to do
//   mark <file> <line> red|green  record what tdd-check saw
//   skip-tdd <file> <line> <why>  only on the developer's explicit word
//   block <file> <line> <why>     the task cannot go on
//   done <file> <line>            tick it; needs red and green if it has Test:
//   report <file>                 progress, skipped TDD and blocked tasks
// The last line of stdout is JSON: status, summary, log, data.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const [command, file, lineArg, ...rest] = process.argv.slice(2);

function finish(status, summary, data = {}) {
  console.log(JSON.stringify({ status, summary, log: null, data }));
  process.exit(0);
}

if (!command || !file) {
  console.error(
    'Usage: todo.mjs check|next|mark|skip-tdd|block|done|report <file> [line] [arg]',
  );
  process.exit(2);
}
if (!existsSync(file)) {
  finish('not-found', `${file} does not exist`);
}
const lines = readFileSync(file, 'utf8').split('\n');
const TASK = /^( *)- \[( |x)\] (.+)$/;
const indent = (line) => line.match(/^ */)[0].length;

/** Every task with its fields, subtasks and the lines it spans. */
function parse() {
  const tasks = [];
  lines.forEach((line, index) => {
    const match = line.match(TASK);
    if (!match) {
      return;
    }
    const task = {
      line: index + 1,
      depth: match[1].length,
      done: match[2] === 'x',
      title: match[3],
      fields: {},
      read: [],
      tdd: [],
      children: [],
      lastField: index,
    };
    // Its own fields: the indented lines after it, up to its first subtask
    // or the first line that is not indented deeper.
    let key;
    for (let i = index + 1; i < lines.length; i += 1) {
      const next = lines[i];
      if (next.trim() === '') {
        continue;
      }
      if (indent(next) <= task.depth || TASK.test(next)) {
        break;
      }
      const field = next.trim().match(/^(What|Read|Test|Status|TDD):\s*(.*)$/);
      if (field) {
        key = field[1] === 'TDD' ? undefined : field[1].toLowerCase();
        if (field[1] === 'TDD') {
          task.tdd.push(field[2]);
        } else {
          task.fields[key] = field[2];
        }
      } else if (next.trim().startsWith('- ')) {
        task.read.push(next.trim().slice(2));
        key = 'read';
      } else if (key === 'read' && task.read.length > 0) {
        task.read[task.read.length - 1] += ` ${next.trim()}`;
      } else if (key) {
        // A field that goes on over several lines.
        task.fields[key] = `${task.fields[key]} ${next.trim()}`.trim();
      }
      task.lastField = i;
    }
    const parent = [...tasks].reverse().find((t) => t.depth < task.depth);
    if (parent) {
      task.parent = parent.line;
      parent.children.push(task);
    }
    tasks.push(task);
  });
  return tasks;
}

const tasks = parse();
const leaves = tasks.filter((task) => task.children.length === 0);
const progress = () => ({
  done: leaves.filter((task) => task.done).length,
  total: leaves.length,
});
const view = (task) => ({
  line: task.line,
  title: task.title,
  parent: tasks.find((t) => t.line === task.parent)?.title,
  what: task.fields.what,
  read: task.read,
  test: task.fields.test,
  tdd: task.tdd,
});

function save() {
  writeFileSync(file, lines.join('\n'));
}

function taskAt() {
  const task = tasks.find((t) => t.line === Number(lineArg));
  if (!task) {
    finish('not-a-task', `Line ${lineArg} is not a task; run next again`);
  }
  return task;
}

/** Adds a field line under the task's own fields, before its subtasks. */
function addField(task, text, replace) {
  const pad = ' '.repeat(task.depth + 2);
  for (let i = task.line; i <= task.lastField; i += 1) {
    if (replace?.test(lines[i])) {
      lines[i] = `${pad}${text}`;
      return;
    }
  }
  lines.splice(task.lastField + 1, 0, `${pad}${text}`);
}

switch (command) {
  case 'check': {
    const problems = [];
    if (!lines.some((line) => line.startsWith('# '))) {
      problems.push('no # title');
    }
    if (tasks.length === 0) {
      problems.push('no tasks (- [ ] ...)');
    }
    for (const task of tasks) {
      if (task.depth > 2) {
        problems.push(`line ${task.line}: subtasks go one level deep at most`);
      }
      if (task.children.length === 0 && !task.fields.what) {
        problems.push(`line ${task.line}: "${task.title}" has no What:`);
      }
    }
    if (problems.length > 0) {
      finish('invalid', `${problems.length} problems`, { problems });
    }
    finish(
      'valid',
      `${leaves.length} tasks, ${progress().done} done`,
      progress(),
    );
    break;
  }
  case 'next': {
    const open = leaves.filter((task) => !task.done);
    if (open.length === 0) {
      finish('all-done', 'Every task is done', progress());
    }
    const task = open.find((t) => !/^blocked/i.test(t.fields.status ?? ''));
    if (!task) {
      finish('all-blocked', 'Every open task is blocked', {
        blocked: open.map((t) => ({
          line: t.line,
          title: t.title,
          status: t.fields.status,
        })),
      });
    }
    finish('next', task.title, { ...view(task), progress: progress() });
    break;
  }
  case 'mark': {
    const task = taskAt();
    const result = rest[0];
    if (!['red', 'green'].includes(result)) {
      finish('bad-input', 'mark takes red or green');
    }
    addField(task, `TDD: ${result}`, new RegExp(`^\\s*TDD: ${result}\\b`));
    save();
    finish('marked', `${task.title}: ${result}`, { line: task.line });
    break;
  }
  case 'skip-tdd': {
    const task = taskAt();
    const reason = rest.join(' ').trim();
    if (!reason) {
      finish('bad-input', 'skip-tdd needs a reason');
    }
    addField(task, `TDD: skipped — ${reason}`, /^\s*TDD: skipped\b/);
    save();
    finish('marked', `${task.title}: TDD skipped`, { line: task.line });
    break;
  }
  case 'block': {
    const task = taskAt();
    const reason = rest.join(' ').trim() || 'no reason given';
    addField(task, `Status: blocked — ${reason}`, /^\s*Status:/);
    save();
    finish('blocked', `${task.title}: blocked`, { line: task.line });
    break;
  }
  case 'done': {
    const task = taskAt();
    if (task.children.length > 0) {
      finish('not-a-task', 'Tick subtasks; the parent follows on its own');
    }
    const has = (word) => task.tdd.some((entry) => entry.startsWith(word));
    if (task.fields.test && !has('skipped') && !(has('red') && has('green'))) {
      finish(
        'no-tdd-evidence',
        'The task has a Test: but tdd-check has not seen it red and green',
        {
          line: task.line,
          tdd: task.tdd,
        },
      );
    }
    lines[task.line - 1] = lines[task.line - 1].replace('- [ ]', '- [x]');
    const statusLine = lines.findIndex(
      (line, i) =>
        i >= task.line && i <= task.lastField && /^\s*Status:/.test(line),
    );
    if (statusLine >= 0) {
      lines.splice(statusLine, 1);
    }
    task.done = true;
    const parent = tasks.find((t) => t.line === task.parent);
    const parentDone = parent && parent.children.every((child) => child.done);
    if (parentDone) {
      lines[parent.line - 1] = lines[parent.line - 1].replace('- [ ]', '- [x]');
    }
    save();
    finish('done', task.title, {
      progress: progress(),
      parentDone: Boolean(parentDone),
    });
    break;
  }
  case 'report': {
    const skipped = leaves
      .filter((task) => task.tdd.some((entry) => entry.startsWith('skipped')))
      .map((task) => ({
        title: task.title,
        reason: task.tdd
          .find((entry) => entry.startsWith('skipped'))
          .replace(/^skipped — /, ''),
      }));
    const blocked = leaves
      .filter(
        (task) => !task.done && /^blocked/i.test(task.fields.status ?? ''),
      )
      .map((task) => ({ title: task.title, status: task.fields.status }));
    finish('report', `${progress().done} of ${progress().total} done`, {
      progress: progress(),
      skippedTdd: skipped,
      blocked,
    });
    break;
  }
  default:
    console.error(`Unknown command: ${command}`);
    process.exit(2);
}
