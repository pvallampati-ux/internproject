import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

export interface Contact {
  id: string;
  name: string;
  company?: string;
  // Keywords matched (case-insensitive substring) against lead title/snippet
  // to decide whether a news item is relevant to this contact.
  tags: string[];
  lastContactedAt: string; // ISO date
  cadenceDays: number; // how often you want to be in touch
  notes?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "contacts.json");

function ensureDataFile(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) writeFileSync(DATA_FILE, "[]", "utf-8");
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

export function updateContact(id: string, patch: Partial<Contact>): Contact | null {
  const contacts = loadContacts();
  const idx = contacts.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  contacts[idx] = { ...contacts[idx], ...patch };
  saveContacts(contacts);
  return contacts[idx];
}
