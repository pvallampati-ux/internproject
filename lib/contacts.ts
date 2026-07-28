import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { type Contact, type PipelineStage, type NoteType, type FamilyMember } from "./contactTypes";
import { logAuditEntry } from "./auditLog";

export type { PipelineStage, NoteEntry, NoteType, FamilyMember, Contact } from "./contactTypes";
export { PIPELINE_STAGES } from "./contactTypes";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "contacts.json");
const SAMPLE_FILE = path.join(DATA_DIR, "contacts.sample.json");

// data/contacts.json holds real contact/meeting-note data and is gitignored.
// data/contacts.sample.json ships in the repo with placeholder data only.
// On first run, contacts.json is seeded from the sample so the app works
// out of the box without ever committing real client details.
function ensureDataFile(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) {
    const seed = existsSync(SAMPLE_FILE) ? readFileSync(SAMPLE_FILE, "utf-8") : "[]";
    writeFileSync(DATA_FILE, seed, "utf-8");
  }
}

export function loadContacts(): Contact[] {
  ensureDataFile();
  const raw = readFileSync(DATA_FILE, "utf-8");
  try {
    return JSON.parse(raw) as Contact[];
  } catch {
    return [];
  }
}

function saveContacts(contacts: Contact[]): void {
  ensureDataFile();
  writeFileSync(DATA_FILE, JSON.stringify(contacts, null, 2), "utf-8");
}

function makeContactId(): string {
  return `contact_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function getContact(id: string): Contact | null {
  return loadContacts().find((c) => c.id === id) ?? null;
}

function formatAuditVal(v: unknown): string {
  if (v === undefined || v === null || v === "") return "(empty)";
  if (Array.isArray(v)) return v.length ? JSON.stringify(v) : "(empty)";
  return String(v);
}

// Human-readable diff of a patch against the pre-patch contact, skipping
// noteLog (notes get their own audit entries) and lastContactedAt (changes
// too often via "Mark contacted" to be worth a log line every time).
function describeFieldChanges(before: Contact, patch: Partial<Contact>): string | null {
  const skip = new Set(["noteLog", "lastContactedAt"]);
  const parts: string[] = [];
  for (const key of Object.keys(patch) as (keyof Contact)[]) {
    if (skip.has(key)) continue;
    const oldVal = before[key];
    const newVal = patch[key];
    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;
    parts.push(`${key}: ${formatAuditVal(oldVal)} → ${formatAuditVal(newVal)}`);
  }
  return parts.length > 0 ? parts.join("; ") : null;
}

export function createContact(input: {
  name: string;
  title?: string;
  company?: string;
  email?: string;
  location?: string;
  industry?: string;
  businessOwnership?: string;
  existingRelationships?: string;
  familyMembers?: FamilyMember[];
  boardMemberships?: string[];
  schools?: string[];
  clubs?: string[];
  tags: string[];
  cadenceDays: number;
  stage?: PipelineStage;
  initialNote?: string;
  estimatedValue?: number;
  currentWalletShare?: number;
  referredBy?: string;
  referredByContactId?: string;
}): Contact {
  const contacts = loadContacts();
  const now = new Date().toISOString();
  const contact: Contact = {
    id: makeContactId(),
    name: input.name,
    title: input.title,
    company: input.company,
    email: input.email,
    location: input.location,
    industry: input.industry,
    businessOwnership: input.businessOwnership,
    existingRelationships: input.existingRelationships,
    familyMembers: input.familyMembers,
    boardMemberships: input.boardMemberships,
    schools: input.schools,
    clubs: input.clubs,
    tags: input.tags,
    lastContactedAt: now,
    cadenceDays: input.cadenceDays,
    stage: input.stage ?? "Prospect",
    noteLog: input.initialNote ? [{ date: now, text: input.initialNote, type: "note" }] : [],
    estimatedValue: input.estimatedValue,
    currentWalletShare: input.currentWalletShare,
    referredBy: input.referredBy,
    referredByContactId: input.referredByContactId,
  };
  contacts.push(contact);
  saveContacts(contacts);
  logAuditEntry({
    contactId: contact.id,
    contactName: contact.name,
    action: "contact_created",
    summary: "Contact created.",
  });
  return contact;
}

export function updateContact(
  id: string,
  patch: Partial<
    Pick<
      Contact,
      | "name"
      | "title"
      | "company"
      | "email"
      | "location"
      | "industry"
      | "businessOwnership"
      | "existingRelationships"
      | "familyMembers"
      | "boardMemberships"
      | "schools"
      | "clubs"
      | "tags"
      | "cadenceDays"
      | "stage"
      | "lastContactedAt"
      | "estimatedValue"
      | "currentWalletShare"
      | "referredBy"
      | "referredByContactId"
      | "nextMeetingDate"
      | "isCOI"
      | "outreachStatus"
    >
  >
): Contact | null {
  const contacts = loadContacts();
  const idx = contacts.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const before = contacts[idx];
  const changeSummary = describeFieldChanges(before, patch);
  contacts[idx] = { ...before, ...patch };
  saveContacts(contacts);
  if (changeSummary) {
    logAuditEntry({
      contactId: id,
      contactName: contacts[idx].name,
      action: "field_change",
      summary: changeSummary,
    });
  }
  return contacts[idx];
}

export function addNoteEntry(
  id: string,
  text: string,
  options?: { type?: NoteType; fileUrl?: string }
): Contact | null {
  const contacts = loadContacts();
  const idx = contacts.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const type = options?.type ?? "note";
  contacts[idx].noteLog.push({
    date: new Date().toISOString(),
    text,
    type,
    fileUrl: options?.fileUrl,
  });
  saveContacts(contacts);
  logAuditEntry({
    contactId: id,
    contactName: contacts[idx].name,
    action: "note_added",
    summary: `Added a ${type}: ${text.slice(0, 80)}${text.length > 80 ? "…" : ""}`,
  });
  return contacts[idx];
}
