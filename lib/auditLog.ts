import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

// Single-user app, no auth — "actor" is always "You" today, but the field
// exists so this doesn't need reshaping if a real multi-user system ever
// gets built on top of this.
export interface AuditEntry {
  id: string;
  contactId: string;
  contactName: string;
  date: string; // ISO
  actor: string;
  action: "field_change" | "note_added" | "contact_created";
  summary: string; // human-readable description of what changed
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "auditLog.json");

// Caps file growth — this is a rolling recent-history log, not a permanent
// compliance archive (a real one would need its own retention policy and a
// real database, not a flat JSON file).
const MAX_ENTRIES = 2000;

function ensureDataFile(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) writeFileSync(DATA_FILE, "[]", "utf-8");
}

export function loadAuditLog(): AuditEntry[] {
  ensureDataFile();
  const raw = readFileSync(DATA_FILE, "utf-8");
  try {
    return JSON.parse(raw) as AuditEntry[];
  } catch {
    return [];
  }
}

function saveAuditLog(entries: AuditEntry[]): void {
  ensureDataFile();
  writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2), "utf-8");
}

function makeAuditId(): string {
  return `audit_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function logAuditEntry(entry: Omit<AuditEntry, "id" | "date" | "actor">): void {
  const entries = loadAuditLog();
  entries.push({
    id: makeAuditId(),
    date: new Date().toISOString(),
    actor: "You",
    ...entry,
  });
  saveAuditLog(entries.slice(-MAX_ENTRIES));
}

export function auditLogForContact(contactId: string, limit = 20): AuditEntry[] {
  return loadAuditLog()
    .filter((e) => e.contactId === contactId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}
