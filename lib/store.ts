import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { Category } from "./config";

export interface RelatedArticle {
  title: string;
  link: string;
  source: string;
}

export interface Lead {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string; // ISO string
  snippet: string;
  categories: Category[];
  regionMatch: boolean;
  matchedTerms: string[];
  regionTerms: string[];
  score: number;
  fetchedAt: string;
  saved?: boolean;
  note?: string;
  noteUpdatedAt?: string;
  relatedArticles?: RelatedArticle[];
  // Set once a banker turns this headline into a named Contact (stage
  // "Prospect") — the lead then drops out of the Market Lead lane instead
  // of reappearing as if it were still unactioned.
  promotedToContactId?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "leads.json");

function ensureDataFile(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) writeFileSync(DATA_FILE, "[]", "utf-8");
}

export function loadLeads(): Lead[] {
  ensureDataFile();
  const raw = readFileSync(DATA_FILE, "utf-8");
  try {
    return JSON.parse(raw) as Lead[];
  } catch {
    return [];
  }
}

function saveLeads(leads: Lead[]): void {
  ensureDataFile();
  writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2), "utf-8");
}

// Merge newly fetched leads into the store, de-duplicating by link. A
// re-fetched duplicate keeps its existing saved/note state rather than
// having those user-set fields wiped out by the fresh feed data.
export function upsertLeads(newLeads: Lead[]): { added: number; updated: number; total: number } {
  const existing = loadLeads();
  const byLink = new Map(existing.map((l) => [l.link, l]));
  let added = 0;
  let updated = 0;

  for (const lead of newLeads) {
    const prev = byLink.get(lead.link);
    if (prev) {
      updated += 1;
      byLink.set(lead.link, {
        ...lead,
        saved: prev.saved,
        note: prev.note,
        noteUpdatedAt: prev.noteUpdatedAt,
      });
    } else {
      added += 1;
      byLink.set(lead.link, lead);
    }
  }

  const merged = [...byLink.values()].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  saveLeads(merged);
  return { added, updated, total: merged.length };
}

// Patch a single lead's user-set fields (saved/note) and persist. Touching
// the note stamps noteUpdatedAt, which the "cooling leads" check relies on.
export function updateLead(
  id: string,
  patch: Partial<Pick<Lead, "saved" | "note" | "promotedToContactId">>
): Lead | null {
  const leads = loadLeads();
  const idx = leads.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  leads[idx] = { ...leads[idx], ...patch };
  if (patch.note !== undefined) leads[idx].noteUpdatedAt = new Date().toISOString();
  saveLeads(leads);
  return leads[idx];
}
