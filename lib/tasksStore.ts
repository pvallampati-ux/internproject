import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { Task } from "./taskTypes";

export type { Task } from "./taskTypes";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "tasks.json");
const SAMPLE_FILE = path.join(DATA_DIR, "tasks.sample.json");

// data/tasks.json holds real tasks and is gitignored, same pattern as
// contacts.json — seeded from data/tasks.sample.json on first run.
function ensureDataFile(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) {
    const seed = existsSync(SAMPLE_FILE) ? readFileSync(SAMPLE_FILE, "utf-8") : "[]";
    writeFileSync(DATA_FILE, seed, "utf-8");
  }
}

export function loadTasks(): Task[] {
  ensureDataFile();
  const raw = readFileSync(DATA_FILE, "utf-8");
  try {
    return JSON.parse(raw) as Task[];
  } catch {
    return [];
  }
}

function saveTasks(tasks: Task[]): void {
  ensureDataFile();
  writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2), "utf-8");
}

function makeTaskId(): string {
  return `task_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function createTask(input: { title: string; contactId?: string; dueDate?: string }): Task {
  const tasks = loadTasks();
  const task: Task = {
    id: makeTaskId(),
    title: input.title,
    contactId: input.contactId,
    dueDate: input.dueDate,
    done: false,
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  saveTasks(tasks);
  return task;
}

export function updateTask(
  id: string,
  patch: Partial<Pick<Task, "title" | "contactId" | "dueDate" | "done">>
): Task | null {
  const tasks = loadTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  tasks[idx] = { ...tasks[idx], ...patch };
  saveTasks(tasks);
  return tasks[idx];
}

export function deleteTask(id: string): boolean {
  const tasks = loadTasks();
  const next = tasks.filter((t) => t.id !== id);
  if (next.length === tasks.length) return false;
  saveTasks(next);
  return true;
}
