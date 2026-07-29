import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { type Contact, type PipelineStage, type NoteType, type FamilyMember } from "./contactTypes";
import { logAuditEntry } from "./auditLog";
import { DATA_DIR, SOURCE_DATA_DIR } from "./dataDir";

export type { PipelineStage, NoteEntry, NoteType, FamilyMember, Contact } from "./contactTypes";
export { PIPELINE_STAGES } from "./contactTypes";

const DATA_FILE = path.join(DATA_DIR, "contacts.json");
const SAMPLE_FILE = path.join(SOURCE_DATA_DIR, "contacts.sample.json");

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
  phone?: string;
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
  sourceLeadTitle?: string;
  sourceLeadLink?: string;
  sourceLeadId?: string;
  bankerId?: string;
}): Contact {
  const contacts = loadContacts();
  const now = new Date().toISOString();
  const contact: Contact = {
    id: makeContactId(),
    name: input.name,
    title: input.title,
    company: input.company,
    email: input.email,
    phone: input.phone,
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
    sourceLeadTitle: input.sourceLeadTitle,
    sourceLeadLink: input.sourceLeadLink,
    sourceLeadId: input.sourceLeadId,
    bankerId: input.bankerId,
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
      | "phone"
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
      | "bankerId"
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

function makeNoteId(): string {
  return `note_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function addNoteEntry(
  id: string,
  text: string,
  options?: { type?: NoteType; fileUrl?: string; commitment?: boolean }
): Contact | null {
  const contacts = loadContacts();
  const idx = contacts.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const type = options?.type ?? "note";
  contacts[idx].noteLog.push({
    id: makeNoteId(),
    date: new Date().toISOString(),
    text,
    type,
    fileUrl: options?.fileUrl,
    commitment: options?.commitment || undefined,
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

export function resolveCommitment(contactId: string, noteId: string, resolved: boolean): Contact | null {
  const contacts = loadContacts();
  const idx = contacts.findIndex((c) => c.id === contactId);
  if (idx === -1) return null;
  const note = contacts[idx].noteLog.find((n) => n.id === noteId);
  if (!note) return null;
  note.commitmentResolved = resolved || undefined;
  saveContacts(contacts);
  return contacts[idx];
}
