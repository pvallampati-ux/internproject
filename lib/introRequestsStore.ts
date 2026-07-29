import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { IntroRequest, IntroStatus } from "./introRequestTypes";
import { DATA_DIR } from "./dataDir";

export type { IntroRequest, IntroStatus } from "./introRequestTypes";
export { INTRO_STATUSES } from "./introRequestTypes";

// Introduction Workflow: tracks the real status of a specific warm-intro
// path (a prospect + a connector who could plausibly make the intro) as
// you actually work it — not a fabricated confidence score, just a status
// you set yourself. Keyed by prospectId+connectorId so re-visiting the
// same path on the Network page finds its existing status instead of
// starting over.

const DATA_FILE = path.join(DATA_DIR, "introRequests.json");

function ensureDataFile(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) writeFileSync(DATA_FILE, "[]", "utf-8");
}

export function loadIntroRequests(): IntroRequest[] {
  ensureDataFile();
  const raw = readFileSync(DATA_FILE, "utf-8");
  try {
    return JSON.parse(raw) as IntroRequest[];
  } catch {
    return [];
  }
}

function saveIntroRequests(entries: IntroRequest[]): void {
  ensureDataFile();
  writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2), "utf-8");
}

function makeId(): string {
  return `intro_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// Suggested is the implicit default for any path with no request on file —
// only Requested/Accepted/Completed actually get persisted, so this store
// only grows when a path is worked, not for every warm-intro match found.
export function setIntroStatus(prospectId: string, connectorId: string, status: IntroStatus): IntroRequest {
  const entries = loadIntroRequests();
  const existing = entries.find((e) => e.prospectId === prospectId && e.connectorId === connectorId);
  const updatedAt = new Date().toISOString();
  if (existing) {
    existing.status = status;
    existing.updatedAt = updatedAt;
    saveIntroRequests(entries);
    return existing;
  }
  const created: IntroRequest = { id: makeId(), prospectId, connectorId, status, updatedAt };
  entries.push(created);
  saveIntroRequests(entries);
  return created;
}
