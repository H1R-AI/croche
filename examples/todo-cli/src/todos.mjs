import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const rejected = reason => ({ status: 'rejected', reason });
const copy = value => structuredClone(value);
function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

/** The app owns task state and validation. One local CLI process per profile. */
export class TodoStore {
  #tasks = [];
  #nextId = 1;
  #file;
  constructor(file = null) {
    this.#file = file;
    if (!file || !existsSync(file)) return;
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    if (!Number.isSafeInteger(saved.nextId) || saved.nextId < 1 || !Array.isArray(saved.tasks) ||
        saved.tasks.some(t => !t || !/^t[1-9]\d*$/.test(t.id) || Number(t.id.slice(1)) >= saved.nextId ||
          typeof t.title !== 'string' || !t.title.trim() || t.title.length > 200 ||
          typeof t.done !== 'boolean' || (t.due !== null && !validDate(t.due))) ||
        new Set(saved.tasks.map(t => t.id)).size !== saved.tasks.length) throw new Error('Invalid local task data.');
    this.#tasks = saved.tasks;
    this.#nextId = saved.nextId;
  }
  list() { return copy(this.#tasks); }
  get(id) { return copy(this.#tasks.find(t => t.id === id)); }
  add(title, due = null) {
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 200) return rejected('A title needs 1–200 characters.');
    if (due !== null && !validDate(due)) return rejected('Ask for a real YYYY-MM-DD date; never guess a deadline.');
    const task = { id: `t${this.#nextId}`, title: title.trim(), due, done: false };
    this.#save([...this.#tasks, task], this.#nextId + 1);
    return { status: 'ok', task: copy(task) };
  }
  complete(id) {
    const task = this.get(id);
    if (!task) return rejected('Task not found. List tasks to get its ID.');
    if (task.done) return rejected('Task is already complete.');
    task.done = true;
    this.#save(this.#tasks.map(t => t.id === id ? task : t));
    return { status: 'ok', task };
  }
  #save(tasks, nextId = this.#nextId) {
    if (this.#file) {
      mkdirSync(dirname(this.#file), { recursive: true, mode: 0o700 });
      writeFileSync(`${this.#file}.tmp`, JSON.stringify({ nextId, tasks }, null, 2), { mode: 0o600 });
      renameSync(`${this.#file}.tmp`, this.#file);
    }
    this.#tasks = tasks;
    this.#nextId = nextId;
  }
}
