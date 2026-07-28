import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { type Contact, type PipelineStage } from "./contactTypes";

export type { PipelineStage, NoteEntry, Contact } from "./contactTypes";
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

export function createContact(input: {
  name: string;
  company?: string;
  email?: string;
  tags: string[];
  cadenceDays: number;
  stage?: PipelineStage;
  initialNote?: string;
  estimatedValue?: number;
  referredBy?: string;
  referredByContactId?: string;
}): Contact {
  const contacts = loadContacts();
  const now = new Date().toISOString();
  const contact: Contact = {
    id: makeContactId(),
    name: input.name,
    company: input.company,
    email: input.email,
    tags: input.tags,
    lastContactedAt: now,
    cadenceDays: input.cadenceDays,
    stage: input.stage ?? "Prospect",
    noteLog: input.initialNote ? [{ date: now, text: input.initialNote }] : [],
    estimatedValue: input.estimatedValue,
    referredBy: input.referredBy,
    referredByContactId: input.referredByContactId,
  };
  contacts.push(contact);
  saveContacts(contacts);
  return contact;
}

export function updateContact(
  id: string,
  patch: Partial<
    Pick<
      Contact,
      | "name"
      | "company"
      | "email"
      | "tags"
      | "cadenceDays"
      | "stage"
      | "lastContactedAt"
      | "estimatedValue"
      | "referredBy"
      | "referredByContactId"
      | "nextMeetingDate"
      | "isCOI"
    >
  >
): Contact | null {
  const contacts = loadContacts();
  const idx = contacts.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  contacts[idx] = { ...contacts[idx], ...patch };
  saveContacts(contacts);
  return contacts[idx];
}

export function addNoteEntry(id: string, text: string): Contact | null {
  const contacts = loadContacts();
  const idx = contacts.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  contacts[idx].noteLog.push({ date: new Date().toISOString(), text });
  saveContacts(contacts);
  return contacts[idx];
}
